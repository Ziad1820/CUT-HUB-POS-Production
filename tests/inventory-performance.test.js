"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const item={itemId:'I1',name:'Fixture',active:true,packageSize:10,purchasePrice:20,usageUnit:'piece',stock:{totalQuantity:30,sealedPacks:3}};
const page=()=>({status:'success',items:[item],batches:[],log:[],services:[{serviceId:'S1',name:'Fixture service'}],recipes:[]});
const report=()=>({status:'success',barbers:[],rows:[],summary:{totalCost:25,invoiceCount:2,totalMovements:3}});
function ui(request){
 const elements={};const element=()=>({value:'',textContent:'',innerHTML:'',checked:false,disabled:false,dataset:{},appendChild(){},addEventListener(){},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[],closest:()=>({classList:{remove(){},toggle(){}}}),classList:{remove(){},toggle(){}}});
 const document={getElementById:id=>elements[id]||(elements[id]=element()),documentElement:{lang:'ar'}};
 const window={location:{search:''},alert(){},confirm:()=>true,RomeoInventoryFilters:{filterItems:items=>items}};
 const c=vm.createContext({document,window,RomeoApi:{request},RomeoAuth:{requireAuth(){}},RomeoDateRange:{today:()=> '2026-10-15',validate:(a,b)=>({ok:!!a&&!!b&&a<=b,fromDate:a,toDate:b})},URLSearchParams,console:{info(){}}});
 const source=read(process.env.CUT_HUB_INVENTORY_SOURCE_OVERRIDE||'public/assets/js/pages/inventory.js');
 vm.runInContext(source.slice(0,source.indexOf('  elements.list.addEventListener'))+'window.test={state,loadData,loadBarberConsumptionReport,saveItem,deleteItem,addPurchase,saveRecipe,render,clearPurchaseForm,today,currentMonthStart};})();',c);
 elements.barberConsumptionFrom.value='2026-10-01';elements.barberConsumptionTo.value='2026-10-15';return {a:window.test,e:elements};
}
test('startup is one atomic page read; duplicate refreshes share one request',async()=>{
 let finish,calls=0;const h=ui(()=>{calls++;return new Promise(r=>finish=r);});const p=h.a.loadData();assert.equal(h.a.loadData(),p);assert.equal(h.e.saveItemBtn.disabled,true);await Promise.resolve();finish(page());assert.equal(await p,true);assert.equal(calls,1);assert.equal(h.e.currentStock.textContent,'30 قطعة');assert.equal(h.e.saveItemBtn.disabled,false);
});
test('report defaults use a canonical Cairo month start and today',()=>{
 const h=ui(async()=>page());assert.equal(h.a.currentMonthStart(),'2026-10-01');assert.equal(h.a.today(),'2026-10-15');
});
test('failed or malformed refresh retains inventory balances and component arrays atomically',async()=>{
 let bad=false;const h=ui(async()=>bad?{status:'success',items:[],batches:[],log:[]}:page());await h.a.loadData();bad=true;assert.equal(await h.a.loadData(),false);assert.equal(h.a.state.items.length,1);assert.equal(h.a.state.services.length,1);assert.equal(h.e.currentStock.textContent,'30 قطعة');assert.match(h.e.inventoryStatus.textContent,/آخر تحميل/);
});
test('report loading does not lock inventory editing or refreshing',async()=>{
 let finish;const h=ui(p=>p.action==='getInventoryPage'?Promise.resolve(page()):new Promise(r=>finish=r));await h.a.loadData();const p=h.a.loadBarberConsumptionReport();assert.equal(h.e.saveItemBtn.disabled,false);assert.equal(h.a.loadBarberConsumptionReport(),p);finish(report());assert.equal(await p,true);assert.equal(h.e.barberConsumptionCost.textContent,'25 جنيه');
});
test('only newest pending report filters publish and failures keep the last report',async()=>{
 let finish,fail=false;const calls=[],h=ui(p=>{calls.push(p);return fail?Promise.reject(Error('private')):new Promise(r=>finish=r);});const initial=h.a.loadBarberConsumptionReport();finish(report());await initial;
 const first=h.a.loadBarberConsumptionReport(),oldFinish=finish;h.e.barberConsumptionFrom.value='2026-10-02';const middle=h.a.loadBarberConsumptionReport();h.e.barberConsumptionFrom.value='2026-10-03';const latest=h.a.loadBarberConsumptionReport();assert.equal(await middle,false);oldFinish(report());await first;assert.equal(calls.at(-1).fromDate,'2026-10-03');finish(report());await latest;fail=true;await h.a.loadBarberConsumptionReport();assert.equal(h.e.barberConsumptionCost.textContent,'25 جنيه');assert.doesNotMatch(h.e.inventoryReportStatus.textContent,/private/);
});
test('synthetic purchase has one mutation and one refresh, with no overlapping item mutation',async()=>{
 let finish,writes=0,reads=0;const h=ui(p=>p.action==='getInventoryPage'?(reads++,Promise.resolve(page())):(writes++,new Promise(r=>finish=r)));await h.a.loadData();h.e.purchasePacks.value='2';const saving=h.a.addPurchase();await h.a.addPurchase();await h.a.deleteItem();assert.equal(writes,1);finish({status:'success'});await saving;assert.equal(reads,2);assert.equal(h.e.purchasePacks.value,'');assert.equal(h.e.purchaseDate.value,'2026-10-15');assert.equal(h.e.saveItemBtn.disabled,false);
});
test('uncertain write never replays, retains draft, and failed reconciliation blocks writes',async()=>{
 let reads=0,writes=0;const h=ui(p=>{if(p.action==='getInventoryPage')return Promise.resolve(reads++?{status:'error'}:page());writes++;return Promise.reject(Error('uncertain'));});await h.a.loadData();h.e.purchasePacks.value='2';await h.a.addPurchase();await h.a.addPurchase();assert.equal(writes,1);assert.equal(reads,2);assert.equal(h.e.purchasePacks.value,'2');assert.equal(h.e.saveItemBtn.disabled,true);assert.equal(h.e.currentStock.textContent,'30 قطعة');
});
test('failed item write retains edited form even when reconciliation succeeds',async()=>{
 const h=ui(p=>p.action==='getInventoryPage'?Promise.resolve(page()):Promise.reject(Error('uncertain')));await h.a.loadData();h.e.itemName.value='Draft name';await h.a.saveItem();assert.equal(h.e.itemName.value,'Draft name');assert.equal(h.a.state.items[0].name,'Fixture');assert.equal(h.e.saveItemBtn.disabled,false);
});
test('combined backend reuses original inventory, services and recipes and rejects forged context',()=>{
 const payload=page(),c=vm.createContext({jsonOutput:x=>x,getServices:()=>({status:'success',services:payload.services}),getServiceRecipes:()=>({status:'success',recipes:payload.recipes})});vm.runInContext(read('apps-script/production/022_inventory_stock.gs'),c);c.getInventoryData=()=>({status:'success',items:payload.items,batches:payload.batches,log:payload.log});
 assert.equal(c.getInventoryPage({permissions:['view_inventory']},null).code,'PERMISSION_DENIED');assert.equal(c.getInventoryPage({}, {user:{username:'reader'},permissions:[]}).code,'PERMISSION_DENIED');assert.deepEqual(plain(c.getInventoryPage({}, {user:{username:'reader'},permissions:['view_inventory']})),payload);
 c.getServiceRecipes=()=>({status:'error',code:'DENIED'});assert.equal(c.getInventoryPage({}, {user:{username:'owner'}}).code,'DENIED');assert.match(read('apps-script/production/002_core_http-router.gs'),/getInventoryPage\(data, authenticatedRequestContext\)/);
});
function logHarness(source,rows){
 let rowsRead=0,calls=0;const sheet={getLastRow:()=>rows.length+1,getRange:(start,col,n)=>({getValues:()=>{rowsRead+=n;calls++;return rows.slice(start-2,start-2+n);}})};
 const c=vm.createContext({inventoryText:x=>String(x||'').trim()});vm.runInContext(source,c);c.ensureInventoryLogBarberColumns=()=>({sheet,width:18,barberIdColumn:16,barberNameColumn:17,balanceBeforeColumn:18});return {c,rowsRead:()=>rowsRead,calls:()=>calls};
}
test('bounded log read preserves old ordering/fields with blank IDs while avoiding historic rows',()=>{
 const rows=Array.from({length:5000},(_,i)=>[i%10?'T'+i:'','2026-10-15','I1','Fixture','','service_consumption','',-1,'piece','INV'+i,'S1','tester',20,'Note','REQ','B1','Barber',21]);
 const before=read('apps-script/production/baseline/021_inventory_repository.js'),after=read('apps-script/production/021_inventory_repository.gs');
 for(const limit of [undefined,1,500,100000,0,-1,200.5]){const old=logHarness(before,rows),next=logHarness(after,rows);assert.deepEqual(plain(next.c.readInventoryLog(limit)),plain(old.c.readInventoryLog(limit)));if(limit===500){assert.ok(next.rowsRead()<=1000);assert.equal(old.rowsRead(),5000);}}
 const empty=logHarness(after,[]);assert.deepEqual(plain(empty.c.readInventoryLog(500)),[]);assert.equal(empty.calls(),0);
});
test('report cost projection preserves legacy price fallbacks, groups and invoice counts without formatting batch dates',()=>{
 const items=[['I1','Fixture','','','',10,20],['I2','Other','','','',5,15],['I3','','','','',1,999]];
 const batches=[['B1','I1',new Date('2026-10-15'),' ',2,10,'piece',2,0,0,25],['B2','I2',new Date('2026-10-15'),'',1,0,'piece',1,0,0,0]];
 const log=[{itemId:'I1',itemName:'Fixture',barberId:'H1',barberName:'Barber',batchId:'B1',unit:'piece',quantity:-2,invoiceId:'V1',dateTime:'2026-10-15',movementType:'service_consumption'},
 {itemId:'I2',itemName:'Other',barberId:'H1',barberName:'Barber',batchId:'B2',unit:'piece',quantity:-3,invoiceId:'V1',dateTime:'2026-10-15',movementType:'service_consumption'},
 {itemId:'I1',itemName:'Fixture',barberId:'old',barberName:'Historic',batchId:'missing',unit:'piece',quantity:-1,invoiceId:'V2',dateTime:'2026-09-15',movementType:'service_consumption'}];
 function setup(source){let formats=0;const c=vm.createContext({Date,normalizeDigits:x=>String(x),TIME_ZONE:'Africa/Cairo',INVENTORY_SHEETS:{items:'items',batches:'batches'},inventoryText:x=>String(x??'').trim(),inventorySheet:name=>name,requirePermission:()=>null,jsonOutput:x=>x,getDateKey:x=>{if(x instanceof Date){formats++;return x.toISOString().slice(0,10);}return String(x||'').slice(0,10);}});
 vm.runInContext(read('apps-script/production/baseline/021_inventory_repository.js')+source,c);c.inventoryRows=name=>name==='items'?items:batches;c.readInventoryLog=()=>log;c.readActiveInventoryBarbers=()=>[{barberId:'H1',barberName:'Barber'}];return {c,formats:()=>formats};}
 for(const input of [{},{fromDate:'2026-10-01',toDate:'2026-10-31'},{barberId:'old'},{fromDate:'2026-11-01'}]){
  const old=setup(read('apps-script/production/baseline/028_inventory_barber-consumption.js')),next=setup(read('apps-script/production/028_inventory_barber-consumption.gs'));
  assert.deepEqual(plain(next.c.getBarberConsumptionReport(input)),plain(old.c.getBarberConsumptionReport(input)));assert.equal(next.formats(),0);assert.equal(old.formats(),2);
 }
});
test('report skips formatting historical textual timestamps while retaining Cairo day and DST results',()=>{
 const log=Array.from({length:1000},(_,i)=>({movementType:'service_consumption',barberId:'H1',barberName:'Fixture',itemId:'I1',itemName:'Fixture',quantity:-1,unit:'piece',invoiceId:'V'+i,dateTime:new Date('2026-09-15T10:00:00Z').toString()}));
 for(const t of ['2026-10-29T20:59:59Z','2026-10-29T21:30:00Z','2026-10-29T22:00:00Z'])log.push({...log[0],invoiceId:t,dateTime:new Date(t).toString()});
 function setup(source){let formats=0;const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}),c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',INVENTORY_SHEETS:{batches:'batches',items:'items'},inventoryText:x=>String(x??'').trim(),inventoryNumber:x=>Number(x)||0,requirePermission:()=>null,jsonOutput:x=>x,inventorySheet:x=>x,inventoryRows:()=>[],readInventoryBatches:()=>[],readInventoryItems:()=>[],readInventoryLog:()=>log,Utilities:{parseDate:key=>new Date(key+'T00:00:00'+(key>'2026-10-29'?'+02:00':'+03:00')),formatDate:date=>{formats++;const p=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day;}}});
 vm.runInContext(read('apps-script/production/061_shared_date-and-number.gs')+source,c);c.readActiveInventoryBarbers=()=>[];return {c,formats:()=>formats};}
 const before=read('apps-script/production/baseline/028_inventory_barber-consumption.js'),after=read('apps-script/production/028_inventory_barber-consumption.gs');
 for(const input of [{fromDate:'2026-10-29',toDate:'2026-10-29'},{fromDate:'2026-10-01',toDate:'2026-10-31'},{}]){
  const old=setup(before),next=setup(after);assert.deepEqual(plain(next.c.getBarberConsumptionReport(input)),plain(old.c.getBarberConsumptionReport(input)));if(input.fromDate){assert.ok(next.formats()<10);assert.ok(old.formats()>1000);}
 }
 const old=setup(before),next=setup(after);next.c.Utilities.parseDate=()=>new Date('2026-04-23T21:00:00Z');const input={fromDate:'2026-10-29',toDate:'2026-10-29'};assert.deepEqual(plain(next.c.getBarberConsumptionReport(input)),plain(old.c.getBarberConsumptionReport(input)));
});
test('batch date memoization preserves full original batch records and reduces repeated timestamp conversions',()=>{
 const rows=Array.from({length:1000},(_,i)=>['B'+i,'I1',new Date('2026-10-15'),'',1,10,'piece',1,0,0,20,new Date('2026-10-20'),'active','created','updated']);
 rows.push(['TEXT','I1','2026-10-16','',1,10,'piece',1,0,0,20,'','active']);
 function setup(source){let formats=0;const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',INVENTORY_SHEETS:{batches:'batches'},inventoryText:x=>String(x??'').trim(),inventorySheet:x=>x,getDateKey:x=>{if(x instanceof Date){formats++;return x.toISOString().slice(0,10);}return String(x||'').slice(0,10);}});vm.runInContext(source,c);c.inventoryRows=()=>rows;return {c,formats:()=>formats};}
 const old=setup(read('apps-script/production/baseline/021_inventory_repository.js')),next=setup(read('apps-script/production/021_inventory_repository.gs'));assert.deepEqual(plain(next.c.readInventoryBatches()),plain(old.c.readInventoryBatches()));assert.equal(old.formats(),2000);assert.equal(next.formats(),2);
});
