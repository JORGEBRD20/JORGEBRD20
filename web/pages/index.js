import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

export default function Home() {
  const DEMO_POOL = 385000.00;
  const DEMO_USER_BALANCE = 1200.00;

  const [poolBalance, setPoolBalance] = useState('R$ 0,00');
  const [userBalance, setUserBalance] = useState('R$ 0,00');
  const [squares, setSquares] = useState([]);
  const [roulette, setRoulette] = useState('Aguardando sorteio...');
  const [history, setHistory] = useState([]);
  const [token, setToken] = useState('');
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
    s.on('connect', () => console.log('connected to socket'));
    s.on('raffle_result', (payload) => {
      if (payload && payload.results && payload.results.length) {
        setRoulette('Sorteio: ' + payload.results.map(r => `#${r.slot}`).join(', '));
        setHistory(h => [{time: payload.time, results: payload.results}, ...h].slice(0,50));
        fetchStatus();
      } else {
        setRoulette('Nenhum vencedor neste ciclo');
      }
    });
    return () => s.disconnect();
  }, []);

  async function fetchStatus() {
    try {
      // If no authenticated user, show demo values instead of calling API
      if (!token) {
        setIsDemo(true);
        setPoolBalance('R$ ' + Number(DEMO_POOL).toFixed(2));
        setUserBalance('R$ ' + Number(DEMO_USER_BALANCE).toFixed(2));
        // do not fetch squares for demo (keep empty or default)
        setSquares([]);
        return;
      }

      setIsDemo(false);
      const res = await axios.get((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/pool/status', { headers: { Authorization: 'Bearer ' + token } }).catch(async (err) => {
        // if token is invalid, clear it and fall back to demo
        console.error('fetchStatus error', err);
        setToken('');
        localStorage.removeItem('token');
        setIsDemo(true);
        setPoolBalance('R$ ' + Number(DEMO_POOL).toFixed(2));
        setUserBalance('R$ ' + Number(DEMO_USER_BALANCE).toFixed(2));
      });
      if (res && res.data && res.data.ok) {
        setPoolBalance('R$ ' + Number(res.data.poolBalance).toFixed(2));
        setSquares(res.data.squares || []);
        // fetch user balance
        const me = await axios.get((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/me', { headers: { Authorization: 'Bearer ' + token } }).catch(()=>null);
        if (me && me.data && me.data.user) setUserBalance('R$ ' + Number(me.data.user.balance).toFixed(2));
      }
    } catch (err) { console.error(err); }
  }

  useEffect(() => { fetchStatus(); const timer = setInterval(fetchStatus, 5000); return () => clearInterval(timer); }, [token]);

  function formatSlot(sq) {
    if (!sq.rented_until) return 'Livre';
    const until = new Date(sq.rented_until);
    const now = new Date();
    if (until > now) return 'Alugado';
    return 'Livre';
  }

  async function rent(slot) {
    if (!token) return alert('Faça login ou verifique sua conta primeiro');
    try {
      const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/pool/rent', { slot }, { headers: { Authorization: 'Bearer ' + token } });
      if (res.data.ok) {
        alert('Slot reservado!');
        fetchStatus();
      }
    } catch (err) { alert(err.response?.data?.error || 'Erro ao alugar'); }
  }

  // Simple UI actions (register/verify/login/deposit)
  async function sendCode() {
    const email = prompt('E-mail para cadastro:');
    const phone = prompt('Telefone (DDI+DDD+num):');
    if (!email || !phone) return;
    await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/register', { email, phone });
    alert('Código enviado por e-mail.');
  }
  async function verify() {
    const email = prompt('E-mail cadastrado:');
    const code = prompt('Código de 6 dígitos:');
    const password = prompt('Defina uma senha (para login futuro):');
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/verify', { email, code, password });
    if (res.data.ok && res.data.token) { setToken(res.data.token); localStorage.setItem('token', res.data.token); alert('Verificado e logado'); fetchStatus(); }
  }
  async function login() {
    const email = prompt('E-mail:');
    const password = prompt('Senha:');
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/login', { email, password });
    if (res.data.ok && res.data.token) { setToken(res.data.token); localStorage.setItem('token', res.data.token); alert('Logado'); fetchStatus(); }
  }

  async function deposit() {
    if (!token) return alert('Faça login primeiro');
    const amount = parseFloat(prompt('Valor a depositar (ex: 100.00):'));
    if (!amount) return;
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/payments/deposit', { amount, method: 'pix' }, { headers: { Authorization: 'Bearer ' + token } });
    if (res.data.ok) { alert('Dep��sito simulado'); fetchStatus(); }
  }

  async function setPixKey() {
    if (!token) return alert('Faça login primeiro');
    const pixKey = prompt('Informe sua chave PIX (CPF/CNPJ/e-mail/telefone/chave aleatória):');
    if (!pixKey) return;
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/payments/pix/key', { pixKey }, { headers: { Authorization: 'Bearer ' + token } });
    if (res.data.ok) { alert('Chave PIX registrada'); }
  }

  async function depositPix() {
    if (!token) return alert('Faça login primeiro');
    const amount = parseFloat(prompt('Valor a depositar via PIX (ex: 100.00):'));
    if (!amount) return;
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/payments/pix/deposit', { amount }, { headers: { Authorization: 'Bearer ' + token } });
    if (res.data.ok) { alert('Depósito via PIX confirmado (simulado). Ref: ' + res.data.reference); fetchStatus(); }
  }

  async function withdrawPix() {
    if (!token) return alert('Faça login primeiro');
    const amount = parseFloat(prompt('Valor a sacar via PIX (ex: 100.00):'));
    if (!amount) return;
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/payments/pix/withdraw', { amount }, { headers: { Authorization: 'Bearer ' + token } });
    if (res.data.ok) { alert('Saque via PIX executado (simulado). Tx: ' + res.data.txId); fetchStatus(); }
  }

  useEffect(() => { const t = localStorage.getItem('token'); if (t) setToken(t); }, []);

  return (
    <div>
      <header className="header-bar">
        <div className="header-top">
          <img
            className="app-logo"
            src="https://cdn.builder.io/api/v1/image/assets%2F531b084ebdc643e28c7df8016e69db42%2F80cee58d84aa4ed294a3b9c7c92446c1?format=webp&width=800"
            alt="Piscina de Liquidez"
          />
          <div className="action-row header-actions">
            <button className="action-button" onClick={sendCode}>Cadastrar</button>
            <button className="action-button" onClick={verify}>Confirmar Código</button>
            <button className="action-button" onClick={login}>Login</button>
            <button className="action-button" onClick={setPixKey}>Configurar PIX</button>
            <button className="action-button" onClick={depositPix}>Depositar (PIX)</button>
            <button className="action-button" onClick={withdrawPix}>Sacar (PIX)</button>
          </div>
        </div>

        {isDemo && (
          <div className="demo-banner">CONTA DEMONSTRATIVA — Valores fictícios: saldo do usuário R$ {Number(DEMO_USER_BALANCE).toFixed(2)} e liquidez da piscina R$ {Number(DEMO_POOL).toFixed(2)}. Cadastre-se para ver valores reais.</div>
        )}

        <div className="balance-row">
          <div className="balance-card">
            <p>Liquidez da Piscina:</p>
            <p id="pool-balance" className="balance-value">{poolBalance}</p>
          </div>
          <div className="balance-card">
            <p>Saldo do Cliente:</p>
            <p id="user-balance" className="balance-value">{userBalance}</p>
          </div>
        </div>
      </header>

      <main>
        <div id="pool" className="pool-grid">
          {Array.from({length:16}).map((_,i)=>{
            const slotNum = i+1;
            const sq = squares.find(s=>s.slot===slotNum) || {};
            const status = formatSlot(sq);
            const disabled = status === 'Alugado';
            return (
              <div key={slotNum} onClick={()=>!disabled && rent(slotNum)} className={`slot-card ${disabled? 'slot-disabled':''}`}>
                <div className="slot-number">#{slotNum}</div>
                <div className="slot-status">{status}</div>
                <div className="timer">{sq.rented_until? new Date(sq.rented_until).toLocaleTimeString():''}</div>
              </div>
            );
          })}
        </div>
      </main>

      <div id="roulette" className="roulette-text">{roulette}</div>

      <div id="history-container" className="history-container">
        <div className="history-title">Histórico de Números Sorteados</div>
        <div className="history-list">{history.length? history.map((h,idx)=>(<div key={idx}>{new Date(h.time).toLocaleString()}: {h.results.map(r=>`#${r.slot} (R$ ${r.net})`).join(', ')}</div>)) : 'Nenhum número sorteado ainda.'}</div>
      </div>
    </div>
  );
}
