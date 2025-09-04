const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../utils/authMiddleware');

// Simulated deposit (pix/cartao)
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      await conn.query('UPDATE usuarios SET balance = balance + ? WHERE id = ?', [amount, userId]);
      await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [userId, 'deposit', amount, `method:${method || 'pix'}`]);
      const [u] = await conn.query('SELECT balance FROM usuarios WHERE id = ?', [userId]);
      return res.json({ ok: true, balance: u[0].balance });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Simulated withdraw (move from user balance out)
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT balance FROM usuarios WHERE id = ?', [userId]);
      const balance = parseFloat(rows[0].balance);
      if (balance < amount) return res.status(400).json({ error: 'insufficient funds' });
      await conn.query('UPDATE usuarios SET balance = balance - ? WHERE id = ?', [amount, userId]);
      await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [userId, 'withdraw', -amount, 'withdraw simulated']);
      const [u] = await conn.query('SELECT balance FROM usuarios WHERE id = ?', [userId]);
      return res.json({ ok: true, balance: u[0].balance });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
