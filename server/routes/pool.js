const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../utils/authMiddleware');
const { logEvent } = require('../utils/logger');
const { table } = require('../utils/dbHelpers');

// Return pool status and squares
router.get('/status', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const poolTable = table('piscina', req.user && req.user.demo);
      const quadTable = table('quadrados', req.user && req.user.demo);
      const [p] = await conn.query(`SELECT balance FROM ${poolTable} WHERE id = 1`);
      const [squares] = await conn.query(`SELECT id, slot, rented_by, rented_until FROM ${quadTable} ORDER BY slot`);
      return res.json({ ok: true, poolBalance: p[0].balance, squares });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Rent a square
router.post('/rent', authMiddleware, async (req, res) => {
  try {
    const { slot } = req.body;
    const userId = req.user.id;
    if (!slot) return res.status(400).json({ error: 'slot required' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const poolTable = table('piscina', req.user && req.user.demo);
      const quadTable = table('quadrados', req.user && req.user.demo);
      const histTable = table('historico', req.user && req.user.demo);

      const [userRows] = await conn.query('SELECT balance FROM usuarios WHERE id = ? FOR UPDATE', [userId]);
      if (!userRows.length) { await conn.rollback(); return res.status(404).json({ error: 'user not found' }); }
      const balance = parseFloat(userRows[0].balance);
      const cost = 50.00;
      if (balance < cost) { await conn.rollback(); return res.status(400).json({ error: 'insufficient balance' }); }

      // Check slot availability
      const [slotRows] = await conn.query(`SELECT id, rented_until FROM ${quadTable} WHERE slot = ? FOR UPDATE`, [slot]);
      if (!slotRows.length) { await conn.rollback(); return res.status(404).json({ error: 'slot not found' }); }
      const now = new Date();
      const rented_until = slotRows[0].rented_until;
      if (rented_until && new Date(rented_until) > now) { await conn.rollback(); return res.status(400).json({ error: 'slot currently rented' }); }

      // Deduct user balance and add to pool
      await conn.query('UPDATE usuarios SET balance = balance - ? WHERE id = ?', [cost, userId]);
      await conn.query(`UPDATE ${poolTable} SET balance = balance + ? WHERE id = 1`, [cost]);

      const until = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await conn.query(`UPDATE ${quadTable} SET rented_by = ?, rented_until = ? WHERE slot = ?`, [userId, until, slot]);
      await conn.query(`INSERT INTO ${histTable} (user_id, type, amount, details) VALUES (?, ?, ?, ?)`, [userId, 'rental', cost, `slot:${slot}`]);
      await logEvent({ userId, type: 'rent', details: { slot, cost }, conn, demo: !!(req.user && req.user.demo) });
      await conn.commit();

      // return new status
      return res.json({ ok: true, slot, until });
    } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// User history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      const histTable = table('historico', req.user && req.user.demo);
      const [rows] = await conn.query(`SELECT id, type, amount, details, created_at FROM ${histTable} WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`, [userId]);
      return res.json({ ok: true, history: rows });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
