"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
function fixture(){
 const row=["2026-10-13 12:34:56","Customer","Phone","Service","",117,120,3,"Visa","Staff","note",10,13,"R1"];
 const rows=[Array(14).fill("header"),row];let held=false,calls=0,trash=0,failWrite=false,allowed=true;
 const sheet={getLastRow:()=>rows.length,getRange:(r,col,n=1,width=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(col-1,col-1+width)),setValue:value=>{rows[r-1][col-1]=value;if(failWrite)throw Error("ambiguous write");}})};
 const c=vm.createContext({console,actorHasPermission:()=>allowed,requirePermission:()=>({status:"error",code:"PERMISSION_DENIED"}),jsonOutput:x=>x,SpreadsheetApp:{getActive:()=>({getSheetByName:()=>sheet})},inspectDataInvoiceSchemaReadOnly:()=>({invoiceRequestIdColumn:14}),getDisplayDateTime:x=>String(x),
  LockService:{getScriptLock:()=>({waitLock(){held=true;},releaseLock(){held=false;}})},DriveApp:{getFileById:()=>({setTrashed:()=>{trash++;}})}});
 vm.runInContext(fs.readFileSync('apps-script/production/048_invoices_pdf.gs','utf8'),c);
 c.createInvoicePdf=data=>{assert.equal(held,false);calls++;assert.equal(data.total,117);assert.equal(data.invoiceDateTime,"2026-10-13 12:34:56");return 'https://drive.google.com/file/d/NEW/view';};
 return {c,rows,row,held:()=>held,calls:()=>calls,trash:()=>trash,failWrite:()=>{failWrite=true;},deny:()=>{allowed=false;}};
}
test("PDF is generated outside checkout lock from stored data, and repeat requests reuse it",()=>{
 const h=fixture(),before=h.row.slice();const first=h.c.getInvoicePdf({invoiceRequestId:"R1",total:999999}),second=h.c.getInvoicePdf({invoiceRequestId:"R1"});
 assert.equal(first.status,"success");assert.equal(second.reused,true);assert.equal(h.calls(),1);assert.equal(h.held(),false);
 before[4]=first.pdfUrl;assert.deepEqual(h.row,before);
});
test("a moved row is re-found by stable identity before publishing",()=>{
 const h=fixture(),create=h.c.createInvoicePdf;h.c.createInvoicePdf=data=>{const result=create(data);h.rows.splice(1,0,Array(14).fill("other"));return result;};
 assert.equal(h.c.getInvoicePdf({invoiceRequestId:"R1"}).status,"success");assert.equal(h.rows[1][4],"other");assert.match(h.rows[2][4],/NEW/);
});
test("editing the invoice during conversion rejects the stale PDF and trashes only the new file",()=>{
 const h=fixture(),create=h.c.createInvoicePdf;h.c.createInvoicePdf=data=>{const result=create(data);h.row[5]=200;return result;};
 assert.equal(h.c.getInvoicePdf({invoiceRequestId:"R1"}).code,"INVOICE_PDF_SOURCE_CHANGED");assert.equal(h.row[4],"");assert.equal(h.row[5],200);assert.equal(h.trash(),1);
});
test("another published PDF wins without duplicating its attachment",()=>{
 const h=fixture(),create=h.c.createInvoicePdf;h.c.createInvoicePdf=data=>{const result=create(data);h.row[4]='https://drive.google.com/file/d/WINNER/view';return result;};
 const result=h.c.getInvoicePdf({invoiceRequestId:"R1"});assert.equal(result.reused,true);assert.match(result.pdfUrl,/WINNER/);assert.equal(h.trash(),1);
});
test("PDF failure preserves the saved invoice",()=>{
 const h=fixture(),before=JSON.stringify(h.rows);h.c.createInvoicePdf=()=>{throw Error("Drive down");};
 const result=h.c.getInvoicePdf({invoiceRequestId:"R1"});assert.equal(result.code,"INVOICE_PDF_UNAVAILABLE");assert.equal(JSON.stringify(h.rows),before);assert.equal(h.held(),false);
});
test("an ambiguous publication failure never trashes the now-attached document",()=>{
 const h=fixture();h.failWrite();assert.equal(h.c.getInvoicePdf({invoiceRequestId:"R1"}).status,"error");assert.match(h.row[4],/NEW/);assert.equal(h.trash(),0);
});
test("deleted or duplicate source identity cannot attach a PDF to another invoice",()=>{
 for(const duplicate of [false,true]){const h=fixture();if(duplicate)h.rows.push(h.row.slice());else h.rows.pop();const result=h.c.getInvoicePdf({invoiceRequestId:"R1"});assert.equal(result.status,"error");assert.equal(h.calls(),0);}
});
test("PDF operation enforces permissions and identity before conversion",()=>{
 const h=fixture();assert.equal(h.c.getInvoicePdf({}).code,"INVOICE_PDF_ID_REQUIRED");h.deny();assert.equal(h.c.getInvoicePdf({invoiceRequestId:"R1"}).code,"PERMISSION_DENIED");assert.equal(h.calls(),0);
});
test("PDF route stays authenticated and printing still happens after confirmed save",()=>{
 const router=fs.readFileSync('apps-script/production/002_core_http-router.gs','utf8');const publicPart=router.slice(router.indexOf('const PUBLIC_ACTIONS'),router.indexOf('function isPublicAction'));
 assert.doesNotMatch(publicPart,/getInvoicePdf/);
 const cashier=fs.readFileSync('public/assets/js/pages/cashier.js','utf8');assert.ok(cashier.indexOf('const saveResult = await saveInvoice')<cashier.indexOf('if (shouldPrint === true) printInvoice(printData)'));
});
test("editing a modern invoice clears its old PDF and holds the same publication lock",()=>{
 const h=fixture();h.row[4]='https://drive.google.com/file/d/OLD/view';
 const c=h.c;vm.runInContext(fs.readFileSync('apps-script/production/042_invoices_schema.gs','utf8'),c);
 c.requirePermission=()=>null;c.ensureDataInvoiceColumns=()=>({invoiceRequestIdColumn:14});c.getInvoiceRequestIdColumn=()=>14;
 c.getDateKey=value=>String(value).slice(0,10);c.TIME_ZONE="Africa/Cairo";c.getLockedDateError=()=>"";c.parseSheetAmount=value=>Number(value)||0;c.logActivity=()=>{};
 c.SpreadsheetApp={getActive:()=>({getSheetByName:()=>({getLastRow:()=>2,getRange:(r,col,n=1,width=1)=>({getValue:()=>h.row[col-1],getValues:()=>[h.row.slice(col-1,col-1+width)],setValues:values=>{assert.equal(h.held(),true);h.row.splice(0,13,...values[0]);}})})})};
 vm.runInContext(fs.readFileSync('apps-script/production/043_invoices_mutations.gs','utf8'),c);
 const result=c.updateInvoice({rowNumber:2,invoiceId:'DATA-2',date:'2026-10-13',total:200});assert.equal(result.status,'success');assert.equal(result.invoice.invoiceRequestId,'R1');assert.equal(h.row[4],'');assert.equal(h.row[13],'R1');assert.equal(h.held(),false);
});
function uiFixture(request){
 let click,link,error;const button={disabled:false,textContent:'تجهيز PDF',dataset:{invoicePdf:'R1'},nextElementSibling:null,replaceWith:value=>{link=value;},after:value=>{error=value;}};
 const c=vm.createContext({window:{},localStorage:{getItem:()=>null},URL,RomeoApi:{request},document:{addEventListener:(_type,handler)=>{click=handler;},createElement:()=>({setAttribute(){}})}});
 vm.runInContext(fs.readFileSync('public/assets/js/utils/invoice-pdf.js','utf8'),c);
 return {c,button,click:()=>click({target:{closest:()=>button}}),link:()=>link,error:()=>error};
}
test("PDF button disables double submission and sends only persisted identity",async()=>{
 let resolve,calls=0;const h=uiFixture(payload=>{calls++;assert.deepEqual(JSON.parse(JSON.stringify(payload)),{action:'getInvoicePdf',invoiceRequestId:'R1'});return new Promise(done=>{resolve=done;});});
 const pending=h.click();assert.equal(h.button.disabled,true);await h.click();assert.equal(calls,1);
 resolve({status:'success',pdfUrl:'https://drive.google.com/file/d/NEW/view?usp=sharing'});await pending;assert.equal(h.link().textContent,'فتح PDF');assert.equal(h.link().rel,'noopener');
});
test("PDF failure allows a manual retry without resaving the sale, and unsafe URLs never open",async()=>{
 for(const reply of [{status:'error',message:'الفاتورة محفوظة؛ جرب لاحقًا.'},{status:'success',pdfUrl:'https://evil.example/file/d/NEW/view'}]){
  const h=uiFixture(async()=>reply);await h.click();assert.equal(h.button.disabled,false);assert.equal(h.link(),undefined);assert.ok(h.error().textContent);
 }
});
