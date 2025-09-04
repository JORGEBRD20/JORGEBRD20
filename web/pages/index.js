import Script from 'next/script';

export default function Home() {
  return (
    <>
      <div id="app" className="container" aria-live="polite">
        <header>
          <div className="brand">
            <div className="logo" aria-hidden="true">VIO</div>
            <div>
              <h1>VIO — Privacidade Extrema</h1>
              <p className="small">Mensagens, fotos e vídeos que se autodestroem após a visualização</p>
            </div>
          </div>
        </header>

        <div className="app-shell" role="application" aria-label="VIO Aplicativo">
          <aside className="left-panel card" aria-label="Painel lateral">
            <div id="auth-area" aria-live="polite">
              <div id="register" aria-hidden="false">
                <h2 className="mt-0">Criar conta</h2>
                <p className="muted">Cadastre seu número de celular e e-mail. Você receberá um código por e-mail.</p>
                <div className="form-row mt-10">
                  <input id="phone" type="tel" placeholder="Número de celular (ex: +55 11 9...)" aria-label="Número de celular" />
                  <input id="email" type="email" placeholder="E-mail (para código de 6 dígitos)" aria-label="E-mail" />
                  <button id="sendCode" className="btn">Enviar código por e-mail</button>
                </div>
                <div id="verifyBlock" className="hidden mt-8">
                  <input id="code6" type="text" maxLength="6" placeholder="Código de 6 dígitos" aria-label="Código de 6 dígitos" />
                  <button id="verifyBtn" className="btn">Confirmar código</button>
                </div>
                <p className="muted" style={{marginTop:8,fontSize:13}}>Após confirmação, configure foto, nome e recado.</p>
                <hr style={{border:'none',height:1,background:'rgba(255,255,255,0.02)',margin:'12px 0'}} />
              </div>

              <div id="profileSetup" className="hidden">
                <h3>Configurar perfil</h3>
                <div className="profile-row">
                  <div id="profileAvatar" className="avatar" style={{width:64,height:64,borderRadius:12}}>U</div>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                    <input id="displayName" placeholder="Nome de exibição" aria-label="Nome de exibição" />
                    <input id="statusTxt" placeholder="Recado (ex: 'Online para conversas')" aria-label="Recado" />
                    <div style={{display:'flex',gap:8,marginTop:8}}>
                      <button id="saveProfile" className="btn">Salvar e continuar</button>
                      <button id="cancelProfile" className="btn ghost">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{marginTop:10}}>
              <div className="justify-between">
                <strong>Contatos VIO</strong>
                <div>
                  <button id="addContactBtn" className="btn ghost" title="Adicionar contato">Adicionar</button>
                  <button id="simulateIncoming" className="btn ghost" title="Simular mensagem recebida">Simular</button>
                </div>
              </div>

              <div className="search mt-10">
                <input id="searchContacts" placeholder="Buscar contatos" aria-label="Buscar contatos" />
                <button id="scanBtn" className="btn ghost" title="Sincronizar contatos">Sincronizar</button>
              </div>

              <div id="contacts" className="contact-list" role="list" aria-label="Lista de contatos"></div>
            </div>

            <div className="mt-14">
              <label className="muted">Configurar expiração (não abridas)</label>
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <select id="expireSelect" aria-label="Selecionar prazo de expiração">
                  <option value="24">24 horas</option>
                  <option value="6">6 horas</option>
                  <option value="72">72 horas</option>
                  <option value="168">7 dias</option>
                </select>
                <button id="applyExpire" className="btn ghost">Aplicar</button>
              </div>
            </div>
          </aside>

          <main className="main-panel card" role="main" aria-live="polite">
            <div className="chat-window" id="chatWindow">
              <div className="justify-between">
                <div>
                  <div id="currentContactName" style={{fontWeight:700}}>Selecione um contato</div>
                  <div id="currentContactStatus" className="muted" style={{fontSize:13}}>Status</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button id="deleteConversation" className="btn ghost" title="Apagar conversa">Apagar</button>
                  <button id="deleteAccount" className="btn danger" title="Excluir conta">Excluir conta</button>
                </div>
              </div>

              <div className="messages" id="messages" aria-live="polite" role="region" aria-label="Mensagens"></div>

              <div className="composer" role="region" aria-label="Compositor de mensagem">
                <input id="composerText" type="text" placeholder="Escreva uma mensagem efêmera..." aria-label="Mensagem" />
                <input id="composerFile" type="file" accept="image/*,video/*,audio/*" style={{display:'none'}} aria-hidden="true" />
                <button id="attachBtn" className="btn ghost" aria-label="Anexar">📎</button>
                <button id="sendBtn" className="btn" aria-label="Enviar">Enviar</button>
              </div>
            </div>

            <div id="notice" className="notice" role="note" style={{marginTop:12}}>
              <strong>Importante:</strong> protótipo sem E2EE. Implementar Signal Protocol, expurgo server-side, URLs assinadas e proteção anti-screenshot no app nativo.
            </div>
          </main>
        </div>

        <footer>
          Protótipo VIO — Mensagens efêmeras | Integrar camada server-side e apps nativos para segurança completa.
        </footer>
      </div>

      <div id="viewer" className="viewer" role="dialog" aria-modal="true" aria-hidden="true">
        <div className="panel card" role="document">
          <div className="justify-between">
            <div className="muted">Visualização efêmera — remove após término</div>
            <div className="countdown" id="viewerCountdown">--</div>
          </div>
          <div id="viewerContent" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:320}}></div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button id="closeViewer" className="btn ghost">Fechar</button>
          </div>
        </div>
      </div>

      <div id="modalBack" className="modal-back" role="dialog" aria-hidden="true">
        <div className="modal card-small" role="document" aria-live="polite">
          <div id="modalBody"></div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
            <button id="modalCancel" className="btn ghost">Cancelar</button>
            <button id="modalConfirm" className="btn">Confirmar</button>
          </div>
        </div>
      </div>

      <Script id="vio-proto" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
