"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { buildProductionPackage } = require("../scripts/build-production-apps-script");
const source = buildProductionPackage().files.filter(f => f.type === "SERVER_JS").map(f => f.source).join("\n");
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const properties = new Map(), rows = [], events = [];
  const c = vm.createContext({ console, Date, PropertiesService: { getScriptProperties: () => ({
    getProperty: key => properties.has(key) ? properties.get(key) : null,
    setProperty: (key, value) => properties.set(key, value), deleteProperty: key => properties.delete(key)
  }) } });
  vm.runInContext(source, c);
  const headers = vm.runInContext("BOOKING_HEADERS_V2", c);
  Object.assign(c, {
    jsonOutput: value => value, requirePermission: () => null, actorCanManageUsers: () => true,
    getActor: () => ({ displayName: "Fixture owner" }),
    getCairoDateTime: () => "2099-01-02 10:00:00",
    Utilities: { getUuid: () => "fixture-unique", formatDate: (_date, _zone, pattern) => pattern === "yyyy-MM-dd" ? "2099-01-02" : pattern === "HH:mm" ? "10:00" : "Saturday" },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => events.push("unlock") }) },
    SpreadsheetApp: { flush: () => {} }, logActivity: () => events.push("audit"),
    withBookingMutationLock: (_input, callback) => { events.push("lock"); try { return callback({}); } finally { events.push("unlock"); } },
    commitBookingPhase5UnderCurrentLock: options => options.business(),
    committedBookingMutationRetry: () => null,
    getBookingsSheetV2: () => ({}), getBookingHeadersV2: () => headers,
    getAllBookingsV2ForWrite: () => rows,
    publicBookingServices: () => [{ serviceId: "SVC", name: "Fixture service", durationMinutes: 30, price: 80 }],
    publicBookingBarbers: () => [{ staffId: "STAFF", name: "Fixture barber", branchId: "B1" }],
    validateBookingAppointmentV2: input => ({ ok: true, barber: {staffId:"STAFF",name:"Fixture barber",branchId:"B1"}, date:input.date,time:input.time,branchId:"B1" }),
    generateUniqueBookingIdV2: () => "BOOK-FIXTURE", generatePublicBookingTrackingToken: () => "CH-123456",
    bookingRequestFingerprint: data => JSON.stringify(data),
    appendBookingRowV2: (_sheet, booking) => { rows.push(plain(booking)); return {rowNumber:rows.length+1,row:c.bookingToRowV2(booking,headers)}; },
    writeBookingRowV2: (_sheet, _row, booking) => { rows[0] = plain(booking); },
    findBookingRowV2: () => rows.length ? {booking:plain(rows[0]),rowNumber:2,row:[]} : null
  });
  return {c, properties, rows, events};
}
const payload = overrides => ({ clientRequestId:"fixture-request-001",serviceIds:["SVC"],employeeId:"STAFF",branchId:"B1",date:"2099-01-03",time:"12:00",customerName:"Fixture customer",customerPhone:"01012345678", ...overrides });

