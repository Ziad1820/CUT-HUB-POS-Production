"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("public/assets/js/pages/schedule-management.js","utf8");
const html=fs.readFileSync("public/pages/schedule-management.html","utf8");
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const nodes={};const node=()=>({children:[],hidden:false,disabled:false,value:"",textContent:"",dataset:{},append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);},replaceChildren(){this.children=[];}});
 const c=vm.createContext({Date,Number,byId:id=>nodes[id]||(nodes[id]=node()),document:{createElement:node},state:{staff:[{staffId:"S1",staffName:"Fixture"}],schedules:[],selectedBoardDate:"2026-10-19",permissions:{manage:true}},WEEKDAYS:["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"],shiftLabel:item=>item.shiftStart+"–"+item.shiftEnd,actionButton:(label,action,id)=>({textContent:label,dataset:{action,id}})});
 vm.runInContext(source.match(/function scheduleRowsForDay\(schedules, staffId, date\) \{[\s\S]*?\n\}/)[0],c);
 vm.runInContext(source.match(/function renderWeekly\(\) \{[\s\S]*?\n  \}/)[0],c);
 c.byId("staffFilter").value="S1";return {c,nodes};
}
const segment=(id,index,extra={})=>({scheduleId:id,staffId:"S1",weekday:"MONDAY",segmentIndex:index,shiftStart:"09:00",shiftEnd:"12:00",requiredWorkMinutes:150,allowedBreakMinutes:30,effectiveFrom:"2026-10-01",active:true,...extra});
test("the duplicate weekly table is removed and all management controls remain unique beside the team board",()=>{
 assert.doesNotMatch(html,/الجدول الأسبوعي المتكرر|id="weeklyBody"/);
 for(const id of ["staffWeekBoard","daySegments","copyDayBtn","copyEmployeeBtn","applyRangeBtn","addSegmentBtn"]){assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);}
 assert.ok(html.indexOf('id="copyDayBtn"')<html.indexOf('id="scheduleEditor"'));
});
test("day selection preserves multiple effective shifts and excludes other staff, weekdays and date ranges",()=>{
 const {c}=fixture();const rows=[segment("late",2),segment("early",1),segment("future",3,{effectiveFrom:"2026-11-01"}),segment("expired",4,{effectiveTo:"2026-10-18"}),segment("other",5,{staffId:"S2"}),segment("inactive",6,{active:false}),segment("tuesday",7,{weekday:"TUESDAY"})];
 assert.deepEqual(plain(c.scheduleRowsForDay(rows,"S1","2026-10-19").map(x=>x.scheduleId)),["early","late"]);
 assert.deepEqual(plain(c.scheduleRowsForDay(rows,"S1",null)),[]);
});
test("selected-day cards retain edit and disable controls for each shift without rendering seven days",()=>{
 const {c,nodes}=fixture();c.state.schedules=[segment("A",1),segment("B",2)];c.renderWeekly();
 const cards=nodes.daySegments.children.filter(n=>n.className==="schedule-segment-card");assert.equal(cards.length,2);
 assert.equal(cards[0].children.at(-1).children[0].dataset.action,"edit-segment");
 assert.equal(cards[1].children.at(-1).children[1].dataset.action,"deactivate-segment");assert.equal(nodes.selectedScheduleDay.hidden,false);
 c.state.selectedBoardDate=null;c.renderWeekly();assert.equal(nodes.selectedScheduleDay.hidden,true);
});
test("weekly rest can be removed and prevents adding a conflicting shift; read failures block controls",()=>{
 const {c,nodes}=fixture();c.state.schedules=[segment("REST",1,{recordType:"WEEKLY_DAY_OFF"})];c.renderWeekly();
 assert.equal(nodes.addSegmentBtn.disabled,true);assert.equal(nodes.daySegments.children[0].children.at(-1).children[0].textContent,"إلغاء الراحة");
 c.state.schedules=[];c.state.weeklyLoadFailed=true;c.renderWeekly();assert.equal(nodes.weeklyEmpty.hidden,false);assert.match(nodes.weeklyEmpty.textContent,/تعذر/);assert.equal(nodes.copyDayBtn.disabled,true);
});
