"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const staff=[{id:'S1',staffId:'S1',name:'Alice',code:'C1'},{id:'S2',staffId:'S2',name:'Bob',code:'C2'}];
const records=[{withdrawalId:'W1',staffName:'Alice',staffCode:'',amount:100,date:'2026-10-15',note:'Fixture'},{withdrawalId:'W2',staffName:'Bob',amount:50,date:'2026-10-14'}];
const page=(fromDate='2026-10-01',toDate='2026-10-31',rows=records)=>({status:'success',fromDate,toDate,staff,withdrawals:rows});
function ui(request){
 const source=read(process.env.CUT_HUB_WITHDRAWALS_SOURCE_OVERRIDE||'public/assets/js/pages/withdrawals.js'),elements={};
 const element=()=>({value:'',textContent:'',innerHTML:'',disabled:false,appendChild(){},addEventListener(){},querySelectorAll:()=>[],classList:{add(){},remove(){}}});
 const document={getElementById:id=>elements[id]||(elements[id]=element()),querySelectorAll:()=>[],createElement:element,body:{dataset:{language:'ar'}}};
 const c=vm.createContext({document,RomeoApi:{request},RomeoAuth:{requireAuth(){}},RomeoDateRange:{today:()=> '2026-10-15',setCurrentMonth:(a,b)=>{a.value='2026-10-01';b.value='2026-10-31';},validate:(a,b)=>({ok:!!a&&!!b&&a<=b,fromDate:a,toDate:b})},window:{location:{search:''}},localStorage:{getItem:()=>JSON.stringify(staff)},URLSearchParams,console:{info(){},error(){}},alert(){},confirm:()=>true,elements});
 vm.runInContext(source.slice(0,source.indexOf('    document.querySelectorAll(".sidebar-link[data-permission]"'))+'function inspect(){return {staffList,withdrawalList,staffFresh,loadedWithdrawalRange,selected:[...selectedWithdrawalIds],withdrawalWriteActive};}',c);return c;
}
test('startup has one page read, repeated period reads coalesce and totals preserve every loaded record',async()=>{
 let finish,calls=0;const c=ui(()=>{calls++;return new Promise(r=>finish=r);});const first=c.loadWithdrawalsFromSheet();assert.equal(c.loadWithdrawalsFromSheet(),first);assert.equal(c.elements.saveBtn.disabled,true);finish(page());assert.equal(await first,true);assert.equal(calls,1);assert.equal(c.elements.allWithdrawals.textContent,'150');assert.equal(c.elements.allRecords.textContent,2);assert.equal(c.elements.employeeWithdrawals.textContent,'100');assert.equal(c.elements.saveBtn.disabled,false);
 const source=read('public/assets/js/pages/withdrawals.js');assert.doesNotMatch(source,/action:\s*"getStaff"|loadStaffFromSheet/);assert.match(source,/if \(event\.persisted\) loadWithdrawalsFromSheet\(\)/);
});
test('only newest pending range publishes and interim failures never fabricate zero balances',async()=>{
 let fail=false,finish;const calls=[],c=ui(p=>{calls.push(p);return fail?Promise.resolve({status:'error',message:'private'}):new Promise(r=>finish=r);});const first=c.loadWithdrawalsFromSheet();finish(page());await first;vm.runInContext('selectedWithdrawalIds.add("W1")',c);
 fail=true;await c.loadWithdrawalsFromSheet();assert.equal(c.inspect().withdrawalList.length,2);assert.equal(c.elements.allWithdrawals.textContent,'150');assert.deepEqual(Array.from(c.inspect().selected),['W1']);assert.doesNotMatch(c.elements.withdrawalStatus.textContent,/private/);
 fail=false;const old=c.loadWithdrawalsFromSheet();const oldFinish=finish;c.elements.filterFromDate.value='2026-10-02';const replaced=c.loadWithdrawalsFromSheet();c.elements.filterFromDate.value='2026-10-03';const latest=c.loadWithdrawalsFromSheet();assert.equal(await replaced,false);oldFinish(page());await old;assert.equal(calls.at(-1).fromDate,'2026-10-03');assert.equal(c.inspect().loadedWithdrawalRange.fromDate,'2026-10-01');finish(page('2026-10-03'));await latest;assert.equal(c.inspect().loadedWithdrawalRange.fromDate,'2026-10-03');
});
test('date edits do not relabel old balances and stale or mismatched responses cannot replace them',async()=>{
 let finish;const c=ui(()=>new Promise(r=>finish=r));let p=c.loadWithdrawalsFromSheet();finish(page());await p;c.elements.filterFromDate.value='2026-11-01';c.elements.filterToDate.value='2026-11-30';c.renderAll();assert.equal(c.elements.allWithdrawals.textContent,'150');p=c.loadWithdrawalsFromSheet();finish(page());assert.equal(await p,false);assert.equal(c.inspect().loadedWithdrawalRange.fromDate,'2026-10-01');
});
test('single synthetic save blocks duplicate writes and does exactly one authoritative refresh',async()=>{
 let finishWrite,reads=0,writes=0;const c=ui(p=>p.action==='withdrawal'?(writes++,new Promise(r=>finishWrite=r)):(reads++,Promise.resolve(page())));await c.loadWithdrawalsFromSheet();c.elements.withdrawAmount.value='75';c.elements.withdrawNote.value='Fixture';const saving=c.addWithdrawal();await c.addWithdrawal();await c.deleteWithdrawal('W1');assert.equal(writes,1);finishWrite({status:'success'});await saving;assert.equal(reads,2);assert.equal(c.inspect().withdrawalWriteActive,false);assert.equal(c.elements.withdrawAmount.value,'');assert.equal(c.elements.withdrawDate.value,'2026-10-15');
});
test('failed writes never replay and failed reconciliation disables further financial submissions',async()=>{
 let writes=0,reads=0;const c=ui(p=>{if(p.action==='withdrawal'){writes++;return Promise.reject(Error('uncertain'));}return Promise.resolve(reads++?{status:'error'}:page());});await c.loadWithdrawalsFromSheet();c.elements.withdrawAmount.value='75';await c.addWithdrawal();await c.addWithdrawal();assert.equal(writes,1);assert.equal(c.elements.withdrawAmount.value,'75');assert.equal(c.elements.allWithdrawals.textContent,'150');assert.equal(c.elements.saveBtn.disabled,true);assert.equal(c.inspect().staffFresh,false);
});
test('single deletion unblocks correctly and bulk partial failure reconciles without replaying deleted rows',async()=>{
 let deletes=0,reads=0;const c=ui(p=>{if(p.action==='deleteWithdrawal'){deletes++;return Promise.resolve(deletes===3?{status:'error'}:{status:'success'});}reads++;return Promise.resolve(page());});await c.loadWithdrawalsFromSheet();await c.deleteWithdrawal('W1');assert.equal(c.inspect().withdrawalWriteActive,false);vm.runInContext('selectedWithdrawalIds=new Set(["W1","W2"])',c);await c.deleteSelectedWithdrawals();assert.equal(deletes,3);assert.equal(reads,3);assert.equal(c.inspect().withdrawalWriteActive,false);
});
test('empty authoritative staff is shown empty and cannot create withdrawals from stale cached staff',async()=>{
 let writes=0;const c=ui(async p=>{if(p.action!=='getWithdrawalsPage')writes++;return {...page(),staff:[],withdrawals:[]};});await c.loadWithdrawalsFromSheet();assert.equal(c.inspect().staffList.length,0);c.elements.withdrawAmount.value='20';await c.addWithdrawal();assert.equal(writes,0);assert.equal(c.elements.allRecords.textContent,0);assert.equal(c.elements.saveBtn.disabled,true);
});
function backend(){
 const headers=['NAME','CODE','ID','ACTIVE','IS_BARBER','SALARY'],staffRows=[['Alice','C1','S1',true,true,9999],['Bob','C2','S2',true,false,8888],['Inactive','C3','S3',false,true,1]];
 const s={getLastRow:()=>staffRows.length+1,getLastColumn:()=>headers.length,getRange:(r)=>({getValues:()=>r===1?[headers]:staffRows})};
 const withdrawals={getLastRow:()=>3,getRange:()=>({getValues:()=>[['Alice',100,'Fixture','2026-10-15','W1'],['Bob',50,'Fixture','2026-09-15','W2']]})};let attendanceReads=0;
 const c=vm.createContext({SpreadsheetApp:{getActive:()=>({getSheetByName:name=>name==='STAFF'?s:name==='WITHDRAWLS'?withdrawals:null})},getStaffSheet:()=>s,requirePermission:()=>({status:'error',code:'PERMISSION_DENIED'}),getApprovedAttendanceTotalsForCurrentMonth:()=>{attendanceReads++;throw Error('Must not read payroll');},jsonOutput:x=>x,TIME_ZONE:'Africa/Cairo',getDateKey:x=>String(x).slice(0,10),parseSheetBoolean:(x,d)=>x===undefined?d:x,parseSheetAmount:Number});
 vm.runInContext(read('apps-script/production/044_invoices_queries.gs')+read('apps-script/production/030_staff_branch-repository.gs')+read('apps-script/production/046_accounting_withdrawals.gs'),c);return {c,attendanceReads:()=>attendanceReads};
}
test('page read uses minimal active staff, unchanged withdrawal rows and no payroll reads',()=>{
 const h=backend(),range={fromDate:'2026-10-01',toDate:'2026-10-31'},expected=plain(h.c.getWithdrawals(range));const result=h.c.getWithdrawalsPage({...range,staffView:'cashier',staff:[{name:'Forged'}]}, {user:{username:'reader'},permissions:['view_withdrawals']});assert.equal(result.status,'success');assert.deepEqual(plain(result.withdrawals),expected.withdrawals);assert.deepEqual(Array.from(result.staff,x=>x.name),['Alice','Bob']);assert.ok(result.staff.every(x=>!('salary'in x)&&!('attendanceDeduction'in x)));assert.equal(h.attendanceReads(),0);
});
test('forged permissions or missing server context cannot authorize the page or cashier projection',()=>{
 const h=backend(),data={fromDate:'2026-10-01',toDate:'2026-10-31',permissions:['view_withdrawals']};assert.equal(h.c.getWithdrawalsPage(data,null).code,'PERMISSION_DENIED');assert.equal(h.c.getWithdrawalsPage(data,{user:{username:'reader'},permissions:[]}).code,'PERMISSION_DENIED');assert.equal(h.c.getStaff({staffView:'cashier'},{user:{username:'reader'},permissions:['view_withdrawals']}).code,'PERMISSION_DENIED');assert.match(read('apps-script/production/002_core_http-router.gs'),/getWithdrawalsPage\(data, authenticatedRequestContext\)/);
});
