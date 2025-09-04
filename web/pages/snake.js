import React, { useEffect, useRef, useState } from 'react';
import '../styles/snake.css';

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/snake/api';

async function api(path, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(API_ROOT + path, opts);
  return res.json();
}

export default function SnakePage() {
  const canvasRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState('R$0.00');
  const [history, setHistory] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDest, setWithdrawDest] = useState('PIX-key');
  const [userIdInput, setUserIdInput] = useState('');

  // game refs
  const gameRef = useRef({});

  useEffect(() => {
    initGameRefs(gameRef);
    drawInitial(gameRef, canvasRef);
    // spawn initial coins
    for (let i = 0; i < 5; i++) spawnCoin(gameRef);
    draw(gameRef, canvasRef);
    // cleanup on unmount
    return () => stopGameLoop(gameRef);
  }, []);

  // API actions
  const createUser = async (username, phone, email) => {
    const res = await api('/users', 'POST', { username, phone, email });
    if (res.user) {
      setCurrentUser(res.user);
      setUserIdInput(String(res.user.id));
      appendHistory(`Usuário criado: id=${res.user.id} nome=${res.user.username}`);
      setBalance('R$' + Number((res.user.balance_cents||0)/100).toFixed(2));
    } else {
      alert('Erro ao criar usuário');
    }
  };

  const loadUser = async (id) => {
    const res = await api('/users/' + id);
    if (res.user) {
      setCurrentUser(res.user);
      setBalance('R$' + Number(res.balance_reais).toFixed(2));
      appendHistory(`Usuário carregado: id=${id} saldo R$${res.balance_reais}`);
      const rr = await api('/rounds/' + id);
      if (rr.rounds) setHistory(JSON.stringify(rr.rounds.slice(0,10), null, 2));
    } else {
      alert('Usuário não encontrado');
    }
  };

  const depositSim = async (amount) => {
    if (!currentUser) return alert('Crie/Carregue usuário primeiro');
    const res = await api('/deposit-simulate', 'POST', { user_id: currentUser.id, amount });
    if (res.success) {
      setBalance('R$' + Number(res.balance_reais).toFixed(2));
      appendHistory(`Depósito simulado R$${Number(amount).toFixed(2)}; novo saldo: R$${res.balance_reais}`);
    } else alert(JSON.stringify(res));
  };

  const startRound = async () => {
    if (!currentUser) return alert('Crie/Carregue usuário primeiro');
    const res = await api('/start-round', 'POST', { user_id: currentUser.id, bet: 5.0 });
    if (res.success) {
      gameRef.current.currentRoundId = res.round_id;
      setBalance('R$' + Number(res.balance_reais_after_deduct).toFixed(2));
      appendHistory(`Rodada iniciada (round_id=${res.round_id}) - aposta R$5.00`);
      resetGame(gameRef, canvasRef);
      runGameLoop(gameRef, canvasRef, setBalance, appendHistory);
    } else {
      alert('Erro ao iniciar rodada: ' + JSON.stringify(res));
    }
  };

  const finishRoundAPI = async (round_id, win, coinsCollected) => {
    const res = await api('/finish-round', 'POST', { round_id, result: win ? 'win' : 'lose', coins_collected: coinsCollected });
    return res;
  };

  const withdraw = async () => {
    if (!currentUser) return alert('Crie/Carregue usuário');
    const amount = parseFloat(withdrawAmount || '0');
    if (!amount || amount <= 0) return alert('Valor inválido');
    const res = await api('/withdraw', 'POST', { user_id: currentUser.id, amount_reais: amount, destination: withdrawDest });
    if (res.success) {
      setBalance('R$' + Number(res.balance_reais).toFixed(2));
      appendHistory(`Saque simulado R$${res.withdrawn_reais} destino:${withdrawDest}`);
    } else {
      alert('Erro saque: ' + JSON.stringify(res));
    }
  };

  function appendHistory(text) {
    setHistory((h) => (new Date()).toLocaleString() + ' - ' + text + '\n' + h);
  }

  // UI handlers
  const handleCreate = () => {
    const username = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    if (!username || !phone) return alert('Preencha nome e telefone');
    createUser(username, phone, email);
  };

  return (
    <div className="snake-page">
      <div className="snake-left">
        <h2 className="neon">Snake Money (Protótipo)</h2>
        <p>Crie usuário (protótipo) e simule depósitos. Em produção: integrar Pix real e segurança.</p>

        <div className="form-control">
          <label>Nome</label>
          <input id="username" placeholder="Seu nome (ex: Jorge)" />
          <label>Telefone</label>
          <input id="phone" placeholder="(xx)xxxxx-xxxx" />
          <label>Email (opcional)</label>
          <input id="email" placeholder="seu@email.com" />
          <button className="btn" onClick={handleCreate}>Criar Usuário</button>
        </div>

        <hr />

        <div>
          <label>Usuário atual (id)</label>
          <input value={userIdInput} onChange={e=>setUserIdInput(e.target.value)} placeholder="Selecione user e clique Load" />
          <div style={{display:'flex',gap:8,marginTop:6}}>
            <button className="btn small" onClick={() => loadUser(userIdInput)}>Load</button>
            <button className="btn small" onClick={() => depositSim(10.00)}>Depositar (simulado) R$10</button>
            <button className="btn small" onClick={() => { const amt = parseFloat(depositAmount||'0'); if (!amt) return alert('Valor inválido'); depositSim(amt); }}>Depositar custom</button>
          </div>
          <input value={depositAmount} onChange={e=>setDepositAmount(e.target.value)} placeholder="Valor p/ depositar (ex: 10.00)" />

          <div className="tile-row">
            <div className="tile">Saldo: <span id="balance">{balance}</span></div>
            <div className="tile">Aposta padrão: <strong>R$5,00</strong></div>
            <div className="tile">Saque mínimo: <strong>R$50,00</strong></div>
          </div>
        </div>

        <hr />

        <div>
          <button className="btn" onClick={startRound}>Iniciar rodada (apostar R$5)</button>
          <div style={{marginTop:8}}>
            <button className="btn small" onClick={withdraw}>Solicitar saque (simulado)</button>
            <input value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="Valor p/ saque (ex:50.00)" />
            <input value={withdrawDest} onChange={e=>setWithdrawDest(e.target.value)} placeholder="Destino (ex: banco/PIX key)" />
          </div>
        </div>

        <hr />
        <div>
          <h4>Regras rápidas</h4>
          <ul>
            <li>Depósito mínimo R$10 (simulado neste protótipo).</li>
            <li>Aposta padrão: R$5. Para iniciar a rodada o valor é deduzido.</li>
            <li>Cada moeda vale R$0,05. Precisa coletar 100 moedas (R$5) para ganhar a rodada.</li>
            <li>Ao coletar 5 moedas começam a aparecer obstáculos. Encostar = perdeu a rodada e perde a aposta.</li>
            <li>Saque disponível apenas a partir de R$50.</li>
          </ul>
        </div>

        <hr />
        <div>
          <h4>Histórico</h4>
          <div className="history-box" id="history">{history}</div>
        </div>
      </div>

      <div className="snake-right">
        <div style={{textAlign:'center'}}>
          <canvas ref={canvasRef} className="canvas-board" width={700} height={500} id="game" />
          <div style={{marginTop:8}} className="tile-row">
            <div className="tile">Moedas coletadas: <strong id="collected">0</strong></div>
            <div className="tile">Moedas necessárias: <strong id="needed">100</strong></div>
            <div className="tile">Velocidade: <strong id="speed">1.0</strong></div>
          </div>
          <div className="controls" style={{marginTop:8}}>
            <button className="btn small" onClick={() => { gameRef.current.paused = !gameRef.current.paused; }}>{'Pausar/Continuar'}</button>
            <button className="btn small" onClick={() => { resetGame(gameRef, canvasRef); draw(gameRef, canvasRef); }}>{'Reset'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------
// Game implementation (ported from prototype)
// -----------------------

function initGameRefs(gameRef) {
  gameRef.current.gridSize = 20;
  gameRef.current.canvasWidth = 700;
  gameRef.current.canvasHeight = 500;
  gameRef.current.tileCountX = Math.floor(gameRef.current.canvasWidth / gameRef.current.gridSize);
  gameRef.current.tileCountY = Math.floor(gameRef.current.canvasHeight / gameRef.current.gridSize);
  gameRef.current.snake = [{x: Math.floor(gameRef.current.tileCountX/2), y: Math.floor(gameRef.current.tileCountY/2)}];
  gameRef.current.dir = {x:1,y:0};
  gameRef.current.snakeLen = 5;
  gameRef.current.speed = 6;
  gameRef.current.frameInterval = 1000 / gameRef.current.speed;
  gameRef.current.lastFrame = 0;
  gameRef.current.coins = [];
  gameRef.current.obstacles = [];
  gameRef.current.collected = 0;
  gameRef.current.running = false;
  gameRef.current.paused = false;
  gameRef.current.coinsNeeded = Math.round(5 / 0.05);
  gameRef.current.coinValue = 0.05;
  gameRef.current.currentRoundId = null;
  gameRef.current.loopHandle = null;
}

function spawnCoin(gameRef) {
  const tileCountX = gameRef.current.tileCountX;
  const tileCountY = gameRef.current.tileCountY;
  for (let attempts=0; attempts<50; attempts++) {
    const x = Math.floor(Math.random()*tileCountX);
    const y = Math.floor(Math.random()*tileCountY);
    if (!gameRef.current.snake.some(s=>s.x===x && s.y===y) && !gameRef.current.coins.some(c=>c.x===x&&c.y===y) && !gameRef.current.obstacles.some(o=>o.x===x&&o.y===y)) {
      gameRef.current.coins.push({x,y});
      return;
    }
  }
}

function spawnObstacle(gameRef) {
  const tileCountX = gameRef.current.tileCountX;
  const tileCountY = gameRef.current.tileCountY;
  const len = 3 + Math.floor(Math.random()*4);
  const vertical = Math.random() < 0.5;
  const x = Math.floor(Math.random()*(tileCountX - (vertical?1:len)));
  const y = Math.floor(Math.random()*(tileCountY - (vertical?len:1)));
  for (let i=0;i<len;i++){
    gameRef.current.obstacles.push({x: vertical?x:x+i, y: vertical?y+i:y, ttl: 3000 + Math.floor(Math.random()*4000)});
  }
}

function resetGame(gameRef, canvasRef) {
  gameRef.current.snake = [{x: Math.floor(gameRef.current.tileCountX/2), y: Math.floor(gameRef.current.tileCountY/2)}];
  gameRef.current.dir = {x:1,y:0};
  gameRef.current.snakeLen = 5;
  gameRef.current.speed = 6;
  gameRef.current.frameInterval = 1000 / gameRef.current.speed;
  gameRef.current.coins = [];
  gameRef.current.obstacles = [];
  gameRef.current.collected = 0;
  gameRef.current.running = false;
  gameRef.current.paused = false;
  document.getElementById('collected').innerText = '0';
  document.getElementById('speed').innerText = gameRef.current.speed.toFixed(1);
}

function drawInitial(gameRef, canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

function draw(gameRef, canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // coins
  gameRef.current.coins.forEach(c => {
    ctx.fillStyle = '#ffd166';
    const cx = c.x * gameRef.current.gridSize + gameRef.current.gridSize/2;
    const cy = c.y * gameRef.current.gridSize + gameRef.current.gridSize/2;
    ctx.beginPath(); ctx.arc(cx, cy, gameRef.current.gridSize*0.35, 0, Math.PI*2); ctx.fill();
  });
  // obstacles
  gameRef.current.obstacles.forEach(o => {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(o.x*gameRef.current.gridSize, o.y*gameRef.current.gridSize, gameRef.current.gridSize, gameRef.current.gridSize);
  });
  // snake
  for (let i=0;i<gameRef.current.snake.length;i++){
    const s = gameRef.current.snake[i];
    ctx.fillStyle = i===0 ? '#4ade80' : '#38bdf8';
    ctx.fillRect(s.x*gameRef.current.gridSize+2, s.y*gameRef.current.gridSize+2, gameRef.current.gridSize-4, gameRef.current.gridSize-4);
  }
}

function stopGameLoop(gameRef) {
  gameRef.current.running = false;
  if (gameRef.current.loopHandle) cancelAnimationFrame(gameRef.current.loopHandle);
}

function runGameLoop(gameRef, canvasRef, setBalance, appendHistory) {
  gameRef.current.running = true;
  gameRef.current.lastFrame = 0;
  function loop(timestamp) {
    if (!gameRef.current.running) return;
    if (gameRef.current.paused) {
      gameRef.current.loopHandle = requestAnimationFrame(loop); return;
    }
    if (timestamp - gameRef.current.lastFrame < gameRef.current.frameInterval) { gameRef.current.loopHandle = requestAnimationFrame(loop); return; }
    gameRef.current.lastFrame = timestamp;
    // move
    const head = { x: (gameRef.current.snake[0].x + gameRef.current.dir.x + gameRef.current.tileCountX) % gameRef.current.tileCountX, y: (gameRef.current.snake[0].y + gameRef.current.dir.y + gameRef.current.tileCountY) % gameRef.current.tileCountY };
    // obstacles
    if (gameRef.current.obstacles.some(o=>o.x===head.x && o.y===head.y)) {
      endRound(false, gameRef, setBalance, appendHistory); return;
    }
    // self collision
    if (gameRef.current.snake.some((s,idx)=> idx>0 && s.x===head.x && s.y===head.y)) { endRound(false, gameRef, setBalance, appendHistory); return; }
    gameRef.current.snake.unshift(head);
    if (gameRef.current.snake.length > gameRef.current.snakeLen) gameRef.current.snake.pop();
    const coinIndex = gameRef.current.coins.findIndex(c=>c.x===head.x && c.y===head.y);
    if (coinIndex >= 0) {
      gameRef.current.coins.splice(coinIndex,1);
      gameRef.current.collected += 1;
      gameRef.current.snakeLen += 1;
      gameRef.current.speed += 0.05;
      gameRef.current.frameInterval = 1000 / gameRef.current.speed;
      document.getElementById('collected').innerText = String(gameRef.current.collected);
      document.getElementById('speed').innerText = gameRef.current.speed.toFixed(2);
      spawnCoin(gameRef);
      if (gameRef.current.collected >= 5 && Math.random() < 0.5) spawnObstacle(gameRef);
      if (gameRef.current.collected >= gameRef.current.coinsNeeded) { endRound(true, gameRef, setBalance, appendHistory); return; }
    }
    if (gameRef.current.coins.length < 3 && Math.random() < 0.6) spawnCoin(gameRef);
    gameRef.current.obstacles.forEach(o => { o.ttl -= gameRef.current.frameInterval; });
    gameRef.current.obstacles = gameRef.current.obstacles.filter(o => o.ttl > 0);
    draw(gameRef, canvasRef);
    gameRef.current.loopHandle = requestAnimationFrame(loop);
  }
  gameRef.current.loopHandle = requestAnimationFrame(loop);
  // keyboard
  function onKey(e) {
    if (!gameRef.current.running) return;
    if (e.key === 'ArrowUp' && gameRef.current.dir.y!==1) { gameRef.current.dir = {x:0,y:-1}; }
    if (e.key === 'ArrowDown' && gameRef.current.dir.y!==-1) { gameRef.current.dir = {x:0,y:1}; }
    if (e.key === 'ArrowLeft' && gameRef.current.dir.x!==1) { gameRef.current.dir = {x:-1,y:0}; }
    if (e.key === 'ArrowRight' && gameRef.current.dir.x!==-1) { gameRef.current.dir = {x:1,y:0}; }
  }
  window.addEventListener('keydown', onKey);
  // touch
  let xDown = null; let yDown = null;
  function tStart(evt){ const first = evt.touches[0]; xDown = first.clientX; yDown = first.clientY; }
  function tMove(evt){ if (!xDown || !yDown) return; const xUp = evt.touches[0].clientX; const yUp = evt.touches[0].clientY; const xDiff = xDown - xUp; const yDiff = yDown - yUp; if (Math.abs(xDiff) > Math.abs(yDiff)) { if (xDiff > 0 && gameRef.current.dir.x!==1) gameRef.current.dir = {x:-1,y:0}; else if (xDiff < 0 && gameRef.current.dir.x!==-1) gameRef.current.dir = {x:1,y:0}; } else { if (yDiff > 0 && gameRef.current.dir.y!==1) gameRef.current.dir = {x:0,y:-1}; else if (yDiff < 0 && gameRef.current.dir.y!==-1) gameRef.current.dir = {x:0,y:1}; } xDown = null; yDown = null; }
  const canvas = document.querySelector('#game');
  if (canvas) { canvas.addEventListener('touchstart', tStart, false); canvas.addEventListener('touchmove', tMove, false); }
  // cleanup handle
  gameRef.current._cleanup = () => { window.removeEventListener('keydown', onKey); if (canvas) { canvas.removeEventListener('touchstart', tStart); canvas.removeEventListener('touchmove', tMove); } };
}

async function endRound(win, gameRef, setBalance, appendHistory) {
  gameRef.current.running = false;
  const coinsCollected = gameRef.current.collected;
  const roundId = gameRef.current.currentRoundId;
  if (!roundId) { alert('Erro: round_id não definido. Inicie a rodada pelo painel.'); return; }
  try {
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/snake/api/finish-round', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ round_id: roundId, result: win ? 'win' : 'lose', coins_collected: coinsCollected }) });
    const data = await res.json();
    if (data.success) {
      if (win) {
        appendHistory(`Você ganhou a rodada! Payout R$${(5*2).toFixed(2)} saldo: R$${data.balance_reais}`);
        setBalance('R$' + Number(data.balance_reais).toFixed(2));
        alert('Parabéns! Você coletou ' + coinsCollected + ' moedas e ganhou a aposta!');
      } else {
        appendHistory('Você perdeu a rodada. Moedas coletadas: ' + coinsCollected + '.');
        alert('Você bateu em um obstáculo ou em si mesmo. Rodada perdida.');
        setBalance('R$' + Number(data.balance_reais).toFixed(2));
      }
    } else {
      alert('Erro ao finalizar rodada: ' + JSON.stringify(data));
    }
  } catch (e) { alert('Erro na finalização: ' + e); }
  gameRef.current.currentRoundId = null;
  if (gameRef.current._cleanup) gameRef.current._cleanup();
}

// expose some helpers for drawing initial state
function drawInitialBoard(gameRef, canvasRef) { draw(gameRef, canvasRef); }

// export helpers used above
function noop(){}

// keep function names referenced
const helpers = { spawnCoin, spawnObstacle, resetGame, draw, runGameLoop, stopGameLoop, drawInitial: drawInitialBoard };

// attach to module scope so functions above can call them
function spawnCoinWrapper(gr){ spawnCoin(gr); }
function spawnObstacleWrapper(gr){ spawnObstacle(gr); }

// ensure the helper functions are available in this module scope

export { helpers as gameHelpers };
