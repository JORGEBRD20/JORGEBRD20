import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

let socket;

export default function Home() {
  const [poolBalance, setPoolBalance] = useState('R$ 0,00');
  const [userBalance, setUserBalance] = useState('R$ 0,00');
  const [squares, setSquares] = useState([]);
  const [roulette, setRoulette] = useState('Aguardando sorteio...');
  const [history, setHistory] = useState([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
    socket.on('connect', () => console.log('connected to socket'));
    socket.on('raffle_result', (payload) => {
      if (payload && payload.results && payload.results.length) {
        setRoulette('Sorteio: ' + payload.results.map(r => `#${r.slot}`).join(', '));
        setHistory(h => [{time: payload.time, results: payload.results}, ...h].slice(0,50));
        fetchStatus();
      } else {
        setRoulette('Nenhum vencedor neste ciclo');
      }
    });
    return () => socket.disconnect();
  }, []);

  async function fetchStatus() {
    try {
      const res = await axios.get((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/pool/status');
      if (res.data.ok) {
        setPoolBalance('R$ ' + Number(res.data.poolBalance).toFixed(2));
        setSquares(res.data.squares || []);
      }
      if (token) {
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
    if (res.data.ok && res.data.token) { setToken(res.data.token); localStorage.setItem('token', res.data.token); alert('Verificado e logado'); }
  }
  async function login() {
    const email = prompt('E-mail:');
    const password = prompt('Senha:');
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/auth/login', { email, password });
    if (res.data.ok && res.data.token) { setToken(res.data.token); localStorage.setItem('token', res.data.token); alert('Logado'); }
  }
  async function deposit() {
    if (!token) return alert('Faça login primeiro');
    const amount = parseFloat(prompt('Valor a depositar (ex: 100.00):'));
    if (!amount) return;
    const res = await axios.post((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/payments/deposit', { amount, method: 'pix' }, { headers: { Authorization: 'Bearer ' + token } });
    if (res.data.ok) { alert('Depósito simulado'); fetchStatus(); }
  }

  useEffect(() => { const t = localStorage.getItem('token'); if (t) setToken(t); }, []);

  return (
    <div>
      <header style={{background:'#007bff',color:'#fff',padding:20}}>
        <h1>PISCINA DE LIQUIDEZ</h1>
        <div style={{display:'flex',justifyContent:'space-around',marginTop:10}}>
          <div style={{background:'#0056b3',padding:20,borderRadius:5,color:'#fff',width:'45%'}}>
            <p>Liquidez da Piscina:</p>
            <p id="pool-balance">{poolBalance}</p>
          </div>
          <div style={{background:'#0056b3',padding:20,borderRadius:5,color:'#fff',width:'45%'}}>
            <p>Saldo do Cliente:</p>
            <p id="user-balance">{userBalance}</p>
          </div>
        </div>
      </header>

      <main>
        <div id="pool" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,padding:20}}>
          {Array.from({length:16}).map((_,i)=>{
            const slotNum = i+1;
            const sq = squares.find(s=>s.slot===slotNum) || {};
            const status = formatSlot(sq);
            const disabled = status === 'Alugado';
            return (
              <div key={slotNum} onClick={()=>!disabled && rent(slotNum)} style={{background: disabled ? '#6c757d' : '#007bff', color:'#fff', padding:20,borderRadius:5,cursor: disabled ? 'not-allowed':'pointer', position:'relative', textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:700}}>#{slotNum}</div>
                <div style={{marginTop:8}}>{status}</div>
                <div style={{position:'absolute',bottom:6,right:6,fontSize:12,color:'#fff'}} className="timer">{sq.rented_until? new Date(sq.rented_until).toLocaleTimeString():''}</div>
              </div>
            );
          })}
        </div>
      </main>

      <div id="roulette" style={{marginTop:20,fontSize:18,fontWeight:'bold',color:'#d32f2f'}}>{roulette}</div>

      <div id="history-container" style={{margin:'20px auto',padding:10,width:'90%',maxWidth:600,background:'#fff',border:'1px solid #ccc',borderRadius:5}}>
        <div id="history-title" style={{fontSize:16,fontWeight:'bold',color:'#333',marginBottom:10}}>Histórico de Números Sorteados</div>
        <div id="history" style={{fontSize:14,color:'#555'}}>{history.length? history.map((h,idx)=>(<div key={idx}>{new Date(h.time).toLocaleString()}: {h.results.map(r=>`#${r.slot} (R$ ${r.net})`).join(', ')}</div>)) : 'Nenhum número sorteado ainda.'}</div>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:20}}>
        <button onClick={sendCode}>Cadastrar</button>
        <button onClick={verify}>Confirmar Código</button>
        <button onClick={login}>Login</button>
        <button onClick={deposit}>Depositar</button>
      </div>
    </div>
  );
}
