"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const user=(username='reader')=>({username,displayName:'Fixture',permissions:['access_dashboard','access_cashier']});
function ui(overrides={}){
 const source=fs.readFileSync(process.env.CUT_HUB_ACCESS_SOURCE_OVERRIDE||'public/pages/system-access.html','utf8');
 const inputs=[{value:'access_dashboard',checked:true,disabled:false},{value:'access_cashier',checked:false,disabled:false}];
 const elements={};for(const name of ['usersList','statusBox','saveUserBtn','resetFormBtn','displayName','username','password'])elements[name]={value:'',textContent:'',innerHTML:'',querySelectorAll:()=>[],addEventListener(){}};
 const permissions={querySelectorAll:()=>inputs,html:''};Object.defineProperty(permissions,'innerHTML',{get(){return this.html;},set(html){this.html=html;for(const input of inputs){const tag=html.match(new RegExp('<input[^>]*value="'+input.value+'"[^>]*>'))?.[0]||'';input.checked=/\bchecked\b/.test(tag);input.disabled=/\bdisabled\b/.test(tag);}}});
 const auth={isOwnerUser:u=>u.username==='owner',getUsers:async()=>[user('owner'),user()],createUser:async()=>({success:true}),updateUser:async()=>({success:true}),deleteUser:async()=>({success:true}),...overrides};
 const window={RomeoAuth:auth,location:{search:''},confirm:()=>true};
 const c=vm.createContext({RomeoAuth:auth,window,URLSearchParams,console:{info(){}},localStorage:{getItem:()=>null},document:{getElementById:id=>elements[id],querySelector:s=>s==='.permissions'?permissions:null,querySelectorAll:s=>s.includes(':checked')?inputs.filter(x=>x.checked):s.includes('.permissions')?inputs:[],body:{dataset:{language:'ar'}}},elements,inputs});
 const a=source.indexOf('    const permissionLabels ='),b=source.indexOf('    const menuToggle =',a);vm.runInContext(source.slice(a,b)+'\nfunction inspect(){return {usersCache,editingUsername,userMutationPending};}',c);return c;
}
test('duplicate user-list reads coalesce into one authoritative request',async()=>{
 let finish,calls=0;const c=ui({getUsers:()=>{calls++;return new Promise(r=>finish=r);}});const first=c.loadUsers();assert.equal(c.loadUsers(),first);assert.equal(c.elements.saveUserBtn.disabled,true);finish([user('owner'),user()]);assert.equal(await first,true);assert.equal(calls,1);assert.equal(c.inspect().usersCache.length,2);assert.equal(c.elements.saveUserBtn.disabled,false);
});
test('failed refresh preserves user cards and permissions while hiding provider error details',async()=>{
 let fail=false;const c=ui({getUsers:async()=>{if(fail)throw Error('private response');return [user('owner'),user()];}});await c.loadUsers();const rendered=c.elements.usersList.innerHTML;fail=true;assert.equal(await c.loadUsers(),false);assert.equal(c.elements.usersList.innerHTML,rendered);assert.equal(c.inspect().usersCache.length,2);assert.doesNotMatch(c.elements.statusBox.textContent,/private/);
});
test('language rendering preserves selected and owner-disabled permissions',()=>{
 const c=ui();c.inputs[0].checked=false;c.inputs[1].checked=true;c.inputs[1].disabled=true;c.renderPermissionOptions();assert.equal(c.inputs[0].checked,false);assert.equal(c.inputs[1].checked,true);assert.equal(c.inputs[1].disabled,true);
});
test('selecting a user is local and never sends a permission or credential mutation',async()=>{
 let reads=0,writes=0;const c=ui({getUsers:async()=>{reads++;return [user('owner'),user()];},updateUser:async()=>{writes++;return {success:true};}});await c.loadUsers();c.window.editUser('reader');assert.equal(reads,1);assert.equal(writes,0);assert.equal(c.elements.username.disabled,true);assert.equal(c.inputs[1].checked,true);assert.equal(c.elements.password.value,'');
});
test('save submits once, blocks competing writes and refreshes once after successful completion',async()=>{
 let finish,writes=0,reads=0;const c=ui({getUsers:async()=>{reads++;return [user('owner'),user()];},updateUser:()=>{writes++;return new Promise(r=>finish=r);},deleteUser:async()=>{throw Error('must not run');}});await c.loadUsers();c.window.editUser('reader');const saving=c.saveUser();await c.saveUser();await c.window.removeUser('reader');assert.equal(writes,1);assert.equal(c.elements.resetFormBtn.disabled,true);finish({success:true});await saving;assert.equal(reads,2);assert.equal(c.inspect().userMutationPending,false);assert.equal(c.elements.saveUserBtn.disabled,false);
});
test('failed or rejected user writes never retry or clear the pending draft',async()=>{
 for(const throws of [false,true]){let writes=0;const c=ui({updateUser:async()=>{writes++;if(throws)throw Error('private');return {success:false,message:'Rejected'};}});await c.loadUsers();c.window.editUser('reader');c.elements.displayName.value='Draft';await c.saveUser();assert.equal(writes,1);assert.equal(c.elements.displayName.value,'Draft');assert.equal(c.inspect().userMutationPending,false);assert.doesNotMatch(c.elements.statusBox.textContent,/private/);}
});
test('deletion excludes owner and submits each confirmed synthetic operation once',async()=>{
 let writes=0,finish;const c=ui({deleteUser:()=>{writes++;return new Promise(r=>finish=r);}});await c.loadUsers();await c.window.removeUser('owner');assert.equal(writes,0);const deleting=c.window.removeUser('reader');await c.window.removeUser('reader');assert.equal(writes,1);finish({success:true});await deleting;assert.equal(c.inspect().userMutationPending,false);
});
test('user labels cannot become HTML or inline executable handlers; owner has no delete control',async()=>{
 const c=ui({getUsers:async()=>[user('owner'),{...user("quote'\"><img>"),displayName:'<script>fixture</script>'}]});await c.loadUsers();assert.doesNotMatch(c.elements.usersList.innerHTML,/<script>|<img>|onclick=/);assert.match(c.elements.usersList.innerHTML,/&lt;script&gt;/);assert.equal((c.elements.usersList.innerHTML.match(/data-user-action="delete"/g)||[]).length,1);
});
test('new user creation submits once and cannot grant manage_users from the checkbox list',async()=>{
 let calls=0,finish,payload;const c=ui({createUser:p=>{calls++;payload=p;return new Promise(r=>finish=r);}});await c.loadUsers();c.elements.username.value='new-fixture';c.elements.displayName.value='Fixture';c.inputs.push({value:'manage_users',checked:true});const first=c.saveUser();await c.saveUser();assert.equal(calls,1);assert.ok(!payload.permissions.includes('manage_users'));finish({success:true});await first;
});
test('loading users blocks submissions and the reserved owner name cannot create another owner',async()=>{
 let finish,writes=0;const c=ui({getUsers:()=>new Promise(r=>finish=r),createUser:async()=>{writes++;return {success:true};}});const reading=c.loadUsers();await c.saveUser();finish([]);await reading;c.elements.username.value='OWNER';await c.saveUser();assert.equal(writes,0);assert.equal(c.inspect().userMutationPending,false);
});
test('language rendering retains loading text and a successful empty list ends it',async()=>{
 let finish;const c=ui({getUsers:()=>new Promise(r=>finish=r)});const loading=c.loadUsers();c.renderUsers();assert.match(c.elements.usersList.innerHTML,/جاري تحميل/);finish([]);await loading;assert.doesNotMatch(c.elements.usersList.innerHTML,/جاري تحميل/);
});
