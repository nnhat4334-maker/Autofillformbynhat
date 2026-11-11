/* FormFlow Web 2.1: shared launcher; Apps Script executes as the accessing Google user. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE = 'formflow.web.v2.1';
  const MAX_FORMS = 40;
  let memory = {forms:[]};
  let toastTimer;

  function parseScriptUrl(value) {
    try {
      const u = new URL(String(value || '').trim());
      if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(u.pathname) || u.username || u.password || u.search || u.hash) return null;
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch { return null; }
  }
  function parseFormUrl(value) {
    try {
      const u = new URL(String(value || '').trim());
      if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com' || u.username || u.password) return null;
      if (!/^\/forms\/(?:u\/\d+\/)?d\/[A-Za-z0-9_-]+\/edit\/?$/.test(u.pathname)) return null;
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch { return null; }
  }
  function safeTotal(n) {
    const num = Number(n);
    return Number.isSafeInteger(num) && num >= 1 && num <= 300 ? num : null;
  }
  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      memory.forms = Array.isArray(parsed.forms) ? parsed.forms.map(x=>({url:parseFormUrl(x && x.url),name:String(x && x.name || '').slice(0,70),total:safeTotal(x && x.total)||10})).filter(x=>x.url).slice(0,MAX_FORMS) : [];
    } catch { memory = {forms:[]}; }
  }
  function persist() {
    try {localStorage.setItem(STORAGE, JSON.stringify(memory)); return true;}
    catch { return false; }
  }
  function toast(message,error=false) {
    const el=$('toast'); if(!el) return; el.textContent=message;el.className='toast show'+(error?' error':'');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',4200);
  }
  function currentForm() {
    const url=parseFormUrl($('formUrl').value);
    if (!url) {toast('Link Google Form không hợp lệ. Hãy dùng link /edit của biểu mẫu bạn có quyền sửa.',true);$('formUrl').focus();return null;}
    const total=safeTotal($('total').value);
    if(!total){toast('Số lượt phải là số nguyên từ 1 đến 300.',true);$('total').focus();return null;}
    const name=$('formName').value.trim().slice(0,70) || 'Google Form '+(memory.forms.length+1);
    return {url,total,name};
  }
  function saveForm(entry,silent=false) {
    const prior=memory.forms.findIndex(x=>x.url===entry.url);
    if(prior>=0) memory.forms.splice(prior,1);
    memory.forms.unshift(entry);
    memory.forms=memory.forms.slice(0,MAX_FORMS);
    persist();render();
    if(!silent) toast('Đã lưu biểu mẫu trên trình duyệt này.');
  }
  function openLaunch(entry) {
    const url = parseScriptUrl(window.FORMFLOW_SHARED_SCRIPT_URL);
    if(!url) {toast('Chủ website chưa cấu hình kết nối Google. Vui lòng liên hệ người chia sẻ link.',true);return;}
    // Deliberately no access tokens or credentials in query; the Apps Script itself handles Google authorization.
    const target=new URL(url);
    target.searchParams.set('form',entry.url);
    target.searchParams.set('total',String(entry.total));
    window.open(target.href,'_blank','noopener,noreferrer');
    toast('Đã mở bảng cấu hình. Nếu đây là lần đầu, hãy đăng nhập và cấp quyền Google.');
  }
  function render() {
    $('statForms').textContent=String(memory.forms.length);
    $('sidebarCount').textContent=String(memory.forms.length);
    $('savedCount').textContent=String(memory.forms.length);
    const connected=!!parseScriptUrl(window.FORMFLOW_SHARED_SCRIPT_URL);
    $('statConnection').textContent=connected?'Sẵn sàng':'Chưa kết nối';
    $('statConnection').style.color=connected?'#269e72':'';
    $('connectionHelp').textContent=connected?'Hệ thống chung đã được chủ website cấu hình. Bạn sẽ đăng nhập và cấp quyền Google khi mở Form; quyền chỉnh sửa Form được Google kiểm tra.':'Chủ website cần cấu hình URL Apps Script chung trong config.js trước khi chia sẻ.';
    $('connectionDot').className='dot '+(connected?'dot-green':'dot-neutral');
    $('openScript').hidden=!connected;
    $('launchBtn').disabled=!connected;
    const root=$('formList');root.replaceChildren();
    if(!memory.forms.length){
      const empty=document.createElement('div');empty.className='empty-state';
      const icon=document.createElement('span');icon.className='empty-symbol';icon.textContent='▱';
      const title=document.createElement('strong');title.textContent='Chưa có biểu mẫu nào được lưu';
      const msg=document.createElement('p');msg.textContent='Dán link /edit phía trên và bấm “Lưu Form” để bắt đầu.';
      empty.append(icon,title,msg);root.append(empty);return;
    }
    for(const [i,item] of memory.forms.entries()){
      const row=document.createElement('div');row.className='saved-item';
      const symbol=document.createElement('div');symbol.className='saved-item-symbol';symbol.textContent='▤';
      const text=document.createElement('div');text.className='saved-item-body';
      const title=document.createElement('strong');title.textContent=item.name;
      const small=document.createElement('small');small.textContent=item.url+' · '+item.total+' lượt';
      text.append(title,small);
      const actions=document.createElement('div');actions.className='saved-item-actions';
      const pick=document.createElement('button');pick.type='button';pick.className='mini-btn';pick.textContent='Chọn';pick.addEventListener('click',()=>{
        $('formUrl').value=item.url;$('formName').value=item.name;$('total').value=String(item.total);$('forms').scrollIntoView({behavior:'smooth'});toast('Đã chọn Form. Bạn có thể sửa số lượt rồi mở.');
      });
      const open=document.createElement('button');open.type='button';open.className='mini-btn primary';open.textContent='Mở ↗';open.addEventListener('click',()=>openLaunch(item));
      const remove=document.createElement('button');remove.type='button';remove.className='mini-btn delete';remove.textContent='Xóa';remove.setAttribute('aria-label','Xóa '+item.name);remove.addEventListener('click',()=>{memory.forms.splice(i,1);persist();render();toast('Đã xóa khỏi danh sách đã lưu.');});
      actions.append(pick,open,remove);row.append(symbol,text,actions);root.append(row);
    }
  }
  function exportList() {
    if(!memory.forms.length){toast('Chưa có Form để xuất.',true);return;}
    const json=JSON.stringify({app:'FormFlow Web',version:'2.1',forms:memory.forms},null,2);
    const blob=new Blob([json],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='formflow-danh-sach-forms.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('Đã xuất danh sách Form đã lưu.');
  }
  function updateDemo() {
    const male=Number($('demoRange').value);
    const count=safeTotal($('total').value)||10;
    const maleCount=Math.round(count*male/100);
    $('demoMale').textContent=male+'%';$('demoFemale').textContent=(100-male)+'%';
    $('demoMaleCount').textContent=String(maleCount);$('demoFemaleCount').textContent=String(count-maleCount);$('demoTotalCount').textContent=String(count);
  }
  loadStore(); render();updateDemo();
  $('openScript').addEventListener('click',()=>{
    const url=parseScriptUrl(window.FORMFLOW_SHARED_SCRIPT_URL);
    if(url)window.open(url,'_blank','noopener,noreferrer');
  });
  $('saveFormBtn').addEventListener('click',()=>{const form=currentForm();if(form)saveForm(form);});
  $('formLauncher').addEventListener('submit',ev=>{
    ev.preventDefault();const entry=currentForm();if(!entry)return;
    if(!parseScriptUrl(window.FORMFLOW_SHARED_SCRIPT_URL)){toast('Chủ website chưa kích hoạt hệ thống chung.',true);return;}
    saveForm(entry,true);openLaunch(entry);
  });
  $('exportForms').addEventListener('click',exportList);
  $('demoRange').addEventListener('input',updateDemo);
  $('total').addEventListener('input',updateDemo);
  document.querySelectorAll('.nav-link').forEach(a=>a.addEventListener('click',()=>{
    document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x===a));
  }));
  // Expose a narrow pure helper for local regression tests only.
  if(typeof module!=='undefined'&&module.exports){module.exports={parseScriptUrl,parseFormUrl,safeTotal};}
})();
