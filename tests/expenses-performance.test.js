"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rows=[{expenseId:'E1',category:'Supplies',amount:100.125,date:'2026-10-15',title:'Fixture'},{expenseId:'E2',category:'Rent',amount:50,date:'2026-10-14'},{expenseId:'E3',category:'OTH',amount:0.1,date:'2026-10-10'}];
const page=(expenses=rows)=>({status:'success',expenses});
function ui(request){
 const source=fs.readFileSync(process.env.CUT_HUB_EXPENSES_SOURCE_OVERRIDE||'public/assets/js/pages/expenses.js','utf8'),elements={};
 const element=()=>({value:'',textContent:'',innerHTML:'',disabled:false,appendChild(){},addEventListener(){},querySelectorAll:()=>[],classList:{add(){},remove(){}}});
 const document={getElementById:id=>elements[id]||(elements[id]=element()),querySelectorAll:()=>[],createElement:element,body:{dataset:{language:'ar'}}};
 const c=vm.createContext({document,RomeoApi:{request},RomeoAuth:{requireAuth(){}},RomeoDateRange:{today:()=> '2026-10-15',setCurrentMonth:(a,b)=>{a.value='2026-10-01';b.value='2026-10-31';},validate:(a,b)=>({ok:!!a&&!!b&&a<=b,fromDate:a,toDate:b})},window:{location:{search:''}},localStorage:{getItem:()=>null},URLSearchParams,console:{info(){},error(){}},alert(){},confirm:()=>true,elements});
 vm.runInContext(source.slice(0,source.indexOf('    document.querySelectorAll(".sidebar-link[data-permission]"'))+'function inspect(){return {expenseList,loadedExpenseRange,expensesFresh,selected:[...selectedExpenseIds],expenseWriteActive};}',c);return c;
}
test('one initial expense read and repeated concurrent range requests share a result',async()=>{
 let finish,calls=0;const c=ui(()=>{calls++;return new Promise(r=>finish=r);});const first=c.loadExpensesFromSheet();assert.equal(c.loadExpensesFromSheet(),first);assert.equal(c.elements.saveBtn.disabled,true);finish(page());assert.equal(await first,true);assert.equal(calls,1);assert.equal(c.elements.saveBtn.disabled,false);
});
test('money rounding, category matching, counts and average preserve existing expense semantics',async()=>{
 const c=ui(async()=>page());await c.loadExpensesFromSheet();assert.equal(c.elements.allExpenses.textContent,'150.23');assert.equal(c.elements.averageExpense.textContent,'50.08');assert.equal(c.elements.categoryExpenses.textContent,'100.13');assert.equal(c.elements.categoryRecords.textContent,1);
 for(const [category,total]of [['rent','50'],['other','0.1']]){vm.runInContext('selectedCategoryId='+JSON.stringify(category),c);c.renderAll();assert.equal(c.elements.categoryExpenses.textContent,total);assert.equal(c.elements.categoryRecords.textContent,1);}
 assert.equal(c.getExpenseCategoryId('مستلزمات'),'supplies');assert.equal(c.getExpenseCategoryId('unknown'),'supplies');
});
test('only newest queued period executes and old responses cannot publish',async()=>{
 let finish;const calls=[],c=ui(p=>{calls.push(p);return new Promise(r=>finish=r);});let first=c.loadExpensesFromSheet();finish(page());await first;
 first=c.loadExpensesFromSheet();const oldFinish=finish;c.elements.filterFromDate.value='2026-10-02';const superseded=c.loadExpensesFromSheet();c.elements.filterFromDate.value='2026-10-03';const latest=c.loadExpensesFromSheet();assert.equal(await superseded,false);oldFinish(page([]));assert.equal(await first,false);assert.equal(c.inspect().expenseList.length,3);assert.equal(calls.at(-1).fromDate,'2026-10-03');finish(page());await latest;assert.equal(c.inspect().loadedExpenseRange.fromDate,'2026-10-03');
});
test('failed or invalid period retains last money and selection and never displays provider details',async()=>{
 let fail=false;const c=ui(async()=>fail?{status:'error',message:'private-provider-details'}:page());await c.loadExpensesFromSheet();vm.runInContext('selectedExpenseIds.add("E1")',c);fail=true;await c.loadExpensesFromSheet();assert.equal(c.elements.allExpenses.textContent,'150.23');assert.deepEqual(Array.from(c.inspect().selected),['E1']);assert.doesNotMatch(c.elements.expenseStatus.textContent,/private-provider/);
 c.elements.filterFromDate.value='2026-11-01';c.renderAll();assert.equal(c.elements.allExpenses.textContent,'150.23');assert.equal(await c.loadExpensesFromSheet(),false);assert.equal(c.inspect().expenseList.length,3);
});
test('category draft survives rerender and Cairo date is used when clearing the form',async()=>{
 const c=ui(async()=>page());await c.loadExpensesFromSheet();c.elements.expenseCategory.value='rent';c.elements.expenseTitle.value='Draft';c.renderAll();assert.equal(c.elements.expenseCategory.value,'rent');assert.equal(c.elements.expenseTitle.value,'Draft');c.clearForm();assert.equal(c.elements.expenseDate.value,'2026-10-15');
});
test('synthetic save cannot overlap another save/delete and refreshes once without replay',async()=>{
 let finish,writes=0,reads=0;const c=ui(p=>p.action==='expense'?(writes++,new Promise(r=>finish=r)):(reads++,Promise.resolve(page())));await c.loadExpensesFromSheet();c.elements.expenseAmount.value='75';const saving=c.addExpenseLocalized();await c.addExpenseLocalized();await c.deleteExpenseLocalized('E1');assert.equal(writes,1);finish({status:'success'});await saving;assert.equal(reads,2);assert.equal(c.inspect().expenseWriteActive,false);assert.equal(c.elements.expenseAmount.value,'');
});
test('uncertain save is not replayed and failed reconciliation blocks further writes',async()=>{
 let writes=0,reads=0;const c=ui(p=>{if(p.action==='expense'){writes++;return Promise.reject(Error('uncertain'));}return Promise.resolve(reads++?{status:'error'}:page());});await c.loadExpensesFromSheet();c.elements.expenseAmount.value='75';await c.addExpenseLocalized();await c.addExpenseLocalized();assert.equal(writes,1);assert.equal(c.elements.expenseAmount.value,'75');assert.equal(c.elements.saveBtn.disabled,true);assert.equal(c.elements.allExpenses.textContent,'150.23');
});
test('partial bulk deletion stops, refreshes authoritative history and never retries deleted entries',async()=>{
 let deletes=0,reads=0;const c=ui(p=>p.action==='deleteExpense'?(deletes++,Promise.resolve(deletes===2?{status:'error'}:{status:'success'})):(reads++,Promise.resolve(page([{...rows[0],expenseId:'E1'},{...rows[0],expenseId:'E4'},{...rows[0],expenseId:'E5'}]))));await c.loadExpensesFromSheet();vm.runInContext('selectedExpenseIds=new Set(["E1","E4","E5"])',c);await c.deleteSelectedExpenses();assert.equal(deletes,2);assert.equal(reads,2);assert.equal(c.inspect().expenseWriteActive,false);
});
test('already missing delete reconciles once and empty successful history is authoritative zero',async()=>{
 let reads=0;const c=ui(p=>Promise.resolve(p.action==='deleteExpense'?{status:'error',message:'Expense not found'}:page(reads++?[]:rows)));await c.loadExpensesFromSheet();await c.deleteExpenseLocalized('E1');assert.equal(reads,2);assert.equal(c.inspect().expenseList.length,0);assert.equal(c.elements.allExpenses.textContent,'0');
});

