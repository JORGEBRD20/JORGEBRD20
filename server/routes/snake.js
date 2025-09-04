const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();

// --- Database (SQLite local file inside server/)
const DBSOURCE = path.join(__dirname, '..', 'snake_money.db');
const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error('Erro ao conectar DB:', err);
    return;
  }
  console.log('Snake Money: conectado ao SQLite.');
});

// Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    phone TEXT,
    email TEXT,
    balance_cents INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    bet_cents INTEGER,
    result TEXT,
    coins_collected INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

function toCents(reais) { return Math.round(reais * 100); }
function toReais(cents) { return (cents / 100).toFixed(2); }

// Serve frontend HTML (mounted at /snake)
router.get('/', (req, res) => {
  res.type('html').send(htmlPage);
});

// API: create user
router.post('/api/users', (req, res) => {
  const { username, phone, email } = req.body;
  if (!username || !phone) return res.status(400).json({ error: 'username e phone obrigatórios' });
  const stmt = db.prepare(`INSERT INTO users (username, phone, email) VALUES (?, ?, ?)`);
  stmt.run(username, phone || null, email || null, function(err){
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT * FROM users WHERE id = ?`, [this.lastID], (e, row) => {
      res.json({ user: row });
    });
  });
});

// Get user
router.get('/api/users/:id', (req,res) => {
  db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id], (err,row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'user not found' });
    res.json({ user: row, balance_reais: toReais(row.balance_cents) });
  });
});

// Simulate deposit
router.post('/api/deposit-simulate', (req,res) => {
  const { user_id, amount } = req.body;
  const amountNum = parseFloat(amount);
  if (!user_id || isNaN(amountNum) || amountNum <= 0) return res.status(400).json({ error: 'user_id e amount válidos são necessários' });
  const cents = toCents(amountNum);
  db.run(`UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?`, [cents, user_id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT * FROM users WHERE id = ?`, [user_id], (e,row) => {
      res.json({ success: true, user: row, balance_reais: toReais(row.balance_cents) });
    });
  });
});

// Start round
router.post('/api/start-round', (req,res) => {
  const user_id = req.body.user_id;
  const bet_reais = parseFloat(req.body.bet) || 5.0;
  const bet_cents = toCents(bet_reais);
  if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });
  db.get(`SELECT balance_cents FROM users WHERE id = ?`, [user_id], (err,row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'user not found' });
    if (row.balance_cents < bet_cents) return res.status(400).json({ error: 'saldo insuficiente' });
    db.run(`UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?`, [bet_cents, user_id], function(e){
      if (e) return res.status(500).json({ error: e.message });
      db.run(`INSERT INTO rounds (user_id, bet_cents, result, coins_collected) VALUES (?, ?, ?, ?)`, [user_id, bet_cents, 'pending', 0], function(er){
        if (er) return res.status(500).json({ error: er.message });
        res.json({ success: true, round_id: this.lastID, balance_reais_after_deduct: toReais(row.balance_cents - bet_cents) });
      });
    });
  });
});

// Finish round
router.post('/api/finish-round', (req,res) => {
  const { round_id, result, coins_collected } = req.body;
  if (!round_id || !result) return res.status(400).json({ error: 'round_id e result obrigatórios' });
  db.get(`SELECT * FROM rounds WHERE id = ?`, [round_id], (err, round) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!round) return res.status(404).json({ error: 'round not found' });
    if (round.result !== 'pending') return res.status(400).json({ error: 'round já finalizado' });
    db.run(`UPDATE rounds SET result = ?, coins_collected = ? WHERE id = ?`, [result, coins_collected || 0, round_id], function(e){
      if (e) return res.status(500).json({ error: e.message });
      if (result === 'win') {
        const payout = round.bet_cents * 2;
        db.run(`UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?`, [payout, round.user_id], function(er){
          if (er) return res.status(500).json({ error: er.message });
          db.get(`SELECT balance_cents FROM users WHERE id = ?`, [round.user_id], (err2, user) => {
            res.json({ success: true, payout_reais: toReais(payout), balance_reais: toReais(user.balance_cents) });
          });
        });
      } else {
        db.get(`SELECT balance_cents FROM users WHERE id = ?`, [round.user_id], (err2, user) => {
          res.json({ success: true, balance_reais: toReais(user.balance_cents) });
        });
      }
    });
  });
});

