"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const page=fs.readFileSync(process.env.CUT_HUB_CASHIER_SOURCE_OVERRIDE||path.join(root,"public/assets/js/pages/cashier.js"),"utf8");
test("initial pageshow does not reload boot data; restored pages still refresh",()=>{
 const body=page.match(/window\.addEventListener\("pageshow", event => \{([\s\S]*?)\n    \}\);/)[1];
 const calls=[];const c=vm.createContext({renderBarberOptions(){},loadBarbersFromSheet:()=>calls.push("staff"),loadInventoryProducts:()=>calls.push("stock"),fetchTodaySales:()=>calls.push("totals"),updateOnlineControls(){}});
 vm.runInContext('function handler(event){'+body+'}',c);c.handler({persisted:false});assert.deepEqual(calls,[]);c.handler({persisted:true});assert.deepEqual(calls,["staff","stock","totals"]);
});
function totalsFixture(request){
 let date="2026-10-13";const writes=[],requests=[],busy=[];
 const c=vm.createContext({RomeoApi:{request:payload=>{requests.push(payload);return request(payload);}},getReportDateKey:()=>date,setDailyNetLoading:value=>busy.push(value),numberValue:value=>Number(value)||0,
   latestTodaySales:0,latestTodayTips:0,latestTodayExpenses:0,latestTodayWithdrawals:0,
   updatePaymentMethodTotals:values=>writes.push(values),localizeText:value=>value,dailyNetAmount:{textContent:""},dailyNetBreakdown:{textContent:""},console:{warn(){}}});
 vm.runInContext('let cashierTotalsSequence=0;'+page.match(/    async function fetchTodaySales\(\) \{[\s\S]*?\n    \}/)[0],c);
 return {c,writes,requests,busy,setDate:value=>{date=value;}};
}
test("all day totals come from one response with tips and outgoings unchanged",async()=>{
 const h=totalsFixture(async()=>({status:"success",preview:{salesTotal:100,tipTotal:20,cashTotal:70,visaTotal:50,instapayTotal:0,vodafoneCashTotal:0,expensesTotal:10,withdrawalsTotal:15}}));
 await h.c.fetchTodaySales();assert.equal(h.requests.length,1);assert.equal(h.requests[0].action,"getDailyClosingPreview");
 assert.equal(h.c.latestTodaySales+h.c.latestTodayTips-h.c.latestTodayExpenses-h.c.latestTodayWithdrawals,95);
 assert.equal(h.writes[0].tips,20);assert.equal(h.writes[0].cash+h.writes[0].visa,120);assert.deepEqual(h.busy,[true,false]);
});
test("a stale date response cannot overwrite the latest totals",async()=>{
 let first;const h=totalsFixture(payload=>payload.date==="2026-10-13"?new Promise(resolve=>{first=resolve;}):Promise.resolve({status:"success",preview:{salesTotal:200}}));
 const old=h.c.fetchTodaySales();h.setDate("2026-10-14");await h.c.fetchTodaySales();first({status:"success",preview:{salesTotal:999}});await old;
 assert.equal(h.c.latestTodaySales,200);assert.equal(h.writes.length,1);
});
test("failed day refresh does not turn existing money into false zero",async()=>{
 const h=totalsFixture(async()=>{throw Error("temporary");});h.c.latestTodaySales=200;await h.c.fetchTodaySales();assert.equal(h.c.latestTodaySales,200);assert.equal(h.writes.length,0);assert.match(h.c.dailyNetAmount.textContent,/تعذر/);assert.equal(h.busy.at(-1),false);
});
function staffFixture(denied=false){
 let payrollReads=0;const headers=["NAME","CODE","SALARY","PERCENTAGE","ID","BONUS","DEDUCTION","ACTIVE","CREATED_AT","UPDATED_AT","IS BARBER"];
 const rows=[headers,["A","C01",5000,20,"S1",100,50,true,"","",true],["Inactive","C02",0,0,"S2",0,0,false,"","",true],["Duplicate","C03",0,0,"S1",0,0,true,"","",false]];
 const sheet={getLastRow:()=>rows.length,getLastColumn:()=>headers.length,getRange:(r,col,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(col-1,col-1+w))})};
 const c=vm.createContext({getStaffSheet:()=>sheet,requirePermission:()=>denied?{status:"error",code:"PERMISSION_DENIED"}:null,jsonOutput:value=>value,
   parseSheetBoolean:(value,fallback)=>value===""?fallback:Boolean(value),getApprovedAttendanceTotalsForCurrentMonth:()=>{payrollReads++;throw Error("payroll should not run");},attendancePhase3ReadDays:()=>{payrollReads++;throw Error("attendance should not run");}});
 vm.runInContext(fs.readFileSync(path.join(root,"apps-script/production/030_staff_branch-repository.gs"),"utf8"),c);
 return {c,reads:()=>payrollReads};
}
test("cashier staff projection skips attendance and payroll, filters inactive records and exposes no money",()=>{
 const h=staffFixture(),result=h.c.getStaff({staffView:"cashier"});assert.equal(result.status,"success");assert.equal(h.reads(),0);assert.equal(result.staff.length,2);assert.equal(result.staff[0].staffId,"");assert.equal(result.staff[1].isBarber,false);
 assert.doesNotMatch(JSON.stringify(result),/salary|deduction|attendance|bonus|percentage|5000/);
});
test("cashier projection requires cashier permission",()=>{const h=staffFixture(true);assert.equal(h.c.getStaff({staffView:"cashier"}).code,"PERMISSION_DENIED");assert.equal(h.reads(),0);});
test("full employee accounts retain their existing payroll path",()=>{const h=staffFixture();h.c.getStaff({});assert.equal(h.reads(),1);});
test("relay timing contains only three numeric provider durations and preserves body",async()=>{
 const {createHandler}=require("../api/apps-script");let count=0;const result={headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};
 await createHandler(async()=>++count===1?{status:302,headers:{get:()=>"https://script.googleusercontent.com/macros/echo?private=HIDDEN"}}:{status:200,ok:true,headers:{get:()=>"application/json"},text:async()=>'{"status":"success"}'})({method:"POST",body:{action:"getStaff",sessionToken:"PRIVATE"},headers:{}},result);
 assert.match(result.headers["Server-Timing"],/^google_execution;dur=\d+\.\d, google_content;dur=\d+\.\d, relay;dur=\d+\.\d$/);assert.doesNotMatch(result.headers["Server-Timing"],/PRIVATE|HIDDEN/);assert.equal(result.body,'{"status":"success"}');
});
function invoiceFixture(failPdf=false){
 const rows=[Array.from({length:14},(_,i)=>i===13?"INVOICE REQUEST ID":"H"+i)];let pdfs=0,stock=0;
 const sheet={getLastRow:()=>rows.length,getLastColumn:()=>14,appendRow:row=>rows.push(Array.from(row)),deleteRow:r=>rows.splice(r-1,1),getRange:(r,col,n=1,w=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(col-1,col-1+w)),getValue:()=>rows[r-1]?.[col-1]})};
 const c=vm.createContext({console:{warn(){},error(){}},requirePermission:()=>null,inventoryText:value=>String(value||""),parseSheetAmount:value=>Number(value)||0,jsonOutput:value=>value,
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},SpreadsheetApp:{getActive:()=>({getSheetByName:()=>sheet})},
  getInvoiceDateTime:()=>"2026-10-13 12:00:00",getLockedDateError:()=>"",prepareInventoryCheckout:()=>({}),
  createInvoicePdf:()=>{pdfs++;if(failPdf)throw Error("PDF failed");return "https://drive.google.com/file/d/fixture/view";},applyInventoryCheckout:()=>{stock++;return null;},logActivity(){},Utilities:{getUuid:()=>"FIXTURE"}});
 for(const file of ["042_invoices_schema.gs","043_invoices_mutations.gs"])vm.runInContext(fs.readFileSync(path.join(root,"apps-script/production",file),"utf8"),c);
 c.getInvoiceRequestIdColumn=()=>14;c.ensureDataInvoiceColumns=()=>({invoiceRequestIdColumn:14});
 return {c,rows,pdfs:()=>pdfs,stock:()=>stock};
}
test("production invoice save is exactly once for a repeated request and preserves paid/tip amounts",()=>{
 const h=invoiceFixture(),payload={total:117,paidAmount:120,tipAmount:3,idempotencyKey:"FIXTURE-1"};
 const first=h.c.createInvoice(payload),second=h.c.createInvoice(payload);
 assert.equal(first.status,"success");assert.equal(second.invoiceId,first.invoiceId);assert.equal(second.duplicate,true);assert.equal(h.rows.length,2);assert.equal(h.pdfs(),0);assert.equal(h.stock(),1);assert.equal(h.rows[1][5],117);assert.equal(h.rows[1][6],120);assert.equal(h.rows[1][7],3);
});
test("production checkout saves without calling Drive even when PDF conversion is unavailable",()=>{
 const h=invoiceFixture(true),result=h.c.createInvoice({total:117,idempotencyKey:"FIXTURE-2"});
 assert.equal(result.status,"success");assert.equal(result.pdfPending,true);assert.equal(h.rows.length,2);assert.equal(h.stock(),1);assert.equal(h.pdfs(),0);
});
