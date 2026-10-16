"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const day={staffId:'S1',staffName:'Fixture',branchId:'B1',attendanceDate:'2026-10-16',attendanceDayId:'ATD-S1-2026-10-16',state:'NOT_STARTED'};
const page=(date='2026-10-16',days=[day])=>({status:'success',date,attendanceDays:days,permissions:{manage:true},serverNow:'2026-10-16T10:00:00+03:00'});
function ui(request){
 const e={};function node(){return {value:'',textContent:'',hidden:false,checked:false,disabled:false,open:false,dataset:{},children:[],options:[],classList:{add(){},remove(){}},append(...nodes){this.children.push(...nodes);this.options.push(...nodes);},replaceChildren(...nodes){this.children=[...nodes];this.options=[...nodes];},setAttribute(){},querySelectorAll:()=>[],addEventListener(){},focus(){},showModal(){this.open=true;},close(){this.open=false;}};}
 const document={getElementById:id=>e[id]||(e[id]=node()),createElement:node,querySelectorAll:()=>[]};
 const c=vm.createContext({document,window:{location:{search:''},confirm:()=>true},RomeoAuth:{requireAuth:()=>({username:'owner'}),isOwnerUser:()=>true},RomeoApi:{request},navigator:{onLine:true},crypto:{randomUUID:()=> 'FIXTURE'},URLSearchParams,Option:function(text,value){this.textContent=text;this.value=value;},console:{info(){}}});
 const source=read(process.env.CUT_HUB_ATTENDANCE_SOURCE_OVERRIDE||'public/assets/js/pages/attendance.js');vm.runInContext(source.slice(0,source.indexOf('  cards.addEventListener'))+'window.test={state,loadDashboard,filteredDays,render,populateFilters,submitAction,configureActionDialog,reviewOvertime,showDetails,closeDialog};})();',c);
 document.getElementById('attendanceDate').value='2026-10-16';return {a:c.window.test,e,byId:document.getElementById};
}
test('concurrent dashboard reads coalesce and last successful rows remain visible on failure',async()=>{
 let finish,calls=0;const h=ui(()=>{calls++;return new Promise(r=>finish=r);});const p=h.a.loadDashboard();assert.equal(h.a.loadDashboard(),p);finish(page());assert.equal(await p,true);assert.equal(calls,1);assert.equal(h.a.state.days.length,1);
 const failed=h.a.loadDashboard();finish({status:'error'});assert.equal(await failed,false);assert.equal(h.a.state.days.length,1);assert.equal(h.a.state.fresh,false);assert.equal(h.e.confirmActionBtn.disabled,true);
});
test('only newest pending date executes and stale response cannot replace current attendance',async()=>{
 let finish;const calls=[],h=ui(p=>{calls.push(p);return new Promise(r=>finish=r);});const first=h.a.loadDashboard(),oldFinish=finish;h.e.attendanceDate.value='2026-10-17';const middle=h.a.loadDashboard();h.e.attendanceDate.value='2026-10-18';const latest=h.a.loadDashboard();assert.equal(await middle,false);oldFinish(page());assert.equal(await first,false);assert.equal(calls.length,2);assert.equal(calls[1].date,'2026-10-18');finish(page('2026-10-18',[]));await latest;assert.equal(h.a.state.loadedDate,'2026-10-18');assert.equal(h.a.state.days.length,0);
});
test('branch, staff and issue filters narrow only the authorized selected day with no further requests',async()=>{
 let calls=0;const days=[day,{...day,staffId:'S2',branchId:'B2',openBreak:true},{...day,staffId:'S3',branchId:'B1',calculationWarnings:['WARNING']}],h=ui(async()=>{calls++;return page('2026-10-16',days);});await h.a.loadDashboard();
 h.e.branchFilter.value='B1';assert.equal(h.a.filteredDays().length,2);h.e.unresolvedFilter.checked=true;assert.equal(h.a.filteredDays()[0].staffId,'S3');h.e.unresolvedFilter.checked=false;h.e.staffFilter.value='S1';h.a.render();assert.equal(h.e.totalCount.textContent,'1');h.a.populateFilters(days);assert.equal(h.e.staffFilter.options.length,4);assert.equal(h.e.staffFilter.value,'S1');assert.equal(calls,1);
});
test('synthetic attendance action cannot overlap or replay and is reconciled once',async()=>{
 let finish,writes=0,reads=0;const h=ui(p=>p.action==='getAttendanceDashboard'?(reads++,Promise.resolve(page())):(writes++,new Promise(r=>finish=r)));await h.a.loadDashboard();h.a.configureActionDialog('attendanceCheckIn',day,'');const p=h.a.submitAction({preventDefault(){}});await h.a.submitAction({preventDefault(){}});await h.a.reviewOvertime(day);assert.equal(writes,1);finish({status:'success'});await p;assert.equal(reads,2);assert.equal(h.a.state.mutationActive,false);assert.equal(h.e.actionDialog.open,false);
});
test('uncertain write retains dialog draft, never replays and failed reconciliation blocks actions',async()=>{
 let reads=0,writes=0;const h=ui(p=>{if(p.action==='getAttendanceDashboard')return Promise.resolve(reads++?{status:'error'}:page());writes++;return Promise.reject(Error('uncertain'));});await h.a.loadDashboard();h.a.configureActionDialog('attendanceStartBreak',day,'');h.e.plannedBreakMinutes.value='45';await h.a.submitAction({preventDefault(){}});await h.a.submitAction({preventDefault(){}});assert.equal(writes,1);assert.equal(reads,2);assert.equal(h.e.plannedBreakMinutes.value,'45');assert.equal(h.e.actionDialog.open,true);assert.equal(h.e.confirmActionBtn.disabled,true);
});
test('owner overtime request refreshes before presenting approval and never approves automatically',async()=>{
 const calls=[],h=ui(async p=>{calls.push(p.action);return p.action==='getAttendanceDashboard'?page():{status:'success',overtimeApproval:{overtimeApprovalId:'O1'}};});await h.a.loadDashboard();await h.a.reviewOvertime(day);assert.deepEqual(calls,['getAttendanceDashboard','requestAttendanceOvertime','getAttendanceDashboard']);assert.equal(h.a.state.selectedAction,'approveAttendanceOvertime');assert.equal(h.e.actionDayId.dataset.entityId,'O1');
});
test('closed details dialog ignores late events and audit responses',async()=>{
 const finish=[],h=ui(()=>new Promise(resolve=>finish.push(resolve)));const pending=h.a.showDetails(day);assert.equal(h.e.detailsDialog.open,true);h.a.closeDialog(h.e.detailsDialog);const previous=h.e.detailsContent.children;finish[0]({status:'success',events:[]});finish[1]({status:'success',audit:[]});await pending;assert.equal(h.e.detailsDialog.open,false);assert.equal(h.e.detailsContent.children,previous);
});
function backend(source,actor={actorId:'owner',owner:true,permissions:[]}){
 const counts={},rows={ATTENDANCE:[],ATTENDANCE_EVENTS:[],ATTENDANCE_ADJUSTMENTS:[],ATTENDANCE_OVERTIME_APPROVALS:[],STAFF_WORK_POLICIES:[],STAFF_SCHEDULE_OVERRIDES:[]};
 const staff=Array.from({length:9},(_,i)=>({staffId:'S'+i,staffName:'Fixture '+i,branchId:i<8?'B1':'B2',active:true}));
 const clone=x=>plain(x);const counted=(key,fn)=>{counts[key]=(counts[key]||0)+1;return fn();};
 const c=vm.createContext({console,Date,schedulePhase2Text:x=>String(x||''),schedulePhase2ReadRows:name=>counted(name,()=>clone(rows[name]||[])),schedulePhase2ReadStaff:()=>counted('STAFF',()=>clone(staff)),schedulePhase2ReadSchedules:()=>counted('SCHEDULES',()=>[]),Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_a,v)=>Array.from(require('node:crypto').createHash('sha256').update(v).digest())}});
 for(const f of ['062_phase_staff-attendance-schema.gs','063_phase_staff-attendance-core.gs','064_phase_staff-scheduling-phase2.gs','067_phase_staff-attendance-phase3.gs'])vm.runInContext(read('apps-script/production/'+f),c);
 vm.runInContext(source,c);
 const readers=c.attendancePhase3ReadSnapshot?c.attendancePhase3ReadSnapshot('getAttendanceDashboard'):undefined;
 const repository=c.attendancePhase3CreateRepository(readers),service=c.StaffAttendancePhase3.createService({repository,actorResolver:()=>actor,scheduleResolver:(s,d)=>c.attendancePhase3ResolveSchedule(s,d,readers),now:()=> '2026-10-16T19:00:00+03:00'});
 return {c,counts,rows,repository,readers,execute:input=>service.execute('getAttendanceDashboard',{date:'2026-10-16',...input})};
}
test('request snapshot preserves original nine-employee dashboard while reading each source once',()=>{
 const old=backend(read('apps-script/production/baseline/068_phase_staff-attendance-phase3-gas.js')),next=backend(read('apps-script/production/068_phase_staff-attendance-phase3-gas.gs'));
 assert.deepEqual(plain(next.execute()),plain(old.execute()));assert.equal(next.execute().attendanceDays.length,9);for(const key of ['ATTENDANCE','ATTENDANCE_EVENTS','ATTENDANCE_ADJUSTMENTS','ATTENDANCE_OVERTIME_APPROVALS','STAFF_WORK_POLICIES','STAFF_SCHEDULE_OVERRIDES','SCHEDULES','STAFF'])assert.equal(next.counts[key],1,key);assert.ok(old.counts.ATTENDANCE>=9);assert.ok(old.counts.STAFF_WORK_POLICIES>=9);
});
test('snapshots retain scope and duplicate-day rejection and cannot be enabled for a mutation',()=>{
 const source=read('apps-script/production/068_phase_staff-attendance-phase3-gas.gs');for(const actor of [{actorId:'manager',branchIds:['B1'],permissions:['attendance.view']},{actorId:'self',staffId:'S8',permissions:['attendance.view']}]){
  assert.deepEqual(plain(backend(source,actor).execute()),plain(backend(read('apps-script/production/baseline/068_phase_staff-attendance-phase3-gas.js'),actor).execute()));
 }
 const h=backend(source);assert.equal(h.c.attendancePhase3ReadSnapshot('attendanceCheckIn'),null);assert.equal(h.c.attendancePhase3ReadSnapshot('approveAttendanceOvertime'),null);const a=h.repository.listStaff();a[0].staffName='Changed';assert.notEqual(h.repository.listStaff()[0].staffName,'Changed');
 const live=h.c.attendancePhase3CreateRepository();live.listStaff();live.listStaff();assert.equal(h.counts.STAFF,3);
 const nextRequest=h.c.attendancePhase3ReadSnapshot('getAttendanceDashboard');nextRequest.readStaff();nextRequest.readStaff();assert.equal(h.counts.STAFF,4);
 const duplicate=backend(source);duplicate.rows.ATTENDANCE=[{attendanceDayId:'A1',staffId:'S0',attendanceDate:'2026-10-16'},{attendanceDayId:'A2',staffId:'S0',attendanceDate:'2026-10-16'}];assert.throws(()=>duplicate.execute(),{code:'ATTENDANCE_DAY_AMBIGUOUS'});
 for(const runtime of [backend(source,{actorId:'denied',permissions:[]}),backend(read('apps-script/production/baseline/068_phase_staff-attendance-phase3-gas.js'),{actorId:'denied',permissions:[]})])assert.throws(()=>runtime.execute(),{code:'ATTENDANCE_PERMISSION_DENIED'});
});
test('snapshot preserves a completed work day with break, minute totals and pending decisions',()=>{
 const old=backend(read('apps-script/production/baseline/068_phase_staff-attendance-phase3-gas.js')),next=backend(read('apps-script/production/068_phase_staff-attendance-phase3-gas.gs'));
 for(const h of [old,next]){
  h.rows.STAFF_WORK_POLICIES=[{policyId:'P1',settlementPeriod:'DAILY',staffId:'S0',effectiveFrom:'2026-01-01',active:true,defaultShiftStart:'09:00',defaultShiftEnd:'18:00',requiredDailyMinutes:480,allowedBreakMinutes:60,breakPaymentType:'UNPAID'}];
  h.rows.ATTENDANCE_EVENTS=[['CHECK_IN','09:00'],['BREAK_START','12:00'],['BREAK_END','13:00'],['CHECK_OUT','18:00']].map(([eventType,time],i)=>({eventId:'E'+i,eventType,eventAt:'2026-10-16T'+time+':00+03:00',attendanceDayId:'ATD-S0-2026-10-16',staffId:'S0',attendanceDate:'2026-10-16'}));
  h.rows.ATTENDANCE_ADJUSTMENTS=[{adjustmentId:'AD1',attendanceDayId:'ATD-S0-2026-10-16',staffId:'S0',status:'PENDING'}];
 }
 const result=next.execute();assert.deepEqual(plain(result),plain(old.execute()));assert.equal(result.attendanceDays[0].state,'CHECKED_OUT');assert.equal(result.attendanceDays[0].workedMinutesRaw,480);assert.equal(result.attendanceDays[0].pendingAdjustments.length,1);
});