// Withdraw
router.post('/api/withdraw', (req,res) => {
  const { user_id, amount_reais, destination } = req.body;
  const MIN_WITHDRAW = toCents(50);
  if (!user_id || !amount_reais || !destination) return res.status(400).json({ error: 'user_id, amount_reais e destination obrigatórios' });
  const amount_cents = toCents(parseFloat(amount_reais));
  if (isNaN(amount_cents) || amount_cents <= 0) return res.status(400).json({ error: 'amount inválido' });
  if (amount_cents < MIN_WITHDRAW) return res.status(400).json({ error: `Saque mínimo R$${toReais(MIN_WITHDRAW)}` });
  db.get(`SELECT balance_cents FROM users WHERE id = ?`, [user_id], (err,row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'user não encontrado' });
    if (row.balance_cents < amount_cents) return res.status(400).json({ error: 'saldo insuficiente' });
    db.run(`UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?`, [amount_cents, user_id], function(e){
      if (e) return res.status(500).json({ error: e.message });
      db.get(`SELECT balance_cents FROM users WHERE id = ?`, [user_id], (err2, u) => {
        res.json({ success: true, withdrawn_reais: toReais(amount_cents), balance_reais: toReais(u.balance_cents), note: 'transferência simulada. Implemente integração bancária em produção.' });
      });
    });
  });
});

