/*************** Configuración Supabase ****************/
let currentConfigBackdrop = null;

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
      const urlInput = form.elements['supabaseUrl'];
      const keyInput = form.elements['supabaseKey'];
      urlInput.value = localStorage.getItem('supabaseUrl') || '';
      keyInput.value = localStorage.getItem('supabaseKey') || '';

      function closePopup(){
        backdrop.remove();
        currentConfigBackdrop=null;
        document.removeEventListener('keydown',handleEsc);
      }
      function handleEsc(e){ if(e.key==='Escape') closePopup(); }
      document.addEventListener('keydown',handleEsc);
      backdrop.querySelector('.close').addEventListener('click', closePopup);

      form.addEventListener('submit',e=>{
        e.preventDefault();
        const url = urlInput.value.trim();
        const key = keyInput.value.trim();
        if(url && key){
          localStorage.setItem('supabaseUrl', url);
          localStorage.setItem('supabaseKey', key);
          document.dispatchEvent(new Event('configSaved'));
          closePopup();
        }else{
          alert('Debe introducir ambos valores');
        }
      });
    });
}

if(document.getElementById('btnConfig'))
  document.getElementById('btnConfig').addEventListener('click',openConfigPopup);

window.openConfigPopup = openConfigPopup;
