"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function ui(request){
 const html=read(process.env.CUT_HUB_STAFF_SOURCE_OVERRIDE||'public/pages/staff-accounting.html');
 const elements={fromDate:{value:'2026-10-01'},toDate:{value:'2026-10-31'},rangeStatus:{},applyRange:{}};
 const c=vm.createContext({elements,RomeoApi:{request},URLSearchParams,window:{location:{search:''}},console:{info(){}},normalizeStaffRecord:(x,i)=>({...x,uiKey:x.staffId?'persisted:'+x.staffId:'missing:'+i}),normalizeWithdrawalRecord:x=>x});
 vm.runInContext('let staffMutationPending=false,creatingStaff=false,staffList=[{staffId:"old",uiKey:"persisted:old",totalSales:99}],withdrawalsList=[{amount:3}],canonicalStaffRows=[],selectedId="persisted:old";const saveBtn={},deleteBtn={},addStaffBtn={},resetBtn={};function selectedDateRange(){return elements.fromDate.value<=elements.toDate.value?{ok:true,fromDate:elements.fromDate.value,toDate:elements.toDate.value}:{ok:false};}function localizeText(ar){return ar;}function cacheStaffList(){}function renderAll(){}function fillDetails(){}'+html.slice(html.indexOf('    let staffAccountingRead = null;'),html.indexOf('    function renderEmployeeList()'))+'function inspect(){return {staffList,withdrawalsList,selectedId};}',c);return c;
}
const response=(fromDate='2026-10-01',toDate='2026-10-31')=>({status:'success',fromDate,toDate,staff:[{staffId:'old',name:'Fixture',customers:2,totalSales:120,attendanceDeduction:10,attendanceOvertime:15}],withdrawals:[{amount:7}]});
test('one period request supplies all figures atomically and coalesces duplicate clicks',async()=>{
 let finish,calls=0;const c=ui(()=>{calls++;return new Promise(r=>finish=r);});const first=c.loadSelectedPeriod();assert.equal(c.loadSelectedPeriod(),first);assert.equal(c.inspect().staffList[0].totalSales,99);assert.equal(c.inspect().withdrawalsList[0].amount,3);finish(response());assert.equal(await first,true);assert.equal(calls,1);assert.equal(c.inspect().staffList[0].attendanceDeduction,10);assert.equal(c.inspect().withdrawalsList[0].amount,7);assert.equal(c.inspect().selectedId,'persisted:old');
});
test('only newest pending period is requested and stale responses never publish',async()=>{
 const calls=[],finishes=[];const c=ui(p=>{calls.push(p);return new Promise(r=>finishes.push(r));});const first=c.loadSelectedPeriod();c.elements.fromDate.value='2026-10-02';const replaced=c.loadSelectedPeriod();c.elements.fromDate.value='2026-10-03';const latest=c.loadSelectedPeriod();assert.equal(await replaced,false);finishes[0](response());await first;assert.equal(c.inspect().staffList[0].totalSales,99);assert.equal(calls.length,2);assert.equal(calls[1].fromDate,'2026-10-03');finishes[1](response('2026-10-03'));assert.equal(await latest,true);
});
test('errors or mismatched periods retain the complete last successful financial state',async()=>{
 for(const result of [{status:'error',message:'private'}, {...response(),toDate:'2026-09-30'}]){
  const c=ui(async()=>result);assert.equal(await c.loadSelectedPeriod(),false);assert.equal(c.inspect().staffList[0].totalSales,99);assert.equal(c.inspect().withdrawalsList[0].amount,3);assert.doesNotMatch(c.elements.rangeStatus.textContent,/private/);
 }
});
test('editing the dates during a read prevents stale publication; mutations and new-staff drafts block reads',async()=>{
 let finish,calls=0;const c=ui(()=>{calls++;return new Promise(r=>finish=r);});const p=c.loadSelectedPeriod();c.elements.toDate.value='2026-10-20';finish(response());assert.equal(await p,false);assert.equal(c.inspect().staffList[0].totalSales,99);
 vm.runInContext('staffMutationPending=true;',c);await c.loadSelectedPeriod();vm.runInContext('staffMutationPending=false;creatingStaff=true;',c);await c.loadSelectedPeriod();assert.equal(calls,1);
});
function backend(){
 let rawReads=0,displayReads=0,formats=0;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'});
 const key=d=>{formats++;const p=Object.fromEntries(fmt.formatToParts(d).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
 const row=(date,id,code,name,amount=100)=>[date,'Fixture','0001','Service','',amount,amount,0,'cash',name,'','','','',id,code,name];
 const rows=[row(new Date('2026-09-30T21:00:00Z'),'S1','C1','Alice'),row(new Date('2026-10-31T22:00:00Z'),'S1','C1','Alice'),row('15/10/2026','','C2','Wrong'),row('2026-10-15','','','KAREM'),row('2026-09-30','','','KAREEM'),row('2026-10-15','unknown','C2','Bob'),row('2026-10-15','','','Dup'),row('2026-10-15',12,'','Numeric',0)];
 for(let i=0;i<800;i++)rows.push(row(new Date('2026-10-15T09:00:00Z'),'S1','C1','Alice','1,50'));
 const displayed=rows.map(r=>r.map(v=>v instanceof Date?key(v):String(v)));displayed[7][14]='0012';formats=0;
 const sheet={getLastRow:()=>rows.length+1,getLastColumn:()=>17,getMaxColumns:()=>17,getRange:(r)=>({getValues:()=>{if(r===1)return [Array(17).fill('Header')];rawReads++;return rows;},getDisplayValues:()=>{displayReads++;return displayed;}})};
 const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',BARBER_ID_HEADER_ALIASES:'id',BARBER_CODE_HEADER_ALIASES:'code',BARBER_NAME_HEADER_ALIASES:'name',findEquivalentHeaderColumn:(_,alias)=>({id:15,code:16,name:17})[alias],findSheetHeaderColumn:(_,alias)=>({id:15,code:16,name:17})[alias],SpreadsheetApp:{getActive:()=>({getSheetByName:()=>sheet})},jsonOutput:x=>x,Utilities:{formatDate:key,parseDate:s=>new Date(s+'T00:00:00'+(s>='2026-10-30'?'+02:00':'+03:00'))}});
 vm.runInContext(read('apps-script/production/061_shared_date-and-number.gs')+read('apps-script/production/044_invoices_queries.gs')+read('apps-script/production/049_reports_sales-customers.gs'),c);
 const staff=[{staffId:'S1',code:'C1',name:'Alice'},{staffId:'S2',code:'C2',name:'Bob'},{staffId:'S3',code:'C3',name:'KAREEM'},{staffId:'S4',code:'C4',name:'Dup'},{staffId:'S5',code:'C5',name:'Dup'},{staffId:'12',code:'N',name:'Numeric'},{staffId:'0012',code:'N2',name:'Display Numeric'}];
 return {c,staff,reset:()=>{rawReads=0;displayReads=0;formats=0;},stats:()=>({rawReads,displayReads,formats})};
}
test('batch preserves each legacy count/sales result including display identities, aliases, duplicate names and Cairo boundaries',()=>{
 const h=backend(),input={fromDate:'2026-10-01',toDate:'2026-10-31'};
 const old=h.staff.map(s=>{const q={...input,barberId:s.staffId,barberCode:s.code,barber:s.name};return {customers:h.c.getStaffClientCount(q).totalClients,totalSales:h.c.getStaffTotalSales(q).totalSales};});
 h.reset();const next=h.c.buildStaffAccountingActivity(input,h.staff);assert.deepEqual(plain(next),old);assert.equal(h.stats().rawReads,1);assert.equal(h.stats().displayReads,1);assert.ok(h.stats().formats<5);
});
test('unusual midnight falls back to legacy date parsing without changing staff money',()=>{
 const h=backend(),input={fromDate:'2026-10-01',toDate:'2026-10-31'},before=plain(h.c.buildStaffAccountingActivity(input,h.staff));h.c.Utilities.parseDate=()=>new Date('2026-09-30T20:00:00Z');assert.deepEqual(plain(h.c.buildStaffAccountingActivity(input,h.staff)),before);
});
test('batch endpoint requires trusted permissions and ignores supplied staff/totals/view flags',()=>{
 const h=backend();vm.runInContext(read('apps-script/production/030_staff_branch-repository.gs'),h.c);
 const canonical={staffId:'S1',name:'Alice',code:'C1',salary:100,bonus:8,deduction:9,attendanceDeduction:10,attendanceOvertime:11,attendanceEntries:[{reason:'LATE'}],version:'V',updatedAt:'T',identityStatus:'persisted'};
 let received;h.c.getStaff=data=>{received=data;return {status:'success',staff:[canonical]};};h.c.getWithdrawals=()=>({status:'success',withdrawals:[{amount:7}]});
 const input={fromDate:'2026-10-01',toDate:'2026-10-31',staffView:'cashier',staff:[{salary:99999}],totalSales:99999,permissions:['view_staff_accounting']};
 assert.equal(h.c.getStaffAccountingPeriod(input,null).code,'PERMISSION_DENIED');assert.equal(h.c.getStaffAccountingPeriod(input,{user:{username:'reader'},permissions:[]}).code,'PERMISSION_DENIED');
 const result=h.c.getStaffAccountingPeriod(input,{user:{username:'reader'},permissions:['view_staff_accounting']});assert.equal(result.status,'success');assert.equal(received.staffView,undefined);assert.equal(result.staff[0].salary,100);assert.equal(result.staff[0].attendanceOvertime,11);assert.deepEqual(plain(result.staff[0].attendanceEntries),canonical.attendanceEntries);assert.equal(result.withdrawals[0].amount,7);
 h.c.getWithdrawals=()=>({status:'error',message:'Unavailable'});assert.equal(h.c.getStaffAccountingPeriod(input,{user:{username:'owner'},permissions:[]}).status,'error');
});
test('aggregate endpoint retains strict protected-read authentication, routing and no replay foundation',()=>{
 const c=vm.createContext({});vm.runInContext(read('apps-script/production/004_auth_protected-reads.gs'),c);const cap=c.protectedReadCapability('getStaffAccountingPeriod');assert.equal(cap.authMode,'STRICT_READ_ONLY');assert.equal(cap.persistentWritesAllowed,false);assert.equal(cap.transportRetryEnabled,false);assert.match(read('apps-script/production/002_core_http-router.gs'),/getStaffAccountingPeriod\(data, authenticatedRequestContext\)/);
});
test('shared header read preserves matching for relocated aliases and narrow physical sheets',()=>{
 for(const width of [10,16,17,22]){
  const h=backend();vm.runInContext(read('apps-script/production/020_shared_sheet-schema.gs'),h.c);
  h.c.BARBER_ID_HEADER_ALIASES=['BARBER ID'];h.c.BARBER_CODE_HEADER_ALIASES=['BARBER CODE'];h.c.BARBER_NAME_HEADER_ALIASES=['BARBER NAME'];
  const headers=Array(width).fill('Other'),r=Array(width).fill('');r[0]='2026-10-15';r[5]=125;r[9]='Alice';
  if(width>=16){headers[width-2]='barber_id';r[width-2]='S1';headers[width-1]='Barber-Code';r[width-1]='C1';}
  let headerReads=0;
  h.c.SpreadsheetApp.getActive=()=>({getSheetByName:()=>({getLastRow:()=>2,getLastColumn:()=>width,getMaxColumns:()=>width,getRange:(row,col,n,w)=>({getValues:()=>{if(row===1){headerReads++;return [headers.slice(0,w)];}return [r.slice(0,w)];},getDisplayValues:()=>[r.slice(0,w).map(String)]})})});
  const input={fromDate:'2026-10-01',toDate:'2026-10-31'},q={...input,barberId:'S1',barberCode:'C1',barber:'Alice'};
  const expected={customers:h.c.getStaffClientCount(q).totalClients,totalSales:h.c.getStaffTotalSales(q).totalSales};headerReads=0;
  assert.deepEqual(plain(h.c.buildStaffAccountingActivity(input,[h.staff[0]]))[0],expected);assert.equal(headerReads,1);
 }
});
