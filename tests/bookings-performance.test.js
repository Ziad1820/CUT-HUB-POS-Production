"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/assets/js/pages/bookings.js','utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));
function backend(){
 let calls={bookings:0,ratings:0,snapshot:0,slots:0};
 const barbers=[{staffId:'S1',branchId:'B1',name:'One',code:'01'},{staffId:'S2',branchId:'B1',name:'Two',code:'02'},{staffId:'X',branchId:'B2',name:'Outside'}];
 const context=vm.createContext({console,Map,Date,bookingPublicAutoConfirm:()=>true,Utilities:{formatDate:()=> '2026-10-17'},TIME_ZONE:'Africa/Cairo',jsonOutput:x=>x,inheritProtectedReadContext:(_,x)=>x,
 bookingServiceIdsInputIsValid:()=>true,publicBookingServices:()=>[{serviceId:'SV',durationMinutes:30,price:50}],
 getSelectedPublicBookingServices:()=>[],getDateKey:x=>x,getPublicBookingServiceIds:()=>[],bookingServiceIdsHaveDuplicates:()=>false,isValidBookingDuration:x=>x>=15,
 bookingAvailabilityPhase5RequestSnapshot:()=>{calls.snapshot++;return{branches:[]};},bookingAvailabilityEngineMode:()=> 'PHASE5',
 bookingAvailabilityPhase5Actor:data=>({allowed:data.allowed!==false}),bookingAvailabilityPhase5HasPermission:actor=>actor.allowed,
 bookingAvailabilityPhase5AssertBranchScope:(_,branch)=>{if(branch!=='B1')throw Error('SCOPE');},
 bookingAvailabilityPhase5ListBranches:()=>[{branchId:"B1",active:true}],bookingAvailabilityPhase5Branch:()=>{},publicBookingBarbers:()=>barbers,
 getAllBookingsV2:()=>{calls.bookings++;return[];},getAllBookingRatings:()=>{calls.ratings++;return[];},
 calculatePublicBarberRatingSummary:()=>({averageRating:4,ratingsCount:1}),
 availableSlotsForBarber:(barber,date,duration,bookings,all)=>{calls.slots++;assert.equal(all.length,2);return{slots:['10:00'],availabilityToken:'T'+barber.staffId};},
 bookingServiceSetHash:()=> 'H',BookingAvailabilityPhase5:{availabilityError:(code)=>Object.assign(Error(code),{code}),hash:x=>JSON.stringify(x)},
 bookingErrorResponse:e=>({status:'error',code:e.code||e.message}),bookingPublicErrorResponse:e=>({status:'error',code:e.code||e.message}),
 getCairoDateTime:()=> 'NOW',bookingAvailabilityLiveRefreshEnabled:()=>true});
 vm.runInContext(fs.readFileSync('apps-script/production/056_booking_options.gs','utf8'),context);
 return{c:context,calls};
}
test('internal catalog skips booking, rating, attendance snapshots and all slot calculations without weakening branch checks',()=>{
 const h=backend(),result=h.c.getInternalBookingOptions({branchId:'B1',date:'2026-10-17',catalogOnly:true});
 assert.equal(result.catalogOnly,true);assert.deepEqual(plain(result.barbers),[{staffId:'S1',name:'One',code:'01'},{staffId:'S2',name:'Two',code:'02'}]);
 assert.deepEqual(h.calls,{bookings:0,ratings:0,snapshot:0,slots:0});
 assert.equal(h.c.getInternalBookingOptions({catalogOnly:true}).code,'AVAILABILITY_BRANCH_REQUIRED');
 assert.equal(h.c.getInternalBookingOptions({branchId:'B1',catalogOnly:true,allowed:false}).code,'AVAILABILITY_PERMISSION_DENIED');
 assert.equal(h.c.getInternalBookingOptions({branchId:'B2',catalogOnly:true}).code,'SCOPE');
});
test('selected employee slots equal full results while the slot engine retains the full scoped roster',()=>{
 const h=backend(),all=h.c.getInternalBookingOptions({branchId:'B1',date:'2026-10-17'});assert.equal(h.calls.slots,2);
 h.calls.slots=0;const one=h.c.getInternalBookingOptions({branchId:'B1',date:'2026-10-17',employeeId:'S2'});
 assert.deepEqual(plain(one.barbers),plain(all.barbers.filter(x=>x.staffId==='S2')));assert.equal(h.calls.slots,1);
 const denied=h.c.getInternalBookingOptions({branchId:'B1',date:'2026-10-17',employeeId:'X'});assert.deepEqual(plain(denied.barbers),[]);
});
test('public catalog flag and employee selectors cannot activate the internal fast path',()=>{
 const h=backend();h.c.availableSlotsForBarber=()=>{h.calls.slots++;return{slots:['10:00']};};
 const result=h.c.getPublicBookingOptions({branchId:'B1',date:'2026-10-17',catalogOnly:true,employeeId:'S2'});
 assert.equal(result.status,'success');assert.equal(result.catalogOnly,undefined);assert.equal(h.calls.snapshot,1);assert.equal(h.calls.bookings,1);assert.equal(h.calls.ratings,1);assert.equal(h.calls.slots,2);
});
function ui(request){
 const nodes={};function node(){return{value:'',textContent:'',innerHTML:'',disabled:false,dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},querySelector:()=>node(),querySelectorAll:()=>[],focus(){}};}
 const document={getElementById:id=>nodes[id]||(nodes[id]=node()),querySelector:()=>node(),querySelectorAll:()=>[],documentElement:{lang:'ar'},addEventListener(){},hidden:false};
 const c=vm.createContext({document,window:{location:{search:''},addEventListener(){}},RomeoAuth:{getCurrentUser:()=>({}),isOwnerUser:()=>true,hasPermission:()=>true},RomeoApi:{request},console,Intl,Date,Map,Set,URLSearchParams,Number,clearTimeout(){},setTimeout:()=>1});
 const stop=source.indexOf('  elements.form.addEventListener');
 vm.runInContext(source.slice(0,stop)+'\n globalThis.api={state,readBooking,invalidateBookingReads,loadInternalSlots,loadServiceOptions,loadBranchOptions,fetchRatings,render,fetchBookings,createBooking,visibleBookings};\n})();',c);
 return{a:c.api,e:nodes};
}
test('identical inflight reads coalesce and failures are evicted; confirmed mutations invalidate pending reads',async()=>{
 const calls=[],pending=[];const h=ui(p=>{calls.push(p);const d=defer();pending.push(d);return d.promise;});
 const p={action:'getRatingsAdmin',filters:{}};const a=h.a.readBooking(p),b=h.a.readBooking(p);assert.equal(a,b);await tick();assert.equal(calls.length,1);
 pending[0].reject(Error('temporary'));await assert.rejects(a);await tick();const next=h.a.readBooking(p);await tick();assert.equal(calls.length,2);
 h.a.invalidateBookingReads();const fresh=h.a.readBooking(p);await tick();assert.equal(calls.length,3);pending[1].resolve({status:'success'});pending[2].resolve({status:'success'});await Promise.all([next,fresh]);
});
test('an older availability response cannot restore slots after the selection becomes invalid',async()=>{
 const d=defer(),h=ui(()=>d.promise);h.e.bookingBranch.value='B1';h.e.bookingEmployee.value='S1';h.e.bookingDate.value='2026-10-17';h.a.state.selectedServiceIds.add('SV');
 const pending=h.a.loadInternalSlots();await tick();h.a.state.selectedServiceIds.clear();await h.a.loadInternalSlots();const empty=h.e.bookingTime.innerHTML;
 d.resolve({status:'success',barbers:[{staffId:'S1',slots:['10:00']}],liveRefreshEnabled:true});await pending;
 assert.equal(h.e.bookingTime.innerHTML,empty);assert.equal(h.e.bookingTime.disabled,true);assert.equal(h.a.state.liveRefreshEnabled,false);
});
test('silent slot refresh preserves a selected valid appointment',async()=>{
 const h=ui(()=>Promise.resolve({status:'success',barbers:[{staffId:'S1',slots:['10:00','10:30']}]}));h.e.bookingBranch.value='B1';h.e.bookingEmployee.value='S1';h.e.bookingDate.value='2026-10-17';h.e.bookingTime.value='10:30';h.a.state.selectedServiceIds.add('SV');await h.a.loadInternalSlots({silent:true});assert.equal(h.e.bookingTime.value,'10:30');
});
test('ratings use latest filters, coalesce repeats, and rendering does not trigger network reads',async()=>{
 const calls=[],ds=[],h=ui(p=>{calls.push(p);const d=defer();ds.push(d);return d.promise;});
 const first=h.a.fetchRatings();await tick();h.e.ratingStatusFilter.value='flagged';const second=h.a.fetchRatings(),same=h.a.fetchRatings();await tick();assert.equal(calls.length,2);
 ds[1].resolve({status:'success',ratings:[],total:2,currentMonthAverage:4});await Promise.all([second,same]);ds[0].resolve({status:'success',ratings:[],total:99});await first;
 assert.equal(h.e.ratingsCount.textContent,2);h.a.state.activeSource='ratings';h.a.render();h.a.render();await tick();assert.equal(calls.length,2);
});
test('repeated list refreshes reuse an active selection without enqueueing a second backend read',async()=>{
 const d=defer(),calls=[],h=ui(p=>{calls.push(p);return d.promise;});h.e.filterDate.value='2026-10-17';
 const first=h.a.fetchBookings();await tick();await h.a.fetchBookings();assert.equal(calls.length,1);assert.equal(h.a.state.bookingReloadQueued,false);
 d.resolve({status:'success',bookings:[]});await first;assert.equal(h.a.state.busy,false);
});
test('uncertain booking creation is submitted once, retains the draft, and is never automatically replayed',async()=>{
 const d=defer(),calls=[],h=ui(p=>{calls.push(p);return p.action==='createBooking'?d.promise:Promise.resolve({status:'success',bookings:[]});});
 h.e.bookingBranch.value='B1';h.e.bookingEmployee.value='S1';h.e.bookingEmployee.selectedOptions=[{textContent:'One'}];h.e.bookingDate.value='2026-10-17';h.e.bookingTime.value='10:00';h.e.customerName.value='Fixture';h.e.customerPhone.value='01000000000';h.e.bookingNote.value='Draft';h.a.state.services=[{serviceId:'SV',name:'Fixture',durationMinutes:30,price:50}];h.a.state.selectedServiceIds.add('SV');
 const first=h.a.createBooking({preventDefault(){}});await tick();await h.a.createBooking({preventDefault(){}});assert.equal(calls.filter(x=>x.action==='createBooking').length,1);
 d.reject(Error('uncertain'));await first;assert.equal(h.e.customerName.value,'Fixture');assert.equal(h.e.bookingNote.value,'Draft');assert.equal(h.e.saveBookingBtn.disabled,false);assert.equal(calls.filter(x=>x.action==='createBooking').length,1);
});
test('bootstrap applies the same scoped catalog and returns branches without a second round trip',async()=>{
 const h=backend(),data={catalogOnly:true,includeBranches:true,date:'2026-10-17'};
 const initial=h.c.getInternalBookingOptions(data),selected=h.c.getInternalBookingOptions({...data,branchId:'B1'});
 assert.deepEqual(plain(initial),plain(selected));assert.equal(h.calls.slots,0);assert.equal(initial.branches.length,1);
 assert.equal(h.c.getInternalBookingOptions({...data,allowed:false}).code,'AVAILABILITY_PERMISSION_DENIED');
 h.c.bookingAvailabilityPhase5ListBranches=()=>[{branchId:'B1',active:true},{branchId:'B2',active:true},{branchId:'OFF',active:false}];
 const multi=h.c.getInternalBookingOptions(data);assert.equal(multi.branches.length,2);assert.deepEqual(plain(multi.services),[]);assert.deepEqual(plain(multi.barbers),[]);
 const calls=[],u=ui(p=>{calls.push(p);return Promise.resolve(initial);});await u.a.loadBranchOptions().then(u.a.loadServiceOptions);
 assert.equal(calls.length,1);assert.equal(calls[0].includeBranches,true);assert.equal(u.e.bookingBranch.value,'B1');assert.equal(u.a.state.services.length,1);assert.equal(u.a.state.barbers.length,2);
});
test('status filtering stays local and preserves the server status/search/source behavior',async()=>{
 const calls=[],h=ui(p=>{calls.push(p);return Promise.resolve({status:'success',bookings:[
 {id:'B1',status:'pending',source:'public',customerName:'First',date:'2026-10-17',time:'10:00'},
 {id:'B2',status:'confirmed',source:'public',customerName:'Second',date:'2026-10-17',time:'10:30'},
 {id:'B3',status:'confirmed',source:'staff',customerName:'Third',date:'2026-10-17',time:'11:00'}]});});
 h.e.filterDate.value='2026-10-17';await h.a.fetchBookings();assert.deepEqual(plain(calls[0].filters),{fromDate:'2026-10-16',toDate:'2026-10-17'});
 h.e.statusFilter.value='confirmed';h.a.render();assert.deepEqual(plain(h.a.visibleBookings().map(x=>x.id)),['B2','B3']);assert.equal(h.e.todayBookingsCount.textContent,2);
 h.a.state.activeSource='staff';h.a.render();assert.deepEqual(plain(h.a.visibleBookings().map(x=>x.id)),['B3']);
 h.e.statusFilter.value='rejected';h.a.render();assert.deepEqual(plain(h.a.visibleBookings()),[]);assert.equal(calls.length,1);
});
