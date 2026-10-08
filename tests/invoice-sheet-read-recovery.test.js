"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
function setup(failures, schemaError) {
  let reads=0,authCalls=0; const sleeps=[];
  const rows=Array.from({length:4},(_,i)=>['2026-10-09','Fixture '+i,'','','',100+i,100,0,'Cash','Fixture barber','',0,0]);
  const sheet={getLastRow:()=>5,getLastColumn:()=>13,getRange:()=>({getValues(){
    reads++; if(reads<=failures)throw new Error('Service Spreadsheets failed while accessing document with id PRIVATE_DOCUMENT.');
    return rows;
  }})};
  const c=vm.createContext({SpreadsheetApp:{getActive:()=>({getSheetByName:()=>sheet})},
    Utilities:{sleep:ms=>sleeps.push(ms)},TIME_ZONE:'Africa/Cairo',jsonOutput:value=>value,
    inspectDataInvoiceSchemaReadOnly:()=>{if(schemaError)throw schemaError;},
    getDateKey:value=>String(value).slice(0,10),parseSheetAmount:Number,
    validateCutHubRequestEnvironment:()=>{},getSessionToken:()=> 'test-session',protectedReadCapability:()=>null,
    resolveAuthenticatedRequestContext:()=>{authCalls++;return {user:'fixture'};}});
  vm.runInContext(fs.readFileSync('apps-script/production/044_invoices_queries.gs','utf8'),c);
  vm.runInContext(fs.readFileSync('apps-script/production/002_core_http-router.gs','utf8'),c);
  c.jsonOutput=value=>value;
  return {c,sleeps,reads:()=>reads,authCalls:()=>authCalls};
}
test('transient sheet failures retry only the read and preserve pagination with one authentication pass',()=>{
  const h=setup(2);
  const result=h.c.doPost({postData:{contents:JSON.stringify({action:'getInvoices',offset:2,limit:2})}});
  assert.equal(result.status,'success');assert.equal(h.reads(),3);assert.equal(h.authCalls(),1);
  assert.deepEqual(h.sleeps,[250,750]);assert.equal(result.totalMatches,4);assert.equal(result.nextOffset,4);
  assert.deepEqual(Array.from(result.invoices,i=>i.invoiceId),['DATA-3','DATA-2']);
});
test('persistent transient failures stop after three read attempts and suppress the document identifier',()=>{
  const h=setup(9),result=h.c.getInvoices({offset:2,limit:2});
  assert.equal(h.reads(),3);assert.equal(result.code,'INVOICE_READ_TEMPORARILY_UNAVAILABLE');
  assert.equal(result.retryable,true);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_DOCUMENT/);
});
test('schema failures are not retried or converted into successful empty invoice pages',()=>{
  const error=new Error('Invalid invoice headers.');error.code='INVOICE_SCHEMA_INCOMPATIBLE';
  const h=setup(0,error),result=h.c.getInvoices({});
  assert.equal(result.status,'error');assert.equal(result.code,error.code);assert.equal(h.reads(),0);
  assert.deepEqual(h.sleeps,[]);
});
