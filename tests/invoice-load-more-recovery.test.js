"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(request){
 const source=fs.readFileSync(process.env.CUT_HUB_INVOICES_SOURCE_OVERRIDE||'public/assets/js/pages/invoices.js','utf8');
 const start=source.indexOf('    function updateLoadMoreUi()'),end=source.indexOf('    function renderBarberOptions()',start);
 const elements={reloadBtn:{},loadMoreBtn:{},invoiceRows:{innerHTML:''}};
 const c=vm.createContext({elements,RomeoApi:{request},localizeText:ar=>ar,escapeHtml:String,
  console:{error(){}},getServerFilters:()=>({}),renderBarberOptions(){},renderPaymentOptions(){},pruneSelectedInvoices(){},
  renderSummary:items=>{elements.summary=items.reduce((sum,i)=>sum+i.total,0);},
  renderRows:()=>{elements.invoiceRows.innerHTML='<tr><td>Existing invoice</td></tr>';},PAGE_SIZE:25});
 vm.runInContext(`let invoices=[{invoiceId:'old',total:120}];let filteredInvoices=invoices;let nextOffset=25;
 let hasMoreInvoices=true;let totalMatches=100;let filterOptions={};let filterTimer=null;const selectedInvoiceIds=new Set(['old']);
 ${source.slice(start,end)}
 function state(){return {invoices,nextOffset,hasMoreInvoices,totalMatches,selected:[...selectedInvoiceIds]};}`,c);
 return {c,elements};
}
test('failed load more retains rows, totals, selection and the cursor; manual retry appends the same page once',async()=>{
 const calls=[];let fail=true;
 const h=setup(async payload=>{
  calls.push(payload.offset);
  if(fail)return {status:'error',message:'Service Spreadsheets failed while accessing document with id PRIVATE_DOCUMENT.'};
  return {status:'success',invoices:[{invoiceId:'new',total:80}],nextOffset:50,totalMatches:100,hasMore:true};
 });
 await h.c.loadInvoices({append:true});
 let state=h.c.state();assert.equal(state.invoices.length,1);assert.equal(state.nextOffset,25);assert.equal(state.hasMoreInvoices,true);
 assert.deepEqual(Array.from(state.selected),['old']);assert.equal(h.elements.summary,120);
 assert.match(h.elements.invoiceRows.innerHTML,/Existing invoice/);assert.doesNotMatch(h.elements.invoiceRows.innerHTML,/PRIVATE_DOCUMENT/);
 assert.equal(h.elements.loadMoreBtn.textContent,'إعادة تحميل المزيد');assert.equal(h.elements.loadMoreBtn.disabled,false);
 assert.deepEqual(calls,[25]);
 fail=false;await h.c.loadInvoices({append:true});state=h.c.state();
 assert.deepEqual(calls,[25,25]);assert.equal(state.invoices.length,2);assert.equal(state.nextOffset,50);assert.equal(h.elements.summary,200);
});
