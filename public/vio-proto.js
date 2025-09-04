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

  if(!$) return;

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
      div.innerHTML = '<div class="avatar">'+c.avatar+'</div><div class="meta"><div class="name">'+c.name+'</div><div class="last muted">'+lastTxt+'</div></div>';
      div.addEventListener('click', ()=>{ openChat(c.id) });
      box.appendChild(div);
    });
  }
  document.addEventListener('input', function(e){ if(e.target && e.target.id==='searchContacts') renderContacts(e.target.value); });

  document.addEventListener('click', function(e){
    if(e.target && e.target.id==='addContactBtn'){
      showModal('<h3>Adicionar contato</h3><label>Nome</label><input id="modalInputName" placeholder="Nome do contato" style="width:100%;padding:8px;margin-top:6px"/><label style="margin-top:8px">Número (ex: +55...)</label><input id="modalInputPhone" placeholder="+55..." style="width:100%;padding:8px;margin-top:6px"/>',
      ()=>{
        const name = document.getElementById('modalInputName').value.trim() || 'Contato';
        const phone = document.getElementById('modalInputPhone').value.trim();
        const id = genId();
        const avatar = name[0]?.toUpperCase() || 'C';
        state.contacts.push({id,name,avatar,status:phone || ''});
        state.conversations[id] = [];
        renderContacts(); hideModal();
      });
    }
    if(e.target && e.target.id==='simulateIncoming'){
      if(!state.contacts.length){ alert('Adicione contatos primeiro'); return; }
      const random = state.contacts[Math.floor(Math.random()*state.contacts.length)];
      const msg = createIncoming(random.id, 'Mensagem simulada recebida em ' + new Date().toLocaleTimeString());
      state.conversations[random.id].push(msg);
      scheduleExpiration(random.id, msg.id, state.MESSAGE_EXPIRE_HOURS);
      if(state.currentContactId === random.id) renderMessages();
      renderContacts();
    }
  });

  function createIncoming(contactId, text){ const ts = nowISO(); return { id: genId(), from:'them', type:'text', body:text, ts, viewed:false, expiresAt: addHours(ts, state.MESSAGE_EXPIRE_HOURS) }; }

  function openChat(contactId){ state.currentContactId = contactId; renderCurrentInfo(); renderMessages(); }
  function renderCurrentInfo(){ const id = state.currentContactId; const elName = document.getElementById('currentContactName'); const elStatus = document.getElementById('currentContactStatus'); if(!id){ elName.textContent='Selecione um contato'; elStatus.textContent=''; return; } const c = state.contacts.find(x=>x.id===id); elName.textContent = c?.name || 'Contato'; elStatus.textContent = c?.status || ''; }

  function renderMessages(){ const id = state.currentContactId; const box = document.getElementById('messages'); box.innerHTML=''; if(!id) return; const conv = state.conversations[id] || []; conv.forEach(m=>{ const el = document.createElement('div'); el.className = 'message ' + (m.from==='me' ? 'me':'them'); el.dataset.msgid = m.id; if(m.type === 'text'){ el.innerHTML = '<div>'+escapeHtml(m.body)+'</div><div class="meta-time">'+formatTime(m.ts)+' '+(m.viewed ? '· visualizada' : '')+'</div>'; if(m.from === 'them' && !m.viewed){ el.addEventListener('click', ()=> openEphemeralMessage(id,m.id)); el.style.cursor='pointer'; el.title='Abrir mensagem (será destruída após visualização)'; } } else if(m.type === 'image'){ el.innerHTML = '<div><img src="'+m.body+'" alt="Imagem efêmera" style="max-width:100%;border-radius:8px"/></div><div class="meta-time">'+formatTime(m.ts)+' '+(m.viewed ? '· visualizada' : '')+'</div>'; if(m.from === 'them' && !m.viewed){ el.addEventListener('click', ()=> openEphemeralMessage(id,m.id)); el.style.cursor='pointer'; el.title='Abrir imagem (visível 20s e depois destruída)'; } } else if(m.type === 'video'){ el.innerHTML = '<div><div style="width:220px;height:120px;background:#000;border-radius:8px;display:flex;align-items:center;justify-content:center">Vídeo (toque para assistir)</div></div><div class="meta-time">'+formatTime(m.ts)+' '+(m.viewed ? '· visualizado' : '')+'</div>'; if(m.from === 'them' && !m.viewed){ el.addEventListener('click', ()=> openEphemeralMessage(id,m.id)); el.style.cursor='pointer'; el.title='Assistir vídeo (apaga ao término)'; } } box.appendChild(el); }); box.scrollTop = box.scrollHeight; }

  function openEphemeralMessage(contactId, msgId){ const conv = state.conversations[contactId] || []; const msg = conv.find(m=>m.id===msgId); if(!msg) return; const viewer = document.getElementById('viewer'); const content = document.getElementById('viewerContent'); const countdown = document.getElementById('viewerCountdown'); content.innerHTML = ''; countdown.textContent='...'; let seconds; if(msg.type === 'text' || msg.type === 'image'){ seconds = state.MESSAGE_VISIBILITY_SECONDS; } else if(msg.type === 'video'){ seconds = msg.duration || Math.min(600, state.MESSAGE_VISIBILITY_SECONDS * 3); }

    if(msg.type === 'text'){ content.innerHTML = '<div style="font-size:18px;line-height:1.3">'+escapeHtml(msg.body)+'</div>'; } else if(msg.type === 'image'){ content.innerHTML = '<img src="'+msg.body+'" alt="Imagem efêmera" style="max-width:100%;max-height:60vh;border-radius:8px"/>'; } else if(msg.type === 'video'){ const vid = document.createElement('video'); vid.src = msg.body; vid.controls = true; vid.autoplay = true; vid.style.maxWidth='100%'; vid.style.maxHeight='60vh'; content.appendChild(vid); vid.addEventListener('ended', ()=> { destroyMessage(contactId,msgId); closeViewer(); }); }

    viewer.classList.add('active'); viewer.setAttribute('aria-hidden', 'false');

    if(msg.type === 'text' || msg.type === 'image'){
      let t = seconds; countdown.textContent = t + 's';
      const inte = setInterval(()=>{ t--; countdown.textContent = t + 's'; if(t<=0){ clearInterval(inte); destroyMessage(contactId,msgId); closeViewer(); } },1000);
    } else { countdown.textContent = 'Reproduzindo...'; }

    msg.viewed = true; renderMessages();
  }

  function closeViewer(){ const v = document.getElementById('viewer'); v.classList.remove('active'); v.setAttribute('aria-hidden','true'); document.getElementById('viewerContent').innerHTML = ''; document.getElementById('viewerCountdown').textContent='--'; }
  document.getElementById('closeViewer').addEventListener('click', closeViewer);

  function destroyMessage(contactId,msgId){ const conv = state.conversations[contactId] || []; const idx = conv.findIndex(m=>m.id===msgId); if(idx>=0){ conv.splice(idx,1); } renderMessages(); renderContacts(); }

  document.getElementById('sendBtn').addEventListener('click', sendComposer);
  document.getElementById('composerText').addEventListener('keydown', (e)=>{ if(e.key==='Enter') sendComposer(); });
  document.getElementById('attachBtn').addEventListener('click', ()=> document.getElementById('composerFile').click());
  document.getElementById('composerFile').addEventListener('change', handleFileAttach);

  function handleFileAttach(e){ const f = e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f); const allowedImage = f.type.startsWith('image/'); const allowedVideo = f.type.startsWith('video/'); const type = allowedImage ? 'image' : (allowedVideo ? 'video' : 'file'); const meta = { filename: f.name, duration: allowedVideo ? 10 : undefined }; sendMessage(type, url, meta); e.target.value = ''; }

  function sendComposer(){ const txt = document.getElementById('composerText').value.trim(); if(!txt) return; sendMessage('text', txt); document.getElementById('composerText').value = ''; }

  function sendMessage(type, body, meta={}){ const contactId = state.currentContactId; if(!contactId){ alert('Selecione um contato para enviar'); return; } const ts = nowISO(); const msg = { id: genId(), from:'me', type, body, ts, viewed: true, meta, expiresAt: addHours(ts, state.MESSAGE_EXPIRE_HOURS) }; state.conversations[contactId] = state.conversations[contactId] || []; state.conversations[contactId].push(msg); renderMessages(); }

  function scheduleExpiration(contactId, msgId, hours){ const ms = hours * 3600 * 1000; setTimeout(()=>{ const conv = state.conversations[contactId] || []; const idx = conv.findIndex(m=>m.id===msgId && !m.viewed); if(idx>=0){ conv.splice(idx,1); if(state.currentContactId === contactId) renderMessages(); renderContacts(); console.log('[EXPIRATION] mensagem não lida expirada', msgId); } }, Math.min(ms, 1000*60*60*24)); }

  document.getElementById('deleteConversation').addEventListener('click', ()=>{ if(!state.currentContactId) return; showModal('<h3>Confirmar exclusão</h3><p class="muted">Apagar toda conversa localmente e solicitar expurgo no servidor. Esta ação é irreversível.</p>', ()=>{ state.conversations[state.currentContactId] = []; hideModal(); renderMessages(); renderContacts(); }); });

  document.getElementById('deleteAccount').addEventListener('click', ()=>{ showModal('<h3>Excluir conta</h3><p class="muted">Ao excluir sua conta, todos os dados no servidor serão destruídos (se implementado). Confirme para prosseguir.</p>', ()=>{ state.me = null; state.contacts = []; state.conversations = {}; state.currentContactId = null; hideModal(); document.getElementById('register').style.display='block'; renderContacts(); renderMessages(); renderCurrentInfo(); }); });

  function showModal(html, onConfirm){ document.getElementById('modalBody').innerHTML = html; document.getElementById('modalBack').classList.add('active'); document.getElementById('modalBack').setAttribute('aria-hidden','false'); document.getElementById('modalConfirm').onclick = onConfirm; document.getElementById('modalCancel').onclick = hideModal; }
  function hideModal(){ document.getElementById('modalBack').classList.remove('active'); document.getElementById('modalBack').setAttribute('aria-hidden','true'); document.getElementById('modalBody').innerHTML = ''; document.getElementById('modalConfirm').onclick = null; }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
  function formatTime(ts){ const d = new Date(ts); return d.toLocaleString(); }

  document.getElementById('applyExpire').addEventListener('click', ()=>{ const v = parseInt(document.getElementById('expireSelect').value,10); state.MESSAGE_EXPIRE_HOURS = v; alert('Expiração de mensagens não lidas configurada para ' + v + ' horas (simulação).'); });

  (function init(){ renderContacts(); document.addEventListener('visibilitychange', ()=>{ if(document.hidden) closeViewer(); }); console.log('VIO protótipo completo carregado.'); console.log('CHECKLIST DE PRODUÇÃO: implementar E2EE, expurgo server-side, URLs assinadas e proteção anti-screenshot.'); })();
})();
