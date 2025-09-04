import Script from 'next/script';

export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="container">
          <div className="brand">
            <div className="logo" aria-hidden="true">VIO</div>
            <div>
              <h1 className="app-title">VIO — Privacidade Extrema</h1>
              <p className="app-sub">Mensagens efêmeras — visualização única</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container app-shell" role="application" aria-label="VIO Aplicativo">
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
            </div>

            <div id="profileSetup" className="hidden">
              <h3>Configurar perfil</h3>
              <div className="profile-row">
                <div id="profileAvatar" className="avatar">U</div>
                <div style={{flex:1}}>
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

          <div className="mt-10">
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
            <div className="form-row" style={{gap:8,marginTop:6}}>
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
          <div className="chat-header">
            <div className="left">
              <div id="headerAvatar" className="header-avatar">U</div>
              <div>
                <div id="currentContactName" className="chat-title">Selecione um contato</div>
                <div id="currentContactStatus" className="chat-sub">Status</div>
              </div>
            </div>
            <div>
              <button id="deleteConversation" className="btn ghost" title="Apagar conversa">Apagar</button>
              <button id="deleteAccount" className="btn danger" title="Excluir conta">Excluir</button>
            </div>
          </div>

          <div className="messages" id="messages" aria-live="polite" role="region" aria-label="Mensagens"></div>

          <div className="composer" role="region" aria-label="Compositor de mensagem">
            <button id="attachBtn" className="icon-btn" aria-label="Anexar">📎</button>
            <input id="composerText" type="text" placeholder="Escreva uma mensagem efêmera..." aria-label="Mensagem" />
            <button id="sendBtn" className="send-btn" aria-label="Enviar">Enviar</button>
            <input id="composerFile" type="file" accept="image/*,video/*,audio/*" className="hidden" aria-hidden="true" />
          </div>

          <div id="notice" className="notice" role="note">
            <strong>Importante:</strong> este é um protótipo visual. Integre E2EE, expurgo server-side e proteção anti-screenshot para produção.
          </div>
        </main>
      </div>

      <footer className="footer">Protótipo VIO — Mensagens efêmeras</footer>

      <div id="viewer" className="viewer" role="dialog" aria-modal="true" aria-hidden="true">
        <div className="panel card" role="document">
          <div className="justify-between">
            <div className="muted">Visualização efêmera — remove após término</div>
            <div className="countdown" id="viewerCountdown">--</div>
          </div>
          <div id="viewerContent" className="viewer-content"></div>
          <div className="panel-actions">
            <button id="closeViewer" className="btn ghost">Fechar</button>
          </div>
        </div>
      </div>

      <div id="modalBack" className="modal-back" role="dialog" aria-hidden="true">
        <div className="modal card-small" role="document" aria-live="polite">
          <div id="modalBody"></div>
          <div className="modal-actions">
            <button id="modalCancel" className="btn ghost">Cancelar</button>
            <button id="modalConfirm" className="btn">Confirmar</button>
          </div>
        </div>
      </div>

      <Script src="/vio-proto.js" strategy="afterInteractive" />
    </>
  );
}