// VIO prototype script (client-side simulation)
(function(){
  const state = {
    me: null,
    contacts: [],
    conversations: {},
    currentContactId: null,
    MESSAGE_VISIBILITY_SECONDS: 20,
    MESSAGE_EXPIRE_HOURS: 24
  };
  const $ = id => document.getElementById(id);
  const nowISO = () => new Date().toISOString();
  const genId = () => Math.random().toString(36).slice(2,10);
  const addHours = (iso, h) => new Date(new Date(iso).getTime() + h*3600*1000).toISOString();

  $('sendCode').addEventListener('click', () => {
    const phone = $('phone').value.trim();
    const email = $('email').value.trim();
    if(!phone || !email){ alert('Informe número e e-mail'); return; }
    const fakeCode = String(Math.floor(100000 + Math.random()*900000));
    window._FAKE_CODE = fakeCode;
    console.log('[FAKE_EMAIL_CODE]', fakeCode);
    $('verifyBlock').classList.remove('hidden');
    $('sendCode').textContent = 'Reenviar código';
    alert('Código simulado enviado por e-mail (veja console).');
  });

  $('verifyBtn').addEventListener('click', () => {
    const code = $('code6').value.trim();
    if(!code){ alert('Digite o código'); return; }
    if(code !== window._FAKE_CODE){ alert('Código incorreto (use console no protótipo)'); return; }
    state.me = { id: genId(), phone: $('phone').value.trim(), email: $('email').value.trim(), name: null, avatar: null, status: '' };
    $('register').style.display = 'none';
    $('profileSetup').classList.remove('hidden');
  });

  $('cancelProfile').addEventListener('click', ()=>{
    $('profileSetup').classList.add('hidden');
    $('register').style.display = 'block';
  });

  $('saveProfile').addEventListener('click', () => {
    const name = $('displayName').value.trim() || 'Usuário VIO';
    const status = $('statusTxt').value.trim() || 'Olá! Estou usando VIO';
    state.me.name = name; state.me.status = status; state.me.avatar = name[0]?.toUpperCase() || 'U';
    $('profileSetup').classList.add('hidden');
    renderContacts(); renderCurrentInfo(); seedDemo();
  });

  function seedDemo(){
    if(state.contacts.length) return;
    const friends = [
      {id:'c1', name:'Mariana', avatar:'M', status:'Disponível'},
      {id:'c2', name:'Lucas', avatar:'L', status:'VIO desde hoje'},
      {id:'c3', name:'Alan', avatar:'A', status:'Recado: trabalho'}
    ];
    state.contacts = friends;
    state.conversations['c1'] = [ createIncoming('c1','Oi, sou a Mariana — mensagem efêmera!') ];
    renderContacts();
  }

  function renderContacts(filter=''){
    const box = $('contacts'); box.innerHTML='';
    const list = state.contacts.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    list.forEach(c=>{
      const last = (state.conversations[c.id] && state.conversations[c.id].slice(-1)[0]);
      const lastTxt = last ? (last.type==='text' ? last.body.slice(0,40) : '['+last.type+']') : c.status;
      const div = document.createElement('div');
      div.className='contact';
      div.tabIndex=0;
      div.role='listitem';
      div.innerHTML = `<div class="avatar">${c.avatar}</div><div class="meta"><div class="name">${c.name}</div><div class="last muted">${lastTxt}</div></div>`;
      div.addEventListener('click', ()=>{ openChat(c.id) });
      box.appendChild(div);
    });
  }
  $('searchContacts').addEventListener('input', (e)=> renderContacts(e.target.value));

  $('addContactBtn').addEventListener('click', ()=>{
    showModal(`<h3>Adicionar contato</h3><label>Nome</label><input id=\"modalInputName\" placeholder=\"Nome do contato\" style=\"width:100%;padding:8px;margin-top:6px\"/><label style=\"margin-top:8px\">Número (ex: +55...)</label><input id=\"modalInputPhone\" placeholder=\"+55...\" style=\"width:100%;padding:8px;margin-top:6px\"/>`,
      ()=>{
        const name = $('modalInputName').value.trim() || 'Contato';
        const phone = $('modalInputPhone').value.trim();
        const id = genId();
        const avatar = name[0]?.toUpperCase() || 'C';
        state.contacts.push({id,name,avatar,status:phone || ''});
        state.conversations[id] = [];
        renderContacts(); hideModal();
      });
  });

  $('simulateIncoming').addEventListener('click', ()=>{
    if(!state.contacts.length){ alert('Adicione contatos primeiro'); return; }
    const random = state.contacts[Math.floor(Math.random()*state.contacts.length)];
    const msg = createIncoming(random.id, 'Mensagem simulada recebida em ' + new Date().toLocaleTimeString());
    state.conversations[random.id].push(msg);
    scheduleExpiration(random.id, msg.id, state.MESSAGE_EXPIRE_HOURS);
    if(state.currentContactId === random.id) renderMessages();
    renderContacts();
  });

  function createIncoming(contactId, text){ const ts = nowISO(); return { id: genId(), from:'them', type:'text', body:text, ts, viewed:false, expiresAt: addHours(ts, state.MESSAGE_EXPIRE_HOURS) }; }

  function openChat(contactId){ state.currentContactId = contactId; renderCurrentInfo(); renderMessages(); }
  function renderCurrentInfo(){ const id = state.currentContactId; const elName = $('currentContactName'); const elStatus = $('currentContactStatus'); if(!id){ elName.textContent='Selecione um contato'; elStatus.textContent=''; return; } const c = state.contacts.find(x=>x.id===id); elName.textContent = c?.name || 'Contato'; elStatus.textContent = c?.status || ''; }

  function renderMessages(){ const id = state.currentContactId; const box = $('messages'); box.innerHTML=''; if(!id) return; const conv = state.conversations[id] || []; conv.forEach(m=>{ const el = document.createElement('div'); el.className = 'message ' + (m.from==='me' ? 'me':'them'); el.dataset.msgid = m.id; if(m.type === 'text'){ el.innerHTML = `<div>${escapeHtml(m.body)}</div><div class=\"meta-time\">${formatTime(m.ts)} ${m.viewed ? '· visualizada' : ''}</div>`; if(m.from === 'them' && !m.viewed){ el.addEventListener('click', ()=> openEphemeralMessage(id,m.id)); el.style.cursor='pointer'; el.title='Abrir mensagem (será destruída após visualização)'; } } else if(m.type === 'image'){ el.innerHTML = `<div><img src=\"${m.body}\" alt=\"Imagem efêmera\" style=\"max-width:100%;border-radius:8px\"/></div><div class=\"meta-time\">${formatTime(m.ts)} ${m.viewed ? '· visualizada' : ''}</div>`; if(m.from === 'them' && !m.viewed){ el.addEventListener('click', ()=> openEphemeralMessage(id,m.id)); el.style.cursor='pointer'; el.title='Abrir imagem (visível 20s e depois destruída)'; } } else if(m.type === 'video'){ el.innerHTML = `<div><div style=\"width:220px;height:120px;background:#000;border-radius:8px;display:flex;align-items:center;justify-content:center\">Vídeo (toque para assistir)</div></div><div class=\"meta-time\">${formatTime(m.ts)} ${m.viewed ? '· visualizado' : ''}</div>`; if(m.from === 'them' && !m.viewed){ el.addEventListener('click', ()=> openEphemeralMessage(id,m.id)); el.style.cursor='pointer'; el.title='Assistir vídeo (apaga ao término)'; } } box.appendChild(el); }); box.scrollTop = box.scrollHeight; }

  function openEphemeralMessage(contactId, msgId){ const conv = state.conversations[contactId] || []; const msg = conv.find(m=>m.id===msgId); if(!msg) return; const viewer = $('viewer'); const content = $('viewerContent'); const countdown = $('viewerCountdown'); content.innerHTML = ''; countdown.textContent='...'; let seconds; if(msg.type === 'text' || msg.type === 'image'){ seconds = state.MESSAGE_VISIBILITY_SECONDS; } else if(msg.type === 'video'){ seconds = msg.duration || Math.min(600, state.MESSAGE_VISIBILITY_SECONDS * 3); }

    if(msg.type === 'text'){ content.innerHTML = `<div style=\"font-size:18px;line-height:1.3\">${escapeHtml(msg.body)}</div>`; } else if(msg.type === 'image'){ content.innerHTML = `<img src=\"${msg.body}\" alt=\"Imagem efêmera\" style=\"max-width:100%;max-height:60vh;border-radius:8px\"/>`; } else if(msg.type === 'video'){ const vid = document.createElement('video'); vid.src = msg.body; vid.controls = true; vid.autoplay = true; vid.style.maxWidth='100%'; vid.style.maxHeight='60vh'; content.appendChild(vid); vid.addEventListener('ended', ()=> { destroyMessage(contactId,msgId); closeViewer(); }); }

    viewer.classList.add('active'); viewer.setAttribute('aria-hidden', 'false');

    if(msg.type === 'text' || msg.type === 'image'){
      let t = seconds; countdown.textContent = `${t}s`;
      const inte = setInterval(()=>{ t--; countdown.textContent = `${t}s`; if(t<=0){ clearInterval(inte); destroyMessage(contactId,msgId); closeViewer(); } },1000);
    } else { countdown.textContent = 'Reproduzindo...'; }

    msg.viewed = true; renderMessages();
  }

  function closeViewer(){ const v = $('viewer'); v.classList.remove('active'); v.setAttribute('aria-hidden','true'); $('viewerContent').innerHTML = ''; $('viewerCountdown').textContent='--'; }
  $('closeViewer').addEventListener('click', closeViewer);

  function destroyMessage(contactId,msgId){ const conv = state.conversations[contactId] || []; const idx = conv.findIndex(m=>m.id===msgId); if(idx>=0){ conv.splice(idx,1); } renderMessages(); renderContacts(); }

  $('sendBtn').addEventListener('click', sendComposer);
  $('composerText').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendComposer(); });
  $('attachBtn').addEventListener('click', ()=> $('composerFile').click());
  $('composerFile').addEventListener('change', handleFileAttach);

  function handleFileAttach(e){ const f = e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f); const allowedImage = f.type.startsWith('image/'); const allowedVideo = f.type.startsWith('video/'); const type = allowedImage ? 'image' : (allowedVideo ? 'video' : 'file'); const meta = { filename: f.name, duration: allowedVideo ? 10 : undefined }; sendMessage(type, url, meta); e.target.value = ''; }

  function sendComposer(){ const txt = $('composerText').value.trim(); if(!txt) return; sendMessage('text', txt); $('composerText').value = ''; }

  function sendMessage(type, body, meta={}){ const contactId = state.currentContactId; if(!contactId){ alert('Selecione um contato para enviar'); return; } const ts = nowISO(); const msg = { id: genId(), from:'me', type, body, ts, viewed: true, meta, expiresAt: addHours(ts, state.MESSAGE_EXPIRE_HOURS) }; state.conversations[contactId] = state.conversations[contactId] || []; state.conversations[contactId].push(msg); renderMessages(); }

  function scheduleExpiration(contactId, msgId, hours){ const ms = hours * 3600 * 1000; setTimeout(()=>{ const conv = state.conversations[contactId] || []; const idx = conv.findIndex(m=>m.id===msgId && !m.viewed); if(idx>=0){ conv.splice(idx,1); if(state.currentContactId === contactId) renderMessages(); renderContacts(); console.log('[EXPIRATION] mensagem não lida expirada', msgId); } }, Math.min(ms, 1000*60*60*24)); }

  $('deleteConversation').addEventListener('click', ()=>{ if(!state.currentContactId) return; showModal(`<h3>Confirmar exclusão</h3><p class=\"muted\">Apagar toda conversa localmente e solicitar expurgo no servidor. Esta ação é irreversível.</p>`, ()=>{ state.conversations[state.currentContactId] = []; hideModal(); renderMessages(); renderContacts(); }); });

  $('deleteAccount').addEventListener('click', ()=>{ showModal(`<h3>Excluir conta</h3><p class=\"muted\">Ao excluir sua conta, todos os dados no servidor serão destruídos (se implementado). Confirme para prosseguir.</p>`, ()=>{ state.me = null; state.contacts = []; state.conversations = {}; state.currentContactId = null; hideModal(); $('register').style.display='block'; renderContacts(); renderMessages(); renderCurrentInfo(); }); });

  function showModal(html, onConfirm){ $('modalBody').innerHTML = html; $('modalBack').classList.add('active'); $('modalBack').setAttribute('aria-hidden','false'); $('modalConfirm').onclick = onConfirm; $('modalCancel').onclick = hideModal; }
  function hideModal(){ $('modalBack').classList.remove('active'); $('modalBack').setAttribute('aria-hidden','true'); $('modalBody').innerHTML = ''; $('modalConfirm').onclick = null; }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
  function formatTime(ts){ const d = new Date(ts); return d.toLocaleString(); }

  $('applyExpire').addEventListener('click', ()=>{ const v = parseInt($('expireSelect').value,10); state.MESSAGE_EXPIRE_HOURS = v; alert('Expiração de mensagens não lidas configurada para ' + v + ' horas (simulação).'); });

  (function init(){ renderContacts(); document.addEventListener('visibilitychange', ()=>{ if(document.hidden) closeViewer(); }); console.log('VIO protótipo completo carregado.'); console.log('CHECKLIST DE PRODUÇÃO: implementar E2EE, expurgo server-side, URLs assinadas e proteção anti-screenshot.'); })();
})();
` }} />
    </>
  );
}