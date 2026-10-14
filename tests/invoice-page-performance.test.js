"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
function setup(request){
 let filters={};
 const source=fs.readFileSync(process.env.CUT_HUB_INVOICES_SOURCE_OVERRIDE||'public/assets/js/pages/invoices.js','utf8');
 const start=source.indexOf('    function updateLoadMoreUi()'),end=source.indexOf('    function renderBarberOptions()',start);
 const elements={reloadBtn:{},loadMoreBtn:{},invoiceRows:{innerHTML:''}};
 const c=vm.createContext({window:{clearTimeout(){}},elements,RomeoApi:{request},localizeText:ar=>ar,escapeHtml:String,
  console:{error(){}},getServerFilters:()=>({...filters}),renderBarberOptions(){},renderPaymentOptions(){},pruneSelectedInvoices(){},
  renderSummary:items=>{elements.summary=items.reduce((sum,i)=>sum+i.total,0);},
  renderRows:()=>{elements.invoiceRows.innerHTML='<tr><td>Existing invoice</td></tr>';},PAGE_SIZE:25});
 vm.runInContext(`let invoices=[{invoiceId:'old',total:120}];let filteredInvoices=invoices;let nextOffset=25;
 let hasMoreInvoices=true;let totalMatches=100;let filterOptions={};let filterTimer=null;const selectedInvoiceIds=new Set(['old']);
 ${source.slice(start,end)}
 function state(){return {invoices,nextOffset,hasMoreInvoices,totalMatches,selected:[...selectedInvoiceIds]};}`,c);
 return {c,elements,setFilters:value=>{filters=value;}};
}

function page(id){return {status:'success',invoices:[{invoiceId:id,total:80}],nextOffset:25,totalMatches:100,hasMore:true};}
test('duplicate reads share the same request and append a page once',async()=>{
 let resolve,calls=0;const h=setup(()=>{calls++;return new Promise(r=>resolve=r);});
 const a=h.c.loadInvoices({append:true}),b=h.c.loadInvoices({append:true});assert.equal(a,b);assert.equal(calls,1);resolve(page('next'));await a;assert.equal(h.c.state().invoices.length,2);
});
test('rapid filter changes keep only the newest pending read and reject the obsolete response',async()=>{
 const calls=[],finishes=[];const h=setup(payload=>{calls.push(payload);return new Promise(r=>finishes.push(r));});
 const first=h.c.loadInvoices();h.setFilters({search:'A'});const obsolete=h.c.loadInvoices();h.setFilters({search:'B'});const latest=h.c.loadInvoices();
 assert.equal(calls.length,1);await obsolete;finishes[0](page('stale'));await first;assert.equal(calls.length,2);assert.equal(calls[1].filters.search,'B');assert.equal(h.c.state().invoices[0].invoiceId,'old');assert.equal(h.elements.reloadBtn.disabled,true);
 finishes[1](page('fresh'));await latest;assert.equal(h.c.state().invoices[0].invoiceId,'fresh');assert.equal(h.elements.reloadBtn.disabled,false);
});
test('changing filters while loading more cannot append an obsolete page or clear current selection',async()=>{
 const finishes=[];const h=setup(()=>new Promise(r=>finishes.push(r)));const more=h.c.loadInvoices({append:true});h.setFilters({payment:'Visa'});const filtered=h.c.loadInvoices();
 finishes[0](page('stale-page'));await more;assert.equal(h.c.state().invoices.length,1);assert.deepEqual(Array.from(h.c.state().selected),['old']);finishes[1](page('filtered'));await filtered;assert.equal(h.c.state().invoices.length,1);assert.equal(h.c.state().invoices[0].invoiceId,'filtered');
});
test('failed refresh preserves existing rows, money, selection and cursor without replay',async()=>{
 let calls=0;const h=setup(async()=>{calls++;throw Error('Temporary service failure');});await h.c.loadInvoices();assert.equal(calls,1);assert.equal(h.c.state().invoices[0].invoiceId,'old');assert.equal(h.c.state().nextOffset,25);assert.equal(h.elements.summary,120);assert.deepEqual(Array.from(h.c.state().selected),['old']);assert.equal(h.elements.reloadBtn.disabled,false);
});
function backend(source,overrideRows){
 let formats=0,parses=0;const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'});
 function dateKey(value){if(value instanceof Date){formats++;const parts=Object.fromEntries(formatter.formatToParts(value).map(p=>[p.type,p.value]));return parts.year+'-'+parts.month+'-'+parts.day;}return String(value||'').slice(0,10);}
 const rows=Array.from({length:3000},(_,i)=>[new Date(i%2?'2026-10-13T21:30:00Z':'2026-10-12T22:30:00Z'),'Customer '+i,'Phone','Service','',100,100,0,'Cash','Staff','',0,0,'R'+i]);rows.push(['2026-10-13 09:00','Text Date','','Service','',50,50,10,'Visa','Other','',0,0,'TEXT']);
 const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',jsonOutput:x=>x,getDateKey:dateKey,parseSheetAmount:x=>Number(x)||0,Utilities:{parseDate:key=>{parses++;return new Date(key+'T00:00:00+03:00');}}});vm.runInContext(source,c);c.readInvoiceDataSnapshot=()=>({sheetFound:true,lastRow:rows.length+1,invoiceRequestIdColumn:14,rows:overrideRows||rows});c.getDisplayDateTime=x=>x instanceof Date?x.toISOString():String(x);
 return {c,formats:()=>formats,parses:()=>parses};
}
test('date-filtered invoice pages retain previous monetary results and avoid per-row date formatting',()=>{
 const previous=cp.execFileSync('git',['show','3026ea2:apps-script/production/044_invoices_queries.gs'],{encoding:'utf8'}),current=fs.readFileSync('apps-script/production/044_invoices_queries.gs','utf8');
 for(const filters of [{fromDate:'2026-10-13'},{toDate:'2026-10-13'},{date:'2026-10-13'},{fromDate:'2026-10-13',toDate:'2026-10-14',barber:'Staff',payment:'Cash',search:'Customer 2'},{date:'invalid'},{fromDate:'2026-10-14',toDate:'2026-10-13'}]){
 const old=backend(previous),next=backend(current);const input={filters,offset:5,limit:25};assert.deepEqual(JSON.parse(JSON.stringify(next.c.getInvoices(input))),JSON.parse(JSON.stringify(old.c.getInvoices(input))));
 if(filters.fromDate==='2026-10-13'&&!filters.search){assert.ok(next.formats()<40);assert.ok(old.formats()>2900);assert.ok(next.parses()<=2);}
 }
});

