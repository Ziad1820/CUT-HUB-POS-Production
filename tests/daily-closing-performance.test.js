"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
function ui(request,manager=true){
 const source=fs.readFileSync(process.env.CUT_HUB_DAILY_SOURCE_OVERRIDE||'public/pages/daily-closing.html','utf8');const elements={};for(const name of ['closingDate','previewBtn','closeDayBtn','salesTotal','cashTotal','visaTotal','instapayTotal','vodafoneTotal','tipTotal','expensesTotal','withdrawalsTotal','cashNetTotal','cashNetMetric','netTotal','netMetric','closingsBody'])elements[name]={textContent:'previous',innerHTML:'previous rows',classList:{toggle(){}}};elements.closingDate.value='2026-10-14';
 const c=vm.createContext({elements,RomeoApi:{request},isManager:manager,localize:ar=>ar,numberValue:x=>Number(x)||0,formatMoney:String,window:{location:{search:''}},URLSearchParams,console:{info(){}},confirm:()=>true,escapeHtml:x=>String(x).replace(/</g,'&lt;')});
 vm.runInContext('let latestPreview=null;let closings=[{closingId:"old"}];let selectedClosingKeys=new Set(["old"]);let statuses=[];function setStatus(message,type){statuses.push({message,type});}function renderClosings(){elements.closingsBody.innerHTML="existing rows";}function getClosingKey(x){return x.closingId;}function updateBulkDeleteControls(){}'+source.slice(source.indexOf('    function normalizePreview('),source.indexOf('    function renderClosings()'))+source.slice(source.indexOf('    let dailyClosingsRead'),source.indexOf('    async function deleteClosingFromSheet'))+source.slice(source.indexOf('    async function closeDay()'),source.indexOf('    elements.closingDate.value = todayKey();'))+'function state(){return {latestPreview,closings,selected:[...selectedClosingKeys],statuses};}',c);return c;
}
const preview=(date='2026-10-14',closed=false)=>({status:'success',preview:{date,salesTotal:100,tipTotal:20,cashTotal:120,expensesTotal:5,withdrawalsTotal:10,netTotal:105,alreadyClosed:closed}});
test('duplicate previews share one read and only the latest pending day is published',async()=>{
 const calls=[],finishes=[];const c=ui(p=>{calls.push(p);return new Promise(r=>finishes.push(r));});const first=c.loadPreview();assert.equal(c.loadPreview(),first);c.elements.closingDate.value='2026-10-15';const replaced=c.loadPreview();c.elements.closingDate.value='2026-10-16';const latest=c.loadPreview();await replaced;assert.equal(calls.length,1);finishes[0](preview());await first;assert.equal(c.state().latestPreview,null);assert.equal(calls.length,2);assert.equal(calls[1].date,'2026-10-16');finishes[1](preview('2026-10-16'));await latest;assert.equal(c.state().latestPreview.date,'2026-10-16');assert.equal(c.elements.closeDayBtn.disabled,false);
});
test('changing day or a failed preview never authorizes stale closing or wipes displayed amounts',async()=>{
 let fail=false,finish;const c=ui(async()=>fail?{status:'error',message:'Unavailable'}:preview());await c.loadPreview();const money=c.elements.netTotal.textContent;fail=true;await c.loadPreview();assert.equal(c.elements.netTotal.textContent,money);assert.equal(c.state().latestPreview,null);assert.equal(c.elements.closeDayBtn.disabled,true);
 const d=ui(()=>new Promise(r=>finish=r));const pending=d.loadPreview();d.elements.closingDate.value='2026-10-15';d.invalidatePreview();finish(preview());await pending;assert.equal(d.state().latestPreview,null);assert.equal(d.elements.closeDayBtn.disabled,true);
});
test('non-manager re-close remains forbidden even with a successful preview',async()=>{
 const calls=[];const c=ui(async p=>{calls.push(p.action);return preview('2026-10-14',true);},false);await c.loadPreview();assert.equal(c.elements.closeDayBtn.disabled,true);await c.closeDay();assert.deepEqual(calls,['getDailyClosingPreview']);
});
test('closing is submitted once and post-write preview and history refresh run together',async()=>{
 const calls=[];let finishWrite,finishHistory,finishPreview,reads=0;const c=ui(p=>{calls.push(p.action);if(p.action==='closeDay')return new Promise(r=>finishWrite=r);if(p.action==='getDailyClosings')return new Promise(r=>finishHistory=r);if(reads++===0)return Promise.resolve(preview());return new Promise(r=>finishPreview=r);});
 await c.loadPreview();const saved=c.closeDay();await c.closeDay();assert.equal(calls.filter(x=>x==='closeDay').length,1);finishWrite({status:'success'});await new Promise(r=>setImmediate(r));assert.equal(typeof finishHistory,'function');assert.equal(typeof finishPreview,'function');finishHistory({status:'success',closings:[]});finishPreview(preview('2026-10-14',true));await saved;assert.equal(c.state().latestPreview.alreadyClosed,true);
});
test('a day changed during preparation cannot submit a closing for the previous day',async()=>{
 let finish;const calls=[];const c=ui(p=>{calls.push(p.action);return new Promise(r=>finish=r);});const closing=c.closeDay();c.elements.closingDate.value='2026-10-15';c.invalidatePreview();finish(preview());await closing;assert.deepEqual(calls,['getDailyClosingPreview']);
});
test('history reads coalesce; failed refresh retains records and selection; fresh refresh follows an older read',async()=>{
 let fail=false,finish,calls=0;const c=ui(()=>{calls++;if(fail)return Promise.resolve({status:'error',message:'<script>private</script>'});return new Promise(r=>finish=r);});const first=c.loadClosings();assert.equal(c.loadClosings(),first);const fresh=c.loadClosings({fresh:true});finish({status:'success',closings:[{closingId:'old'}]});await first;await Promise.resolve();assert.equal(calls,2);finish({status:'success',closings:[{closingId:'old'}]});await fresh;fail=true;await c.loadClosings();assert.equal(c.state().closings.length,1);assert.deepEqual(Array.from(c.state().selected),['old']);assert.doesNotMatch(c.elements.closingsBody.innerHTML,/<script>/);
});
function backend(source,closed=false,manager=true){
 let formats=0;const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}),writes=[];
 const rows={DATA:[[],...Array.from({length:3000},(_,i)=>[new Date(i%2?'2026-10-14T10:00:00Z':'2026-10-13T20:00:00Z'),'Fixture','','Service','',100,100,10,['cash','visa','instapay','فودافون كاش'][i%4]])],EXPENSES:[[],['',15,'','',new Date('2026-10-14T12:00:00Z')]],WITHDRAWLS:[[],['',20,'',new Date('2026-10-14T12:00:00Z')]],DAILY_CLOSINGS:[[],...(closed?[['C1','2026-10-14',1,1,0,0,0,0,0,1,'owner','Fixture','Existing time']]:[])]};
 const sheets=Object.fromEntries(Object.entries(rows).map(([name,values])=>[name,{getLastRow:()=>values.length,getRange:(r,col,n,w)=>({getValues:()=>values.slice(r-1,r-1+n).map(row=>row.slice(col-1,col-1+w)),setValues:data=>writes.push({row:r,data})}),appendRow:data=>writes.push({data:[data]})}]));
 const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',SpreadsheetApp:{getActive:()=>({getSheetByName:name=>sheets[name]||null})},getSheetRangeFromRow2:(sheet,col,w)=>sheet.getRange(2,col,sheet.getLastRow()-1,w).getValues(),jsonOutput:x=>x,getDisplayDateTime:String,getRequestedDateKey:d=>d.date,requirePermission:()=>null,getActor:()=>({userName:'owner',displayName:'Fixture'}),actorCanManageUsers:()=>manager,getCairoDateTime:()=> 'Fixed time',logActivity:()=>{},Utilities:{getUuid:()=> 'NEW-ID',parseDate:key=>new Date(key+'T00:00:00'+(key>='2026-10-30'?'+02:00':'+03:00')),formatDate:value=>{formats++;const p=Object.fromEntries(fmt.formatToParts(value).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}}});
 vm.runInContext(fs.readFileSync('apps-script/production/061_shared_date-and-number.gs','utf8'),c);vm.runInContext(source,c);return {c,rows,sheets,writes,formats:()=>formats};
}
const oldSource=()=>cp.execFileSync('git',['show','c5206a9:apps-script/production/040_accounting_daily-closing.gs'],{encoding:'utf8'}),currentSource=()=>fs.readFileSync('apps-script/production/040_accounting_daily-closing.gs','utf8');
test('full daily preview matches all previous money and closed-day metadata with constant date conversion',()=>{
 for(const closed of [false,true]){const old=backend(oldSource(),closed),next=backend(currentSource(),closed);assert.deepEqual(JSON.parse(JSON.stringify(next.c.getDailyClosingPreview({date:'2026-10-14'}))),JSON.parse(JSON.stringify(old.c.getDailyClosingPreview({date:'2026-10-14'}))));assert.ok(next.formats()<10);assert.ok(old.formats()>3000);}
});
test('daily save and manager re-close retain authoritative amounts and ignore client preview',()=>{
 for(const [closed,manager] of [[false,true],[true,true],[true,false]]){const old=backend(oldSource(),closed,manager),next=backend(currentSource(),closed,manager),input={date:'2026-10-14',preview:{netTotal:999999}};assert.deepEqual(JSON.parse(JSON.stringify(next.c.closeDay(input))),JSON.parse(JSON.stringify(old.c.closeDay(input))));assert.deepEqual(JSON.parse(JSON.stringify(next.writes)),JSON.parse(JSON.stringify(old.writes)));if(closed&&!manager)assert.equal(next.writes.length,0);}
});
test('normalized midnight falls back without changing full preview money or metadata',()=>{
 const old=backend(oldSource(),true),next=backend(currentSource(),true);next.c.Utilities.parseDate=()=>new Date('2026-04-23T21:00:00Z');assert.deepEqual(JSON.parse(JSON.stringify(next.c.getDailyClosingPreview({date:'2026-10-14'}))),JSON.parse(JSON.stringify(old.c.getDailyClosingPreview({date:'2026-10-14'}))));assert.equal(next.c.buildCashierSummaryFromSheets.diagnostics.mode,'DATE_BOUNDARY_FALLBACK');
});

test('lookup formats saved metadata only for the selected day while complete history remains identical',()=>{
 const old=backend(oldSource()),next=backend(currentSource());let oldTimes=0,newTimes=0;
 for(const h of [old,next]){h.rows.DAILY_CLOSINGS.length=1;for(let i=0;i<44;i++)h.rows.DAILY_CLOSINGS.push(['C'+i,new Date(Date.UTC(2026,9,1+i,12)),100,100,0,0,0,0,0,100,'owner','Fixture',new Date('2026-10-14T12:00:00Z')]);}
 old.c.getDisplayDateTime=x=>{oldTimes++;return String(x);};next.c.getDisplayDateTime=x=>{newTimes++;return String(x);};
 assert.deepEqual(JSON.parse(JSON.stringify(next.c.findDailyClosingByDate('2026-10-14'))),JSON.parse(JSON.stringify(old.c.findDailyClosingByDate('2026-10-14'))));assert.equal(oldTimes,44);assert.equal(newTimes,1);
 assert.deepEqual(JSON.parse(JSON.stringify(next.c.readDailyClosings())),JSON.parse(JSON.stringify(old.c.readDailyClosings())));
});
