"use strict";
// Local-only UI fixture. No production credentials, requests or data writes.
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../public");
const date=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo"}).format(new Date());
const plus=(value,n)=>{const d=new Date(value+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const staff=["آدم","عمر","يوسف"].map((name,i)=>({staffId:"S"+i,staffName:name,name,branchId:"B1",active:true,code:"0"+i}));
const services=[{serviceId:"SV1",name:"قص شعر",durationMinutes:30,price:100},{serviceId:"SV2",name:"تهذيب الذقن",durationMinutes:30,price:60},{serviceId:"SV3",name:"عناية بالبشرة",durationMinutes:45,price:180}];
const permissions={view:true,manage:true,owner:true,correct:true,selfAction:true,approveOvertime:true,approveAdjustment:true};
const bookings=[{id:"B1",customerName:"عميل تجريبي",customerPhone:"01000000000",employeeId:"S0",employee:"آدم",date:date(),time:"10:00",service:"قص شعر",serviceIds:["SV1"],durationMinutes:30,serviceDurationSnapshot:30,status:"confirmed",source:"public",trackingToken:"CH-FIXTURE"},{id:"B2",customerName:"حجز الاستقبال التجريبي",employeeId:"S1",employee:"عمر",date:date(),time:"11:00",service:"تهذيب الذقن",durationMinutes:30,status:"arrived",source:"staff"}];
let confirmation=true;
const days=staff.map((s,i)=>({...s,attendanceDayId:"AD"+i,attendanceDate:date(),state:["CHECKED_IN","ON_BREAK","NOT_STARTED"][i],status:["CHECKED_IN","ON_BREAK","NOT_STARTED"][i],actualCheckIn:i<2?date()+"T09:00:00+03:00":"",openSession:i<2,openBreak:i===1,scheduledStart:"09:00",scheduledEnd:"18:00",requiredWorkMinutesRaw:480,workedMinutesRaw:100,allowedBreakMinutes:60,eligibleOvertimeMinutes:0,calculationWarnings:[]}));
function response(p){
  const result={status:"success"};
  const branch={branchId:"B1",branchName:"الفرع التجريبي",active:true,publicSelectable:true};
  if(p.action==="getAttendanceDashboard")return {...result,date:p.date,attendanceDays:days.map(d=>({...d,attendanceDate:p.date})),permissions,serverNow:new Date().toISOString()};
  if(p.action==="attendanceCheckIn"||p.action==="attendanceEndBreak"){Object.assign(days.find(d=>d.staffId===p.staffId),{state:"CHECKED_IN",status:"CHECKED_IN",openSession:true,openBreak:false,actualCheckIn:new Date().toISOString()});return result;}
  if(p.action==="attendanceStartBreak"){Object.assign(days.find(d=>d.staffId===p.staffId),{state:"ON_BREAK",status:"ON_BREAK",openBreak:true});return result;}
  if(p.action==="getSchedulePageData")return {...result,staff,permissions};
  if(p.action==="listWorkPolicies")return {...result,workPolicies:p.staffId!=="S0"?[]:[
    {policyId:"FIXTURE-CURRENT",staffId:"S0",active:true,effectiveFrom:plus(date(),-7),effectiveTo:plus(date(),7),requiredDailyMinutes:480,allowedBreakMinutes:60,defaultShiftStart:"09:00",defaultShiftEnd:"18:00",graceLateMinutes:5,deficitRateMinorPerMinute:150,overtimeRateMinorPerMinute:200,salaryBasis:"MONTHLY",currency:"EGP"},
    {policyId:"FIXTURE-PAST",staffId:"S0",active:true,effectiveFrom:plus(date(),-30),effectiveTo:plus(date(),-8),requiredDailyMinutes:420,allowedBreakMinutes:30,salaryBasis:"DAILY",currency:"EGP"},
    {policyId:"FIXTURE-FUTURE",staffId:"S0",active:true,effectiveFrom:plus(date(),8),requiredDailyMinutes:450,allowedBreakMinutes:45,salaryBasis:"MONTHLY",currency:"EGP"}
  ]};
  if(p.action==="getScheduleWeekBoard")return {...result,staff,permissions,resolvedSchedules:staff.flatMap(s=>Array.from({length:7},(_,i)=>({staffId:s.staffId,date:plus(p.dateFrom,i),classification:i===5?"WEEKLY_DAY_OFF":"SCHEDULED",shiftSegments:i===5?[]:[{shiftStart:"09:00",shiftEnd:"18:00"}]})))};
  if(p.action==="getScheduleSelection")return {...result,weekly:{...result,schedules:[]},overrides:{...result,overrides:[]},resolved:{...result,resolvedSchedules:[]},audit:{...result,audit:[]}};
  if(p.action==="getPublicBookingOptions"||p.action==="getInternalBookingOptions")return {...result,catalogOnly:p.catalogOnly,branches:[branch],services,attendanceLinked:true,autoConfirm:confirmation,barbers:staff.map(s=>({staffId:s.staffId,name:s.staffName,code:s.code,slots:s.staffId==="S1"?[]:["10:00","10:30","12:00","15:00"],availability:s.staffId==="S1"?"unavailable":"available",reasonCode:s.staffId==="S1"?"ON_BREAK":"AVAILABLE"})),liveRefreshEnabled:false};
  if(p.action==="listPublicBookingBranches")return {...result,branches:[branch]};
  if(p.action==="getBookings")return {...result,bookings};
  if(p.action==="createPublicBookingRequest"||p.action==="createBooking"){const booking={...p,id:"B"+bookings.length,service:"قص شعر",employee:staff.find(s=>s.staffId===p.employeeId)?.staffName,durationMinutes:30,status:p.action==="createBooking"||confirmation?"confirmed":"pending",source:p.action==="createBooking"?"staff":"public"};bookings.push(booking);return {...result,booking,trackingToken:"CH-FIXTURE"};}
  if(p.action==="updateBooking"){Object.assign(bookings.find(b=>b.id===p.id),{status:p.status});return {...result,booking:bookings.find(b=>b.id===p.id)};}
  if(p.action==="getBookingConfirmationMode")return {...result,autoConfirm:confirmation};
  if(p.action==="setBookingConfirmationMode"){confirmation=p.autoConfirm;return {...result,autoConfirm:confirmation};}
  if(p.action==="getBookingAvailabilityFlags")return {...result,flags:{engine:"PHASE5",attendanceLiveEnabled:true,plannedEnabled:true}};
  if(p.action==="listBookingBranches")return {...result,branches:[branch],branchHours:[]};
  return {...result,scopes:[],policies:[],events:[],audit:[],conflicts:[],operationalOverrides:[],ratings:[]};
}
http.createServer((req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1"),name=decodeURIComponent(url.pathname);
  if(name==="/fixture-api"){let body="";req.on("data",c=>body+=c);req.on("end",()=>{try{const p=JSON.parse(body);res.setHeader("Content-Type","application/json");res.end(JSON.stringify(response(p)));}catch(_){res.writeHead(400);res.end();}});return;}
  if(name.endsWith("/core/auth.js")){res.setHeader("Content-Type","text/javascript");res.end('window.RomeoAuth={getCurrentUser:()=>({username:"fixture-owner",role:"owner"}),requireAuth:()=>({username:"fixture-owner",role:"owner"}),isOwnerUser:()=>true,hasPermission:()=>true,logout:()=>{}};');return;}
  if(name.endsWith("/core/runtime-config.js")){res.setHeader("Content-Type","text/javascript");res.end('window.ROMEO_API_URL="/fixture-api";');return;}
  if(name.endsWith("/core/api.js")){res.setHeader("Content-Type","text/javascript");res.end('window.RomeoApi={request:p=>fetch("/fixture-api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)}).then(r=>r.json())};');return;}
  const file=path.resolve(root,"."+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader("Content-Type",({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"})[path.extname(file)]||"application/octet-stream");res.end(fs.readFileSync(file));
}).listen(4188,"127.0.0.1",()=>console.log("Isolated booking workflow fixture: http://127.0.0.1:4188/pages/bookings.html"));
