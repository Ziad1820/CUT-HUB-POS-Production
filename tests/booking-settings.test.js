"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/assets/js/pages/booking-settings.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function harness(allowed=true,owner=false){
 const nodes={},calls=[],deferred=[];
 function element(){return{value:'',disabled:false,hidden:false,checked:false,dataset:{},listeners:{},elements:[],addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},append(...children){this.children=(this.children||[]).concat(children);if(!this.value&&children[0]?.value)this.value=children[0].value;},focus(){},setCustomValidity(){}};}
 const byId=id=>nodes[id]||(nodes[id]=element());
 for(const id of ['branchForm','hoursForm'])for(const name of ['branchId','branchName','timeZone','closureStatus','closureReason','active','publicSelectable','weekday','openTime','closeTime','effectiveFrom','effectiveTo'])byId(id)[name]=element();
 const root=element();root.hidden=true;root.open=false;root.querySelector=selector=>byId(selector.match(/id="([^"]+)"/)[1]);root.querySelectorAll=selector=>selector==='button,input,select'?[byId('refreshBtn'),byId('branchSelect')]:[];
 const cashier=element();cashier.disabled=true;
 const c=vm.createContext({document:{getElementById:id=>id==='bookingSettings'?root:null,createElement:element,querySelectorAll(){throw Error('Settings must not operate on the whole page');}},window:{location:{search:''}},URLSearchParams,console,crypto:{randomUUID:()=> 'fixture-id'},RomeoAuth:{getCurrentUser:()=>({username:'fixture'}),isOwnerUser:()=>owner,hasPermission:p=>allowed&&p==='booking_availability.view'},RomeoApi:{request:p=>{calls.push(p);return new Promise(resolve=>deferred.push(resolve));}}});
 vm.runInContext(source,c);return{root,nodes,byId,calls,deferred,cashier};
}
test('settings stay hidden and make no requests without existing permission',async()=>{
 const h=harness(false);assert.equal(h.root.hidden,true);assert.equal(h.calls.length,0);assert.equal(h.root.listeners.toggle,undefined);
});
test('closed settings load nothing; opening once initializes scoped controls and preserves cashier state',async()=>{
 const h=harness();assert.equal(h.root.hidden,false);assert.equal(h.calls.length,0);h.root.open=true;h.root.listeners.toggle();await tick();
 assert.deepEqual(h.calls.map(p=>p.action),['getBookingAvailabilityFlags','listBookingBranches']);assert.equal(h.byId('refreshBtn').disabled,true);assert.equal(h.cashier.disabled,true);
 h.root.open=false;h.root.listeners.toggle();h.root.open=true;h.root.listeners.toggle();assert.equal(h.calls.length,2);
 h.deferred[0]({status:'success',flags:{engine:'PHASE5',attendanceLiveEnabled:true}});h.deferred[1]({status:'success',branches:[{branchId:'B1',branchName:'Fixture',active:true}],branchHours:[]});await tick();await tick();
 assert.equal(h.byId('refreshBtn').disabled,false);assert.equal(h.cashier.disabled,true);assert.equal(h.byId('branchForm').branchId.value,'B1');assert.equal(h.byId('attendanceIntegrationBtn').textContent,'إيقاف ربط الحضور بالحجوزات');
});
test('retired page and assets are removed while its URL redirects to the embedded settings',()=>{
 for(const p of ['public/pages/booking-availability-admin.html','public/assets/js/pages/booking-availability-admin.js','public/assets/css/pages/booking-availability-admin.css'])assert.equal(fs.existsSync(p),false,p);
 const html=fs.readFileSync('public/pages/bookings.html','utf8');assert.match(html,/<details id="bookingSettings"[^>]*hidden>/);assert.match(html,/booking-settings\.js/);
 const layout=require('../public/assets/js/utils/layout');assert.equal(layout.NAVIGATION_ITEMS.some(x=>x.href==='booking-availability-admin.html'),false);
 const redirect=JSON.parse(fs.readFileSync('vercel.json','utf8')).redirects.find(x=>x.source==='/pages/booking-availability-admin.html');assert.equal(redirect.destination,'/pages/bookings.html?settings=1');
});
test('owner confirmation controls initialize without changing the branch and cannot save an unknown mode',async()=>{
 const h=harness(true,true);h.root.open=true;h.root.listeners.toggle();await tick();
 assert.equal(h.calls[0].action,'getBookingConfirmationMode');
 assert.equal(typeof h.byId('saveConfirmationMode').listeners.click,'function');
 const count=h.calls.length;h.byId('saveConfirmationMode').listeners.click();assert.equal(h.calls.length,count);
 h.deferred[0]({status:'error',message:'fixture failure'});await tick();
 h.byId('saveConfirmationMode').listeners.click();assert.equal(h.calls.some(p=>p.action==='setBookingConfirmationMode'),false);
 assert.match(h.byId('confirmationModeStatus').textContent,/تعذر/);
});