// Rounds list
router.get('/api/rounds/:user_id', (req,res) => {
  db.all(`SELECT * FROM rounds WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.params.user_id], (err,rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ rounds: rows });
  });
});

module.exports = router;

// ------------------------------
// Frontend HTML served by GET /
// ------------------------------

const htmlPage = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Snake Money - Protótipo</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: Arial, sans-serif; background: linear-gradient(120deg,#0f172a,#0b1220); color: #fff; margin:0; padding:0; display:flex; gap:20px; height:100vh; }
    .left { width: 420px; padding:16px; box-sizing:border-box; background: rgba(255,255,255,0.03); border-right: 1px solid rgba(255,255,255,0.03); overflow:auto; }
    .right { flex:1; display:flex; align-items:center; justify-content:center; }
    input, button { padding:8px 10px; margin:6px 0; width:100%; box-sizing:border-box; border-radius:6px; border: none; }
    button { cursor:pointer; background: linear-gradient(90deg,#ff6b6b,#ffd166); color:#111; font-weight:bold; }
    .small { width:auto; padding:6px 10px; display:inline-block; }
    canvas { background:#071020; border:6px solid rgba(255,255,255,0.02); border-radius:12px; box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
    .hud { margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; }
    .tile { background: rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; min-width:120px; }
    .neon { text-shadow: 0 0 10px rgba(255,255,255,0.08), 0 0 20px rgba(255,255,255,0.04); font-weight:bold; }
    .danger { color:#ff6b6b; font-weight:bold; }
  </style>
</head>
<body>
  <div class="left">
    <h2 class="neon">Snake Money (Protótipo)</h2>
    <p>Crie usuário (protótipo) e simule depósitos. Em produção: integrar Pix real e segurança.</p>

    <div>
      <label>Nome</label>
      <input id="username" placeholder="Seu nome (ex: Jorge)">
      <label>Telefone</label>
      <input id="phone" placeholder="(xx)xxxxx-xxxx">
      <label>Email (opcional)</label>
      <input id="email" placeholder="seu@email.com">
      <button id="btn-create">Criar Usuário</button>
    </div>

    <hr>

    <div>
      <label>Usuário atual (id)</label>
      <input id="user-id" placeholder="Selecione user e clique Load" />
      <button id="btn-load" class="small">Load</button>
      <button id="btn-deposit" class="small">Depositar (simulado) R$10</button>
      <button id="btn-deposit-custom" class="small">Depositar custom</button>
      <input id="deposit-amount" placeholder="Valor p/ depositar (ex: 10.00)">
      <div class="hud">
        <div class="tile">Saldo: <span id="balance">R$0.00</span></div>
        <div class="tile">Aposta padrão: <strong>R$5,00</strong></div>
        <div class="tile danger">Saque mínimo: R$50,00</div>
      </div>
    </div>

    <hr>

    <div>
      <button id="btn-start-round">Iniciar rodada (apostar R$5)</button>
      <div style="margin-top:8px;">
        <button id="btn-withdraw" class="small">Solicitar saque (simulado)</button>
        <input id="withdraw-amount" placeholder="Valor p/ saque (ex:50.00)">
        <input id="withdraw-dest" placeholder="Destino (ex: banco/PIX key)">
      </div>
    </div>

    <hr>
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

    <hr>
    <div>
      <h4>Histórico</h4>
      <pre id="history" style="height:120px; overflow:auto; background:rgba(0,0,0,0.2); padding:8px; border-radius:6px;"></pre>
    </div>
  </div>

  <div class="right">
    <div style="text-align:center;">
      <canvas id="game" width="700" height="500"></canvas>
      <div style="margin-top:8px;">
        <span class="tile">Moedas coletadas: <strong id="collected">0</strong></span>
        <span class="tile">Moedas necessárias: <strong id="needed">100</strong></span>
        <span class="tile">Velocidade: <strong id="speed">1.0</strong></span>
      </div>
      <div style="margin-top:8px;">
        <button id="btn-pause" class="small">Pausar</button>
        <button id="btn-reset" class="small">Reset</button>
      </div>
    </div>
  </div>

<script>
/* Frontend logic uses API base /snake/api so it works when served under /snake */
const API_BASE = '/snake/api';
const API = {
  createUser: (data) => fetch(API_BASE + '/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  depositSim: (data) => fetch(API_BASE + '/deposit-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  startRound: (data) => fetch(API_BASE + '/start-round',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  finishRound: (data) => fetch(API_BASE + '/finish-round',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  withdraw: (data) => fetch(API_BASE + '/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  getUser: (id) => fetch(API_BASE + '/users/'+id).then(r=>r.json()),
  getRounds: (id) => fetch(API_BASE + '/rounds/'+id).then(r=>r.json())
};

let currentUser = null;
let currentRoundId = null;
const betAmount = 5.00; // R$5
const coinValue = 0.05; // R$0,05
const neededCoinsToWin = Math.round(5 / coinValue);
console.log('neededCoinsToWin', neededCoinsToWin);

document.getElementById('btn-create').onclick = async () => {
  const username = document.getElementById('username').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  if (!username || !phone) return alert('Preencha nome e telefone');
  const res = await API.createUser({ username, phone, email });
  if (res.user) {
    currentUser = res.user;
    document.getElementById('user-id').value = currentUser.id;
    await loadUser(currentUser.id);
    appendHistory('Usuário criado: id=' + currentUser.id + ' nome=' + currentUser.username);
  } else {
    alert('Erro ao criar usuário');
  }
};

document.getElementById('btn-load').onclick = async () => {
  const id = document.getElementById('user-id').value.trim();
  if (!id) return alert('Digite id do usuário');
  await loadUser(id);
};

async function loadUser(id) {
  const res = await API.getUser(id);
  if (res.user) {
    currentUser = res.user;
    document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais).toFixed(2);
    appendHistory('Usuário carregado: id=' + id + ' saldo R$' + res.balance_reais);
    const rr = await API.getRounds(id);
    if (rr.rounds) {
      document.getElementById('history').innerText = JSON.stringify(rr.rounds.slice(0,10), null, 2);
    }
  } else {
    alert('Usuário não encontrado');
  }
}

document.getElementById('btn-deposit').onclick = async () => {
  if (!currentUser) return alert('Crie/Carregue usuário primeiro');
  const res = await API.depositSim({ user_id: currentUser.id, amount: 10.00 });
  if (res.success) {
    document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais).toFixed(2);
    appendHistory('Depósito simulado R$10.00; novo saldo: R$' + res.balance_reais);
  } else alert(JSON.stringify(res));
};
document.getElementById('btn-deposit-custom').onclick = async () => {
  if (!currentUser) return alert('Crie/Carregue usuário primeiro');
  const amount = parseFloat(document.getElementById('deposit-amount').value || '0');
  if (!amount || amount <= 0) return alert('Valor inválido');
  const res = await API.depositSim({ user_id: currentUser.id, amount });
  if (res.success) {
    document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais).toFixed(2);
    appendHistory('Depósito simulado R$' + amount.toFixed(2) + '; novo saldo: R$' + res.balance_reais);
  } else alert(JSON.stringify(res));
};

document.getElementById('btn-start-round').onclick = async () => {
  if (!currentUser) return alert('Crie/Carregue usuário primeiro');
  const res = await API.startRound({ user_id: currentUser.id, bet: betAmount });
  if (res.success) {
    currentRoundId = res.round_id;
    document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais_after_deduct).toFixed(2);
    appendHistory('Rodada iniciada (round_id=' + currentRoundId + ') - aposta R$' + betAmount.toFixed(2));
    resetGame();
    runGame();
  } else {
    alert('Erro ao iniciar rodada: ' + JSON.stringify(res));
  }
};

document.getElementById('btn-withdraw').onclick = async () => {
  if (!currentUser) return alert('Crie/Carregue usuário');
  const amount = parseFloat(document.getElementById('withdraw-amount').value || '0');
  const dest = document.getElementById('withdraw-dest').value || 'PIX-key';
  if (!amount || amount <= 0) return alert('Valor inválido');
  const res = await API.withdraw({ user_id: currentUser.id, amount_reais: amount, destination: dest });
  if (res.success) {
    document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais).toFixed(2);
    appendHistory('Saque simulado R$' + res.withdrawn_reais + ' destino:' + dest);
  } else {
    alert('Erro saque: ' + JSON.stringify(res));
  }
};

function appendHistory(text) {
  const el = document.getElementById('history');
  el.innerText = (new Date()).toLocaleString() + ' - ' + text + '\n' + el.innerText;
}

/* ------------------------------
   Snake game implementation
   ------------------------------ */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let gridSize = 20;
let tileCountX = Math.floor(canvas.width / gridSize);
let tileCountY = Math.floor(canvas.height / gridSize);

let snake = [{x: Math.floor(tileCountX/2), y: Math.floor(tileCountY/2)}];
let dir = {x:1,y:0};
let snakeLen = 5;
let speed = 6; // frames per second baseline (will increase)
let frameInterval = 1000 / speed;
let lastFrame = 0;
let coins = [];
let obstacles = [];
let collected = 0;
let running = false;
let paused = false;
let coinsNeeded = neededCoinsToWin;
let coinValueLocal = ${coinValue}; // 0.05
let roundIdLocal = null;

document.getElementById('needed').innerText = coinsNeeded;
document.getElementById('collected').innerText = collected;

function spawnCoin() {
  for (let attempts=0; attempts<50; attempts++) {
    const x = Math.floor(Math.random()*tileCountX);
    const y = Math.floor(Math.random()*tileCountY);
    if (!snake.some(s=>s.x===x && s.y===y) && !coins.some(c=>c.x===x&&c.y===y) && !obstacles.some(o=>o.x===x&&o.y===y)) {
      coins.push({x,y});
      return;
    }
  }
}

function spawnObstacle() {
  const len = 3 + Math.floor(Math.random()*4);
  const vertical = Math.random() < 0.5;
  const x = Math.floor(Math.random()*(tileCountX - (vertical?1:len)));
  const y = Math.floor(Math.random()*(tileCountY - (vertical?len:1)));
  for (let i=0;i<len;i++){
    obstacles.push({x: vertical?x:x+i, y: vertical?y+i:y, ttl: 3000 + Math.floor(Math.random()*4000)});
  }
}

function resetGame() {
  snake = [{x: Math.floor(tileCountX/2), y: Math.floor(tileCountY/2)}];
  dir = {x:1,y:0};
  snakeLen = 5;
  speed = 6;
  frameInterval = 1000 / speed;
  coins = [];
  obstacles = [];
  collected = 0;
  running = false;
  paused = false;
  document.getElementById('collected').innerText = collected;
  document.getElementById('speed').innerText = speed.toFixed(1);
}

document.getElementById('btn-reset').onclick = () => {
  resetGame();
  draw();
};

document.getElementById('btn-pause').onclick = () => {
  paused = !paused;
  document.getElementById('btn-pause').innerText = paused ? 'Continuar' : 'Pausar';
};

window.addEventListener('keydown', (e) => {
  if (!running) return;
  if (e.key === 'ArrowUp' && dir.y!==1) { dir = {x:0,y:-1}; }
  if (e.key === 'ArrowDown' && dir.y!==-1) { dir = {x:0,y:1}; }
  if (e.key === 'ArrowLeft' && dir.x!==1) { dir = {x:-1,y:0}; }
  if (e.key === 'ArrowRight' && dir.x!==-1) { dir = {x:1,y:0}; }
});

canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
let xDown = null; let yDown = null;
function handleTouchStart(evt) { const first = evt.touches[0]; xDown = first.clientX; yDown = first.clientY; }
function handleTouchMove(evt) {
  if (!xDown || !yDown) return;
  const xUp = evt.touches[0].clientX; const yUp = evt.touches[0].clientY;
  const xDiff = xDown - xUp; const yDiff = yDown - yUp;
  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    if (xDiff > 0 && dir.x!==1) dir = {x:-1,y:0};
    else if (xDiff < 0 && dir.x!==-1) dir = {x:1,y:0};
  } else {
    if (yDiff > 0 && dir.y!==1) dir = {x:0,y:-1};
    else if (yDiff < 0 && dir.y!==-1) dir = {x:0,y:1};
  }
  xDown = null; yDown = null;
}

function runGame() {
  running = true;
  frameInterval = 1000 / speed;
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!running) return;
  if (paused) {
    requestAnimationFrame(gameLoop);
    return;
  }
  if (timestamp - lastFrame < frameInterval) {
    requestAnimationFrame(gameLoop); return;
  }
  lastFrame = timestamp;
  const head = { x: (snake[0].x + dir.x + tileCountX) % tileCountX, y: (snake[0].y + dir.y + tileCountY) % tileCountY };
  if (obstacles.some(o=>o.x===head.x && o.y===head.y)) {
    endRound(false);
    return;
  }
  if (snake.some((s,idx)=> idx>0 && s.x===head.x && s.y===head.y)) {
    endRound(false);
    return;
  }
  snake.unshift(head);
  if (snake.length > snakeLen) snake.pop();

  const coinIndex = coins.findIndex(c=>c.x===head.x && c.y===head.y);
  if (coinIndex >= 0) {
    coins.splice(coinIndex,1);
    collected += 1;
    snakeLen += 1;
    speed += 0.05;
    frameInterval = 1000 / speed;
    document.getElementById('collected').innerText = collected;
    document.getElementById('speed').innerText = speed.toFixed(2);
    spawnCoin();
    if (collected >= 5 && Math.random() < 0.5) spawnObstacle();
    if (collected >= coinsNeeded) {
      endRound(true);
      return;
    }
  }

  if (coins.length < 3 && Math.random() < 0.6) spawnCoin();

  const now = Date.now();
  obstacles.forEach(o => { o.ttl -= frameInterval; });
  obstacles = obstacles.filter(o => o.ttl > 0);

  draw();
  requestAnimationFrame(gameLoop);
}

function endRound(win) {
  running = false;
  const coinsCollected = collected;
  if (!currentRoundId) {
    alert('Erro: round_id não definido. Inicie a rodada pelo painel.');
    return;
  }
  API.finishRound({ round_id: currentRoundId, result: win ? 'win' : 'lose', coins_collected: coinsCollected })
    .then(res => {
      if (res.success) {
        if (win) {
          appendHistory('Você ganhou a rodada! Payout R$' + ( (betAmount * 2).toFixed(2) ) + ' saldo: R$' + (res.balance_reais || '0.00'));
          document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais).toFixed(2);
          alert('Parabéns! Você coletou ' + coinsCollected + ' moedas e ganhou a aposta!');
        } else {
          appendHistory('Você perdeu a rodada. Moedas coletadas: ' + coinsCollected + '.');
          alert('Você bateu em um obstáculo ou em si mesmo. Rodada perdida.');
          document.getElementById('balance').innerText = 'R$' + parseFloat(res.balance_reais).toFixed(2);
        }
      } else {
        alert('Erro ao finalizar rodada: ' + JSON.stringify(res));
      }
      currentRoundId = null;
    })
    .catch(e => alert('Erro na finalização: ' + e));
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let x=0;x<tileCountX;x++) for (let y=0;y<tileCountY;y++){
  }
  coins.forEach(c => {
    ctx.fillStyle = '#ffd166';
    const cx = c.x * gridSize + gridSize/2;
    const cy = c.y * gridSize + gridSize/2;
    ctx.beginPath();
    ctx.arc(cx, cy, gridSize*0.35, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = (gridSize*0.35)+'px sans-serif';
  });
  obstacles.forEach(o => {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(o.x*gridSize, o.y*gridSize, gridSize, gridSize);
  });
  for (let i=0;i<snake.length;i++){
    const s = snake[i];
    ctx.fillStyle = i===0 ? '#4ade80' : '#38bdf8';
    ctx.fillRect(s.x*gridSize+2, s.y*gridSize+2, gridSize-4, gridSize-4);
  }
}

for (let i=0;i<5;i++) spawnCoin();
draw();
</script>
</body>
</html>`;