function backend(source,rows){
 let formats=0;const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'});
 const dateKey=value=>{if(value instanceof Date){formats++;if(isNaN(value))return '';const p=Object.fromEntries(formatter.formatToParts(value).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day;}return String(value||'').slice(0,10);};
 const sheet={getLastRow:()=>rows.length+1,getRange:()=>({getValues:()=>rows})};
 const c=vm.createContext({Date,SpreadsheetApp:{getActive:()=>({getSheetByName:()=>sheet})},jsonOutput:x=>x,TIME_ZONE:'Africa/Cairo',getDateKey:dateKey,parseSheetAmount:x=>Number(x)||0,Utilities:{parseDate:key=>new Date(key+'T00:00:00'+(key<'2026-04-24'||key>'2026-10-29'?'+02:00':'+03:00'))}});
 vm.runInContext(fs.readFileSync('apps-script/production/044_invoices_queries.gs','utf8')+source,c);return {c,formats:()=>formats};
}
test('optimized backend preserves original expense rows, identity, dates, ordering and amounts',()=>{
 const original=fs.readFileSync('apps-script/production/baseline/047_accounting_expenses.js','utf8'),current=fs.readFileSync('apps-script/production/047_accounting_expenses.gs','utf8');
 const data=Array.from({length:2000},(_,i)=>['Supplies',i+0.1,'Fixture','',new Date(i%2?'2026-09-13T21:30:00Z':'2026-10-13T22:30:00Z'),'E'+i]);
 data.push(['Rent',15,'Text','', '2026-10-15',''],['Other',20,'Missing date','','','EMPTY']);
 for(const range of [{fromDate:'2026-10-01',toDate:'2026-10-31'},{fromDate:'2026-10-15',toDate:'2026-10-15'},{},{fromDate:'2026-11-01',toDate:'2026-10-01'}]){
  const old=backend(original,data),next=backend(current,data);assert.deepEqual(JSON.parse(JSON.stringify(next.c.getExpenses(range))),JSON.parse(JSON.stringify(old.c.getExpenses(range))));
  if(range.fromDate==='2026-10-01'){assert.ok(next.formats()<10);assert.ok(old.formats()>=2000);}
 }
});
test('repeated Cairo hour and normalized midnight preserve legacy date membership',()=>{
 const original=fs.readFileSync('apps-script/production/baseline/047_accounting_expenses.js','utf8'),current=fs.readFileSync('apps-script/production/047_accounting_expenses.gs','utf8');
 const data=['2026-10-29T20:59:59Z','2026-10-29T21:30:00Z','2026-10-29T22:00:00Z'].map((t,i)=>['Supplies',10,'Fixture','',new Date(t),'E'+i]);
 const old=backend(original,data),next=backend(current,data),range={fromDate:'2026-10-29',toDate:'2026-10-29'};
 assert.deepEqual(JSON.parse(JSON.stringify(next.c.getExpenses(range))),JSON.parse(JSON.stringify(old.c.getExpenses(range))));assert.equal(next.c.getExpenses(range).expenses.length,2);
 next.c.Utilities.parseDate=()=>new Date('2026-04-23T21:00:00Z');assert.deepEqual(JSON.parse(JSON.stringify(next.c.getExpenses(range))),JSON.parse(JSON.stringify(old.c.getExpenses(range))));
});

test('expense manual retry keeps the operation ID until a confirmed success',async()=>{
 const writes=[];const c=ui(async p=>{if(p.action==='expense'){writes.push(p);if(writes.length===1)throw Error('lost response');return {status:'success'};}return page();});
 await c.loadExpensesFromSheet();c.elements.expenseAmount.value='75';await c.addExpenseLocalized();await c.addExpenseLocalized();
 assert.equal(writes.length,2);assert.equal(writes[0].expenseId,writes[1].expenseId);
 c.elements.expenseAmount.value='75';await c.addExpenseLocalized();assert.notEqual(writes[1].expenseId,writes[2].expenseId);
});
