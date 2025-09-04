const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../utils/authMiddleware');
const { logEvent } = require('../utils/logger');
const { table } = require('../utils/dbHelpers');

// Legacy endpoints kept for compatibility
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      const histTable = table('historico', req.user && req.user.demo);
      const usersTable = req.user && req.user.demo ? 'usuarios' : 'usuarios';
      await conn.query('UPDATE usuarios SET balance = balance + ? WHERE id = ?', [amount, userId]);
      await conn.query(`INSERT INTO ${histTable} (user_id, type, amount, details) VALUES (?, ?, ?, ?)`, [userId, 'deposit', amount, `method:${method || 'pix'}`]);
      await logEvent({ userId, type: 'deposit', details: { amount, method: method || 'pix' }, conn, demo: !!(req.user && req.user.demo) });
      const [u] = await conn.query('SELECT balance FROM usuarios WHERE id = ?', [userId]);
      return res.json({ ok: true, balance: u[0].balance });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Set PIX key for user
router.post('/pix/key', authMiddleware, async (req, res) => {
  try {
    const { pixKey, type } = req.body;
    if (!pixKey) return res.status(400).json({ error: 'pixKey required' });
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      // upsert into proper table (demo or real)
      const pixTable = table('pix_keys', req.user && req.user.demo);
      await conn.query(`INSERT INTO ${pixTable} (user_id, pix_key, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE pix_key = VALUES(pix_key), type = VALUES(type)`, [userId, pixKey, type || null]);
      await logEvent({ userId, type: 'set_pix_key', details: { pixKey, type } , conn, demo: !!(req.user && req.user.demo) });
      return res.json({ ok: true });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

router.get('/pix/key', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      const pixTable = table('pix_keys', req.user && req.user.demo);
      const [rows] = await conn.query(`SELECT pix_key, type, created_at FROM ${pixTable} WHERE user_id = ?`, [userId]);
      if (!rows.length) return res.json({ ok: true, pixKey: null });
      return res.json({ ok: true, pixKey: rows[0] });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Create a Pix deposit intent (simulated). Returns a reference and simulated payload (user should send Pix to this reference)
router.post('/pix/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      const [r] = await conn.query('INSERT INTO transactions (user_id, type, method, amount, status, details) VALUES (?, ?, ?, ?, ?, ?)', [userId, 'deposit', 'pix', amount, 'pending', JSON.stringify({})]);
      const txId = r.insertId;
      const reference = `PIX-${txId}-${Date.now()}`;
      await conn.query('UPDATE transactions SET reference = ? WHERE id = ?', [reference, txId]);
      // Simulate immediate confirmation for prototype: credit user and mark transaction completed
      await conn.beginTransaction();
      try {
        await conn.query('UPDATE usuarios SET balance = balance + ? WHERE id = ?', [amount, userId]);
        await conn.query('UPDATE piscina SET balance = balance + ? WHERE id = 1', [amount]);
        await conn.query('UPDATE transactions SET status = ?, details = ? WHERE id = ?', ['completed', JSON.stringify({ reference }), txId]);
        await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [userId, 'deposit', amount, `pix_ref:${reference}`]);
        await logEvent({ userId, type: 'pix_deposit', details: { txId, amount, reference }, conn });
        await conn.commit();
      } catch (err) { await conn.rollback(); throw err; }

      return res.json({ ok: true, reference, txId });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Admin or simulator endpoint to confirm a deposit (keeps for completeness)
router.post('/pix/deposit/confirm', async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ error: 'reference required' });
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT id, user_id, amount, status FROM transactions WHERE reference = ? AND type = ? LIMIT 1', [reference, 'deposit']);
      if (!rows.length) return res.status(404).json({ error: 'transaction not found' });
      const tx = rows[0];
      if (tx.status === 'completed') return res.json({ ok: true, message: 'already completed' });
      await conn.beginTransaction();
      try {
        await conn.query('UPDATE usuarios SET balance = balance + ? WHERE id = ?', [tx.amount, tx.user_id]);
        await conn.query('UPDATE piscina SET balance = balance + ? WHERE id = 1', [tx.amount]);
        await conn.query('UPDATE transactions SET status = ?, details = ? WHERE id = ?', ['completed', JSON.stringify({ confirmed_at: new Date() }), tx.id]);
        await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [tx.user_id, 'deposit', tx.amount, `pix_ref:${reference}`]);
        await logEvent({ userId: tx.user_id, type: 'pix_deposit_confirm', details: { txId: tx.id, amount: tx.amount, reference }, conn });
        await conn.commit();
      } catch (err) { await conn.rollback(); throw err; }
      return res.json({ ok: true });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Withdraw via Pix (simulated): checks pix key exists and balance, creates transaction and processes immediately (simulated transfer)
router.post('/pix/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const userId = req.user.id;
    const conn = await pool.getConnection();
    try {
      const [urows] = await conn.query('SELECT balance FROM usuarios WHERE id = ? FOR UPDATE', [userId]);
      if (!urows.length) return res.status(404).json({ error: 'user not found' });
      const balance = parseFloat(urows[0].balance);
      if (balance < amount) return res.status(400).json({ error: 'insufficient funds' });
      const [pixRows] = await conn.query('SELECT pix_key FROM pix_keys WHERE user_id = ?', [userId]);
      if (!pixRows.length) return res.status(400).json({ error: 'pix key not set' });
      const pixKey = pixRows[0].pix_key;

      // create transaction and process
      const [r] = await conn.query('INSERT INTO transactions (user_id, type, method, amount, status, details) VALUES (?, ?, ?, ?, ?, ?)', [userId, 'withdraw', 'pix', amount, 'pending', JSON.stringify({ pixKey })]);
      const txId = r.insertId;

      await conn.beginTransaction();
      try {
        // deduct user balance and pool (pool pays out)
        await conn.query('UPDATE usuarios SET balance = balance - ? WHERE id = ?', [amount, userId]);
        await conn.query('UPDATE piscina SET balance = balance - ? WHERE id = 1', [amount]);
        await conn.query('UPDATE transactions SET status = ?, reference = ? WHERE id = ?', ['completed', `WDX-${txId}-${Date.now()}`, txId]);
        await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [userId, 'withdraw', -amount, `pix:${pixKey}`]);
        await logEvent({ userId, type: 'pix_withdraw', details: { txId, amount, pixKey }, conn });
        await conn.commit();
      } catch (err) { await conn.rollback(); throw err; }

      return res.json({ ok: true, txId });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
