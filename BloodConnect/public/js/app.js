'use strict';
let currentUser=null;
const $=id=>document.getElementById(id);
// Escape all record values before including them in an HTML template.
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function api(path,options={}){
 const response=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json','X-BloodConnect-Request':'1',...(options.headers||{})}});
 const result=await response.json();
 if(!response.ok){if(response.status===401 && !['login','signup'].includes(document.body.dataset.page))location.replace('login.html');throw new Error(result.error||'Request failed.');}
 return result;
}
function notice(message,error=false){$('notice').textContent=message;$('notice').className=error?'error':'success';}
function table(headers,rows){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="empty">No records to display.</p>';}
function field(name,label,type='text',value='',required=true){return `<div class="form-group"><label for="${esc(name)}">${esc(label)}</label><input class="form-control" id="${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${required?'required':''} ${type==='password'?'minlength="8" maxlength="128" autocomplete="new-password"':''}></div>`;}
function select(name,label,options,value=''){return `<div class="form-group"><label for="${esc(name)}">${esc(label)}</label><select class="form-control" id="${esc(name)}" name="${esc(name)}" required>${options.map(([key,label])=>`<option value="${esc(key)}" ${String(key)===String(value)?'selected':''}>${esc(label)}</option>`).join('')}</select></div>`;}
const groups=['A+','A-','B+','B-','AB+','AB-','O+','O-'];
function donorFields(d={}){return field('name','Full name','text',d.name)+field('email','Email','email',d.email)+field('phone','Phone','tel',d.phone,false)+field('dateOfBirth','Date of birth','date',d.date_of_birth)+select('bloodGroup','Blood group',[['','Choose blood group'],...groups.map(g=>[g,g])],d.blood_group)+select('gender','Gender',[['','Choose'],['Male','Male'],['Female','Female'],['Other','Other']],d.gender)+field('address','Address','text',d.address,false);}
function button(label,action,id='',kind='secondary'){return `<button type="button" class="btn btn-sm btn-${kind}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(label)}</button>`;}
function formHandler(id,handler){const form=$(id);form.addEventListener('submit',async(event)=>{event.preventDefault();if(form.dataset.busy==='true')return;const submit=form.querySelector('[type=submit]');form.dataset.busy='true';submit.disabled=true;try{await handler(Object.fromEntries(new FormData(form)),form);}catch(err){notice(err.message,true);}finally{form.dataset.busy='false';submit.disabled=false;}});}
function litres(value){return Number(value).toFixed(2)+' L';}
function stat(label,value){return `<div class="stat"><strong>${esc(value)}</strong>${esc(label)}</div>`;}
async function initialise(){
 currentUser=await api('/auth/me');
 $('userLabel').textContent=currentUser.name+' · '+currentUser.role+(currentUser.hospital_name?' · '+currentUser.hospital_name:'');
 const links=currentUser.role==='donor'?[['donors.html','My profile']]:[
  ['index.html','Dashboard'],...(currentUser.role==='admin'?[['donors.html','Donors'],['donations.html','Donations']]:[]),
  ['inventory.html','Inventory'],['requests.html','Requests'],...(currentUser.role==='admin'?[['admin.html','Administration']]:[])];
 const page=location.pathname.split('/').pop()||'index.html';
 $('navigation').innerHTML=links.map(([url,title])=>`<a href="${url}" ${page===url?'aria-current="page"':''}>${title}</a>`).join('');
 $('logout').addEventListener('click',async()=>{try{await api('/auth/logout',{method:'POST',body:'{}'});location.replace('login.html');}catch(err){notice(err.message,true);}});
 return currentUser;
}
