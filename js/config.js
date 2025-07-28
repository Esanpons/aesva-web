/*************** Configuración Supabase ****************/
window.supabaseCreds = {url:'',key:''};
let currentConfigBackdrop = null;

function loadSupabaseCreds(){
  const env = localStorage.getItem('supabaseEnv') || 'real';
  const url = localStorage.getItem(env==='real'?'supabaseUrlReal':'supabaseUrlTest') || '';
  const key = localStorage.getItem(env==='real'?'supabaseKeyReal':'supabaseKeyTest') || '';
  window.supabaseCreds.url = url;
  window.supabaseCreds.key = key;
  document.dispatchEvent(new Event('credsLoaded'));
}

function openConfigPopup(){
  if(currentConfigBackdrop){ currentConfigBackdrop.remove(); currentConfigBackdrop=null; }

  fetch('html/config.html')
    .then(r=>r.text())
    .then(html=>{
      const doc = new DOMParser().parseFromString(html,'text/html');
      const page = doc.getElementById('configPage');
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.appendChild(page);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      currentConfigBackdrop = backdrop;

      const form = backdrop.querySelector('#configForm');
      const envSel   = form.elements['environment'];
      const urlReal  = form.elements['supabaseUrlReal'];
      const keyReal  = form.elements['supabaseKeyReal'];
      const urlTest  = form.elements['supabaseUrlTest'];
      const keyTest  = form.elements['supabaseKeyTest'];
      const realBlock = form.querySelector('#realFields');
      const testBlock = form.querySelector('#testFields');

      function updateFields(){
        const env = envSel.value;
        if(env==='real'){
          realBlock.classList.remove('hidden');
          testBlock.classList.add('hidden');
          urlReal.required = keyReal.required = true;
          urlTest.required = keyTest.required = false;
          urlReal.value = localStorage.getItem('supabaseUrlReal') || '';
          keyReal.value = localStorage.getItem('supabaseKeyReal') || '';
        }else{
          realBlock.classList.add('hidden');
          testBlock.classList.remove('hidden');
          urlTest.required = keyTest.required = true;
          urlReal.required = keyReal.required = false;
          urlTest.value = localStorage.getItem('supabaseUrlTest') || '';
          keyTest.value = localStorage.getItem('supabaseKeyTest') || '';
        }
      }

      envSel.value = localStorage.getItem('supabaseEnv') || 'real';
      updateFields();
      envSel.addEventListener('change',updateFields);

      function closePopup(){
        backdrop.remove();
        currentConfigBackdrop=null;
        document.removeEventListener('keydown',handleEsc);
        location.reload();
      }
      function handleEsc(e){ if(e.key==='Escape') closePopup(); }
      document.addEventListener('keydown',handleEsc);
      backdrop.querySelector('.close').addEventListener('click', closePopup);

      form.addEventListener('submit',e=>{
        e.preventDefault();
        const env  = envSel.value;
        const urlR = urlReal.value.trim();
        const keyR = keyReal.value.trim();
        const urlT = urlTest.value.trim();
        const keyT = keyTest.value.trim();

        if(env==='real' && (!urlR || !keyR)){
          alert('Debe introducir URL y KEY de Real');
          return;
        }
        if(env==='test' && (!urlT || !keyT)){
          alert('Debe introducir URL y KEY de Test');
          return;
        }

        localStorage.setItem('supabaseEnv', env);
        if(urlR) localStorage.setItem('supabaseUrlReal', urlR);
        if(keyR) localStorage.setItem('supabaseKeyReal', keyR);
        if(urlT) localStorage.setItem('supabaseUrlTest', urlT);
        if(keyT) localStorage.setItem('supabaseKeyTest', keyT);

        loadSupabaseCreds();
        document.dispatchEvent(new Event('configSaved'));
        closePopup();
      });
    });
}

if(document.getElementById('btnConfig'))
  document.getElementById('btnConfig').addEventListener('click',openConfigPopup);

window.openConfigPopup = openConfigPopup;

function updateEnvLabel(){
  const label=document.getElementById('envLabel');
  if(!label) return;
  const env=localStorage.getItem('supabaseEnv')||'real';
  if(env==='test'){
    label.textContent='TEST';
    label.classList.add('test');
  }else{
    label.textContent='';
    label.classList.remove('test');
  }
}
document.addEventListener('DOMContentLoaded',()=>{loadSupabaseCreds();updateEnvLabel();});
document.addEventListener('configSaved',()=>{loadSupabaseCreds();updateEnvLabel();});
window.updateEnvLabel=updateEnvLabel;