test("public confirmation mode defaults to automatic and supports explicit manual mode", () => {
  const h=fixture(); assert.equal(h.c.bookingPublicAutoConfirm(),true);
  h.properties.set("BOOKING_PUBLIC_AUTO_CONFIRM_ENABLED","false");assert.equal(h.c.bookingPublicAutoConfirm(),false);
  assert.equal(h.c.setBookingConfirmationMode({autoConfirm:true}).status,"success");
  assert.equal(h.c.bookingPublicAutoConfirm(),true);assert.ok(h.events.includes("audit"));
});
test("confirmation settings reject non-owner, malformed values and compensate audit failure", () => {
  const h=fixture();h.c.actorCanManageUsers=()=>false;
  assert.equal(h.c.setBookingConfirmationMode({autoConfirm:false}).code,"OWNER_REQUIRED");assert.equal(h.properties.size,0);
  h.c.actorCanManageUsers=()=>true;assert.equal(h.c.setBookingConfirmationMode({autoConfirm:"false"}).code,"INVALID_SETTING");
  h.c.logActivity=()=>{throw Error("audit failure");};assert.throws(()=>h.c.setBookingConfirmationMode({autoConfirm:false}),/audit failure/);
  assert.equal(h.properties.size,0);assert.equal(h.events.at(-1),"unlock");
});
test("public create confirms only after authoritative validation and retry keeps the original booking", () => {
  const h=fixture();const result=h.c.createPublicBookingRequest(payload());
  assert.equal(result.status,"success",JSON.stringify(result));assert.equal(result.booking.status,"confirmed");
  assert.equal(h.rows[0].holdExpiresAt,"");assert.equal(h.rows[0].confirmedBy,"automatic");
  h.properties.set("BOOKING_PUBLIC_AUTO_CONFIRM_ENABLED","false");
  const retry=h.c.createPublicBookingRequest(payload());assert.equal(retry.booking.status,"confirmed");assert.equal(h.rows.length,1);
});
test("manual confirmation preserves the expiring public request hold", () => {
  const h=fixture();h.properties.set("BOOKING_PUBLIC_AUTO_CONFIRM_ENABLED","false");
  const result=h.c.createPublicBookingRequest(payload());assert.equal(result.status,"success",JSON.stringify(result));
  assert.equal(result.booking.status,"pending");assert.ok(Date.parse(h.rows[0].holdExpiresAt)>Date.now());assert.equal(h.rows[0].confirmedAt,"");
});
test("internal reception create is confirmed by the actor and cannot bypass availability", () => {
  const h=fixture();const result=h.c.createBookingV2(payload({status:"done",source:"public"}));
  assert.equal(result.status,"success",JSON.stringify(result));assert.equal(result.booking.status,"confirmed");assert.equal(result.booking.source,"staff");assert.equal(result.booking.confirmedBy,"Fixture owner");
  const denied=fixture();denied.c.validateBookingAppointmentV2=()=>({ok:false,code:"SLOT_UNAVAILABLE",message:"Occupied"});
  assert.equal(denied.c.createBookingV2(payload()).code,"SLOT_UNAVAILABLE");assert.equal(denied.rows.length,0);
});
test("arrival continues blocking, completion releases, and no-show is terminal", () => {
  const h=fixture();h.rows.push({id:"B1",status:"confirmed",date:"2099-01-02",time:"09:00",employeeId:"STAFF",durationMinutes:30,customerName:"Fixture",source:"staff"});
  const arrived=h.c.updateBookingV2({id:"B1",status:"arrived"});assert.equal(arrived.status,"success",JSON.stringify(arrived));
  assert.equal(h.c.bookingBlocksSlot(h.rows[0]),true);
  assert.equal(h.c.BookingAvailabilityPhase5.bookingBlocks(h.rows[0],Date.now()),true);
  assert.equal(h.c.updateBookingV2({id:"B1",status:"done"}).status,"success");assert.equal(h.c.bookingBlocksSlot(h.rows[0]),false);
  assert.equal(h.c.bookingStatusIsTerminal("no_show"),true);assert.equal(h.c.isBookingStatusTransitionAllowed("no_show","confirmed"),false);
});
test("future arrivals and premature no-show are rejected without writes", () => {
  const h=fixture();h.rows.push({id:"B1",status:"confirmed",date:"2099-01-03",time:"12:00"});
  assert.equal(h.c.updateBookingV2({id:"B1",status:"arrived"}).code,"ARRIVAL_DATE_INVALID");
  assert.equal(h.c.updateBookingV2({id:"B1",status:"no_show"}).code,"NO_SHOW_TOO_EARLY");assert.equal(h.rows[0].status,"confirmed");
  h.rows[0].date="2099-01-02";h.rows[0].time="09:00";
  assert.equal(h.c.updateBookingV2({id:"B1",status:"no_show"}).status,"success");assert.equal(h.c.bookingBlocksSlot(h.rows[0]),false);
});
test("calendar reads exclude out-of-range bookings and include a proposed appointment on its new date", () => {
  const h=fixture();h.c.getAllBookingsV2=()=>[
    {id:"old",date:"2098-12-01",time:"10:00",status:"confirmed"},
    {id:"today",date:"2099-01-02",time:"10:00",status:"confirmed"},
    {id:"proposal",date:"2098-12-01",proposedDate:"2099-01-03",proposedTime:"12:00",status:"proposed"},
    {id:"later",date:"2099-02-01",status:"confirmed"}
  ];
  const result=h.c.getBookingsV2({filters:{fromDate:"2099-01-01",toDate:"2099-01-07"}});
  assert.equal(result.status,"success",JSON.stringify(result));assert.deepEqual(plain(result.bookings.map(b=>b.id)).sort(),["proposal","today"]);
  assert.equal(h.c.getBookingsV2({filters:{fromDate:"2099-01-01",toDate:"2099-03-01"}}).code,"INVALID_DATE_RANGE");
});
test("calendar occupancy includes preparation, cleanup, proposals and overnight carry-over", () => {
  const page=fs.readFileSync("public/assets/js/pages/bookings.js","utf8"),c=vm.createContext({Date,Number});
  vm.runInContext(page.match(/function calendarInterval\(booking, date\) \{[\s\S]*?\n  \}/)[0],c);
  assert.deepEqual(plain(c.calendarInterval({date:"2099-01-01",time:"23:30",durationMinutes:90,preparationMinutesSnapshot:15,cleanupMinutesSnapshot:15},"2099-01-02")),{start:-45,end:75});
  assert.deepEqual(plain(c.calendarInterval({date:"2099-01-01",time:"10:00",status:"proposed",proposedDate:"2099-01-02",proposedTime:"12:00",durationMinutes:30},"2099-01-02")),{start:720,end:750});
});
test("week board retains original authentication for child reads and the real service enforces branch scope", () => {
  const h=fixture(), input={action:"getScheduleWeekBoard",dateFrom:"2099-01-01",dateTo:"2099-01-07",branchId:"B1",actorEvidence:"fixture-authorized"};
  let authenticated=0;
  const repository=h.c.StaffSchedulingPhase2.createMemoryRepository({staff:[
    {staffId:"S1",staffName:"Fixture one",branchId:"B1",active:true},
    {staffId:"S2",staffName:"Outside scope",branchId:"B2",active:true}
  ]});
  h.c.schedulePhase2AssertEnvironmentIdentity=()=>{};
  h.c.schedulePhase2CreateRepository=()=>repository;
  h.c.schedulePhase2Actor=data=>{
    assert.equal(data,input,"Child input must never replace the transport-authenticated request");
    authenticated++;
    return {actorId:"fixture-manager",role:"MANAGER",branchIds:["B1"],permissions:["schedule.view"]};
  };
  const result=h.c.handleStaffSchedulingPhase2Action(input);
  assert.equal(result.status,"success",JSON.stringify(result));assert.equal(result.staff.length,1);
  assert.equal(result.staff[0].staffId,"S1");assert.equal(result.resolvedSchedules.length,7);assert.equal(authenticated,1);
  const next={...input,dateTo:"2099-01-08"};h.c.schedulePhase2Actor=()=>({actorId:"owner",owner:true});
  assert.equal(h.c.handleStaffSchedulingPhase2Action(next).code,"SCHEDULE_WEEK_RANGE_INVALID");
});
