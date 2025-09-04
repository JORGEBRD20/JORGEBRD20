const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const poolRoutes = require('./routes/pool');
const paymentsRoutes = require('./routes/payments');
const { startRaffle } = require('./raffle');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use('/auth', authRoutes);
app.use('/pool', poolRoutes);
app.use('/payments', paymentsRoutes);

// simple health
app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('ping', () => socket.emit('pong'));
});

// start raffle worker
startRaffle(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));

module.exports = { app, server, io };
