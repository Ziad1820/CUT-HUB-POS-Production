"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function invoiceEngine(source){let formats=0,dates=0;const rows=Array.from({length:3000},(_,i)=>['2026-10-13 10:00:00','Customer '+i,'Phone','Service','',100,100,0,'Cash','Staff','',0,0,'R'+i]);
 const c=vm.createContext({TIME_ZONE:'Africa/Cairo',jsonOutput:x=>x,getDateKey:x=>{dates++;return String(x).slice(0,10);},parseSheetAmount:x=>Number(x)||0});
 vm.runInContext(source,c);c.readInvoiceDataSnapshot=()=>({sheetFound:true,lastRow:3001,invoiceRequestIdColumn:14,rows});c.getDisplayDateTime=x=>{formats++;return String(x);};
 return {c,formats:()=>formats,dates:()=>dates};}
test('five recent invoices format five records, retaining total matches and pagination',()=>{
 const h=invoiceEngine(fs.readFileSync('apps-script/production/044_invoices_queries.gs','utf8'));const result=h.c.getInvoices({limit:5});
 assert.equal(h.formats(),5);assert.equal(h.dates(),5);assert.equal(result.totalMatches,3000);assert.equal(result.nextOffset,5);assert.equal(result.hasMore,true);assert.equal(result.invoices[0].invoiceRequestId,'R2999');
});
test('optimized invoice pages agree with previous runtime for combined filters and pagination',()=>{
 const cp=require('node:child_process'),old=cp.execFileSync('git',['show','91268bf:apps-script/production/044_invoices_queries.gs'],{encoding:'utf8'});
 const current=fs.readFileSync('apps-script/production/044_invoices_queries.gs','utf8');
 for(const input of [{limit:5},{limit:20,offset:40},{limit:5,search:'Customer 2',fromDate:'2026-10-13',toDate:'2026-10-14',barber:'Staff',payment:'Cash'},{date:'2026-10-14'}]){
  assert.deepEqual(JSON.parse(JSON.stringify(invoiceEngine(current).c.getInvoices(input))),JSON.parse(JSON.stringify(invoiceEngine(old).c.getInvoices(input))));
 }
});
test('catalog loaders share one request and release it for a later refresh',async()=>{
 const source=fs.readFileSync(process.env.CUT_HUB_CASHIER_SOURCE_OVERRIDE||'public/assets/js/pages/cashier.js','utf8');let calls=0,finish;
 const c=vm.createContext({RomeoApi:{request:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}}});
 vm.runInContext('let cashierCatalogRequest=null;'+source.match(/    function loadCashierCatalog\(\) \{[\s\S]*?\n    \}/)[0],c);
 const first=c.loadCashierCatalog(),second=c.loadCashierCatalog();assert.equal(first,second);assert.equal(calls,1);finish({status:'success'});await first;c.loadCashierCatalog();assert.equal(calls,2);finish({});
});
test('catalog never accepts permission data supplied in the request body',()=>{
 const c=vm.createContext({jsonOutput:x=>x});vm.runInContext(fs.readFileSync('apps-script/production/030_staff_branch-repository.gs','utf8'),c);
 assert.equal(c.getCashierCatalog({user:{username:'owner'},permissions:['access_cashier']},null).code,'PERMISSION_DENIED');
 let reads=0;c.getStaff=()=>{reads++;return {status:'success',staff:[]};};c.getServices=()=>{reads++;return {status:'success',services:[]};};
 assert.equal(c.getCashierCatalog({}, {user:{username:'cashier'},permissions:['access_cashier']}).status,'success');assert.equal(reads,2);
});
test('cashier totals skip closing history and retain all financial numbers',()=>{
 const c=vm.createContext({jsonOutput:x=>x,getRequestedDateKey:()=> '2026-10-13',cashierContextAllows:x=>!!x?.user,TIME_ZONE:'Africa/Cairo'});
 vm.runInContext(fs.readFileSync('apps-script/production/040_accounting_daily-closing.gs','utf8'),c);
 c.calculateSalesAndPaymentTotals=()=>({salesTotal:100,tipTotal:20,cashTotal:120});c.calculateExpensesTotal=()=>10;c.calculateWithdrawalsTotal=()=>15;let closings=0;c.findDailyClosingByDate=()=>{closings++;return {closingId:'C1'};};
 const summary=c.getDailyClosingPreview({cashierSummary:true},{user:{username:'owner'}});assert.equal(summary.preview.netTotal,95);assert.equal(closings,0);assert.equal(summary.preview.alreadyClosed,undefined);
 const full=c.getDailyClosingPreview({});assert.equal(full.preview.netTotal,95);assert.equal(closings,1);assert.equal(full.preview.alreadyClosed,true);
});
test('cashier summary uses bounded native reads and two Cairo midnights including a DST day',()=>{
 const start=Date.parse('2026-04-23T22:00:00Z'),end=Date.parse('2026-04-24T21:00:00Z');
 let reads=0,parses=0,stringDates=0;
 const data={DATA:[[new Date(start),'','','','',100,100,20,'cash'],[new Date(end-1),'','','','',50,50,5,'visa'],[new Date(end),'','','','',999,999,0,'cash'],['2026-04-24','','','','',30,30,0,'instapay']],EXPENSES:[['',10,'','',new Date(start)]],WITHDRAWLS:[['',15,'',new Date(start)]]};
 const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',getDateKey:x=>{stringDates++;return String(x).slice(0,10);},parseSheetAmount:x=>Number(x)||0,
 Utilities:{parseDate:key=>{parses++;return new Date(key==='2026-04-24'?start:end);}},
 Sheets:{Spreadsheets:{get:()=>{throw Error('Advanced grid reads must not run');}}},
 SpreadsheetApp:{getActive:()=>({getSheetByName:name=>({getLastRow:()=>data[name].length+1,getRange:(r,col,count,width)=>{assert.equal(r,2);assert.equal(col,1);assert.equal(count,data[name].length);assert.equal(width,name==='DATA'?9:name==='EXPENSES'?5:4);reads++;return {getValues:()=>data[name]};}})})}});
 vm.runInContext(fs.readFileSync('apps-script/production/040_accounting_daily-closing.gs','utf8'),c);c.normalizePaymentMethod=x=>x;
 const summary=c.buildCashierSummaryFromSheets('2026-04-24');assert.equal(reads,3);assert.equal(parses,2);assert.equal(stringDates,1);
 assert.equal(summary.salesTotal,180);assert.equal(summary.cashTotal,120);assert.equal(summary.visaTotal,55);assert.equal(summary.instapayTotal,30);assert.equal(summary.expensesTotal,10);assert.equal(summary.withdrawalsTotal,15);assert.equal(summary.netTotal,180);assert.equal(c.buildCashierSummaryFromSheets.diagnostics.mode,'ROWS');
});
test('native read failures fall back to the existing calculation rather than returning partial totals',()=>{
 const c=vm.createContext({Date,TIME_ZONE:'Africa/Cairo',Utilities:{parseDate:key=>new Date(key)},SpreadsheetApp:{getActive:()=>{throw Error('Unavailable');}}});
 vm.runInContext(fs.readFileSync('apps-script/production/040_accounting_daily-closing.gs','utf8'),c);assert.equal(c.buildCashierSummaryFromSheets('2026-10-13'),null);assert.equal(c.buildCashierSummaryFromSheets.diagnostics.mode,'ROWS_FALLBACK');
});
test('catalog recent invoice projection fixes the limit and cannot be expanded by client filters',()=>{
 const c=vm.createContext({jsonOutput:x=>x});vm.runInContext(fs.readFileSync('apps-script/production/030_staff_branch-repository.gs','utf8'),c);
 c.getStaff=()=>({status:'success',staff:[]});c.getServices=()=>({status:'success',services:[]});let input;
 c.getInvoices=x=>{input=JSON.parse(JSON.stringify(x));return {status:'success',invoices:[{invoiceRequestId:'R1'}]};};
 const result=c.getCashierCatalog({includeRecentInvoices:true,limit:999,offset:50,filters:{search:'x'}},{user:{username:'owner'}});
 assert.deepEqual(input,{limit:5,offset:0,filters:{}});assert.equal(result.recentInvoices.invoices[0].invoiceRequestId,'R1');
 c.getInvoices=()=>{throw Error('Temporary read failure');};assert.equal(c.getCashierCatalog({includeRecentInvoices:true},{user:{username:'owner'}}).status,'success');
});