test('Cairo repeated-hour invoices stay on their calendar day and normalized gaps retain legacy filtering',()=>{
 const oldSource=cp.execFileSync('git',['show','3026ea2:apps-script/production/044_invoices_queries.gs'],{encoding:'utf8'}),source=fs.readFileSync('apps-script/production/044_invoices_queries.gs','utf8');
 const rows=['2026-10-29T20:59:59Z','2026-10-29T21:30:00Z','2026-10-29T22:00:00Z'].map((date,i)=>[new Date(date),'Fixture','','Service','',100,100,0,'Cash','Staff','',0,0,'R'+i]);
 const old=backend(oldSource,rows),next=backend(source,rows);next.c.Utilities.parseDate=key=>new Date(key+'T00:00:00'+(key==='2026-10-29'?'+03:00':'+02:00'));
 const input={filters:{date:'2026-10-29'},limit:25};assert.deepEqual(JSON.parse(JSON.stringify(next.c.getInvoices(input))),JSON.parse(JSON.stringify(old.c.getInvoices(input))));assert.equal(next.c.getInvoices(input).totalMatches,2);
 next.c.Utilities.parseDate=()=>new Date('2026-04-23T21:00:00Z');assert.deepEqual(JSON.parse(JSON.stringify(next.c.getInvoices(input))),JSON.parse(JSON.stringify(old.c.getInvoices(input))));
});

test('opt-in page timing includes the pending read wait and logs no filter or invoice data',async()=>{
 let clock=100;const finishes=[],logs=[];const h=setup(()=>new Promise(r=>finishes.push(r)));h.c.Date={now:()=>clock};h.c.window.location={search:'?performance=1'};h.c.URLSearchParams=URLSearchParams;h.c.console.info=message=>logs.push(JSON.parse(message.slice(message.indexOf('{'))));
 const first=h.c.loadInvoices();clock=200;h.setFilters({search:'PRIVATE_FILTER'});const latest=h.c.loadInvoices();clock=300;finishes[0](page('old'));await first;clock=800;finishes[1](page('new'));await latest;
 assert.equal(logs.length,1);assert.deepEqual(logs[0],{operation:'refresh',totalMs:600,outcome:'success'});assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_FILTER|invoiceId/);
});
