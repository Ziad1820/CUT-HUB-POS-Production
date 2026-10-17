"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
function ui(request){
 const source=fs.readFileSync(process.env.CUT_HUB_INCOME_SOURCE_OVERRIDE||'public/pages/income-statement.html','utf8');
 const c=vm.createContext({RomeoApi:{request},fromDateInput:{value:'2026-10-01'},toDateInput:{value:'2026-10-31'},monthLockBtn:{},isOwner:true,window:{location:{search:''}},URLSearchParams,console:{error(){},info(){}},localize:ar=>ar,
 monthlyClosingsBody:{innerHTML:'previous closings',querySelectorAll:()=>[]}});
 vm.runInContext('let rendered=[];let statuses=[];let monthlyClosings=[];function renderSummary(x){rendered.push(x);}function setStatus(x,type){statuses.push({message:x,type});}function renderClosings(x){monthlyClosings=x;monthlyClosingsBody.innerHTML="existing closings";}'+
 source.slice(source.indexOf('    let statementReadSequence'),source.indexOf('    function getMonthKey()'))+
 source.slice(source.indexOf('    let closingsRead'),source.indexOf('    async function deleteMonthlyClosing'))+
 'function state(){return {rendered,statuses,monthlyClosings};}',c);return c;
}
const ok=value=>({status:'success',totalIncome:value});
test('income repeated clicks share one read and newest queued range replaces intermediate choices',async()=>{
 const finishes=[],calls=[];const c=ui(p=>{calls.push(p);return new Promise(r=>finishes.push(r));});
 const first=c.loadStatement();assert.equal(c.loadStatement(),first);c.fromDateInput.value='2026-10-02';const replaced=c.loadStatement();c.fromDateInput.value='2026-10-03';const latest=c.loadStatement();await replaced;
 assert.equal(calls.length,1);finishes[0](ok(999));await first;assert.equal(c.state().rendered.length,0);assert.equal(calls.length,2);assert.equal(calls[1].fromDate,'2026-10-03');finishes[1](ok(100));await latest;assert.equal(c.state().rendered[0].totalIncome,100);assert.equal(c.monthLockBtn.disabled,false);
});
test('failed income refresh retains the last successful amounts and never presents an empty success',async()=>{
 let fail=false;const c=ui(async()=>fail?{status:'error',message:'Unavailable'}:ok(240));await c.loadStatement();fail=true;await c.loadStatement();assert.equal(c.state().rendered.length,1);assert.equal(c.state().rendered[0].totalIncome,240);assert.equal(c.state().statuses.at(-1).type,'error');assert.equal(c.monthLockBtn.disabled,true);
});
test('invalid or edited date range cannot publish an older successful result',async()=>{
 let finish;const c=ui(()=>new Promise(r=>finish=r));const pending=c.loadStatement();c.fromDateInput.value='2026-11-01';await c.loadStatement();finish(ok(999));await pending;assert.equal(c.state().rendered.length,0);assert.equal(c.state().statuses.at(-1).type,'error');
 const d=ui(()=>new Promise(r=>finish=r));const edited=d.loadStatement();d.fromDateInput.value='2026-10-02';finish(ok(999));await edited;assert.equal(d.state().rendered.length,0);assert.match(d.state().statuses.at(-1).message,/تطبيق/);
});
test('closing refresh is single flight but refresh after a completed mutation gets a fresh read',async()=>{
 const finishes=[];let calls=0;const c=ui(()=>{calls++;return new Promise(r=>finishes.push(r));});const first=c.loadClosings();assert.equal(c.loadClosings(),first);const fresh=c.loadClosings({fresh:true});assert.equal(calls,1);finishes[0]({status:'success',closings:[{month:'old'}]});await first;await Promise.resolve();assert.equal(calls,2);finishes[1]({status:'success',closings:[{month:'new'}]});await fresh;assert.equal(c.state().monthlyClosings[0].month,'new');
});
test('closing read failure retains records and does not expose server text as HTML',async()=>{
 let fail=false;const c=ui(async()=>fail?{status:'error',message:'<img src=x onerror=bad()>'}:{status:'success',closings:[{month:'old'}]});await c.loadClosings();fail=true;await c.loadClosings();assert.equal(c.state().monthlyClosings[0].month,'old');assert.match(c.monthlyClosingsBody.innerHTML,/existing closings/);assert.doesNotMatch(c.monthlyClosingsBody.innerHTML,/onerror/);
});
function backend(source){
 let formats=0,parses=0,reads=0;const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'});
 const data={DATA:Array.from({length:3000},(_,i)=>[new Date(i%2?'2026-10-13T21:30:00Z':'2026-10-12T22:30:00Z'),'Fixture '+i,'phone-'+i,'Service','',i%2?'100.50':100,100,10,['cash','visa','instapay','vodafone_cash'][i%4],'Staff','',0]),EXPENSES:[['',15,'','',new Date('2026-10-13T12:00:00Z')],['','5.50','','','2026-10-14']],WITHDRAWLS:[['',20,'',new Date('2026-10-13T23:00:00Z')]],MONTHLY_CLOSINGS:[]};
 data.DATA.push(['2026-10-13 10:00','String Customer','phone-0','Service','',50,50,5,'cash','Staff']);
 const writes=[];const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',jsonOutput:x=>x,SpreadsheetApp:{getActive:()=>({getSheetByName:name=>data[name]?{name,rows:data[name],getLastRow:()=>data[name].length+1,getRange:()=>({getValues:()=>{reads++;return data[name];}}),appendRow:row=>writes.push(row)}:null})},getSheetRangeFromRow2:sheet=>{reads++;return sheet.rows;},normalizePaymentMethod:x=>x,Utilities:{parseDate:key=>{parses++;return new Date(key+'T00:00:00'+(key>='2026-10-30'?'+02:00':'+03:00'));},formatDate:value=>{formats++;const p=Object.fromEntries(formatter.formatToParts(value).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;}},actorCanManageUsers:()=>true,getActor:()=>({displayName:'Fixture'}),getCairoDateTime:()=> 'Fixture date',logActivity:()=>{},getDisplayDateTime:x=>String(x)});
 vm.runInContext(fs.readFileSync('apps-script/production/061_shared_date-and-number.gs','utf8'),c);vm.runInContext(fs.readFileSync('apps-script/production/042_invoices_schema.gs','utf8'),c);vm.runInContext(source,c);return {c,data,writes,formats:()=>formats,parses:()=>parses,reads:()=>reads};
}
const oldSource=()=>cp.execFileSync('git',['show','fd8b2d6:apps-script/production/041_accounting_monthly-closing.gs'],{encoding:'utf8'});
const currentSource=()=>fs.readFileSync('apps-script/production/041_accounting_monthly-closing.gs','utf8');
test('income results match every prior monetary and count field while date formatting is constant',()=>{
 for(const range of [['2026-10-01','2026-10-31'],['2026-10-13','2026-10-13'],['2026-10-14','2026-10-14'],['2026-11-01','2026-11-02']]){
 const old=backend(oldSource()),next=backend(currentSource());assert.deepEqual(legacy(next.c.calculateIncomeStatementRange(...range)),legacy(old.c.calculateIncomeStatementRange(...range)));assert.equal(next.reads(),3);assert.ok(next.formats()<=2);assert.equal(next.parses(),2);assert.ok(old.formats()>3000);
 }
});
test('Cairo repeated hour, mixed string dates, absent sheets and bad boundaries preserve prior results',()=>{
 const old=backend(oldSource()),next=backend(currentSource());for(const h of [old,next]){h.data.DATA=[['2026-10-29','','P','', '',10,10,0,'cash'],...['2026-10-29T20:59:59Z','2026-10-29T21:30:00Z','2026-10-29T22:00:00Z'].map(date=>[new Date(date),'Fixture','Phone','','',100,100,0,'cash'])];delete h.data.EXPENSES;delete h.data.WITHDRAWLS;}
 assert.deepEqual(legacy(next.c.calculateIncomeStatementRange('2026-10-29','2026-10-29')),legacy(old.c.calculateIncomeStatementRange('2026-10-29','2026-10-29')));assert.equal(next.c.calculateIncomeStatementRange('2026-10-29','2026-10-29').invoiceCount,3);
 next.c.Utilities.parseDate=()=>new Date('2026-04-23T21:00:00Z');assert.deepEqual(legacy(next.c.calculateIncomeStatementRange('2026-10-29','2026-10-29')),legacy(old.c.calculateIncomeStatementRange('2026-10-29','2026-10-29')));
 assert.throws(()=>next.c.calculateIncomeStatementRange('','2026-10-29'));assert.throws(()=>next.c.calculateIncomeStatementRange('2026-10-30','2026-10-29'));
});
test('monthly lock still calculates authoritative amounts and ignores a client-provided summary',()=>{
 const old=backend(oldSource()),next=backend(currentSource()),input={month:'2026-10',fromDate:'2026-10-01',toDate:'2026-10-31',summary:{netProfit:999999}};
 assert.deepEqual(legacy(next.c.monthLock(input)),legacy(old.c.monthLock(input)));assert.deepEqual(legacy(next.writes.map(row=>row.slice(0,9))),legacy(old.writes));assert.notEqual(next.writes[0][6],999999);
});

// Preserve comparisons of all pre-existing fields; payment breakdowns have separate feature tests.
function legacy(value){return JSON.parse(JSON.stringify(value,(key,item)=>["paymentMethod","paymentBalances","paymentReceipts","expensePayments","withdrawalPayments"].includes(key)?undefined:item));}
