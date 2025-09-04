const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../email');
const { JWT_SECRET } = require('../config');

// Register: create user and send 6-digit code
router.post('/register', async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email || !phone) return res.status(400).json({ error: 'email and phone required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcrypt.hash(code, 10);

    const conn = await pool.getConnection();
    try {
      const [exists] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
      if (exists.length) return res.status(400).json({ error: 'email already registered' });
      await conn.query('INSERT INTO usuarios (email, phone, verification_hash) VALUES (?, ?, ?)', [email, phone, hashed]);
    } finally { conn.release(); }

    await sendVerificationEmail(email, code);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Verify code and optionally set password -> return JWT
router.post('/verify', async (req, res) => {
  try {
    const { email, code, password, displayName } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'email and code required' });

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT id, verification_hash FROM usuarios WHERE email = ?', [email]);
      if (!rows.length) return res.status(400).json({ error: 'user not found' });
      const user = rows[0];
      const ok = await bcrypt.compare(code, user.verification_hash || '');
      if (!ok) return res.status(400).json({ error: 'invalid code' });

      const updates = ['verified = 1', 'verification_hash = NULL'];
      const params = [];
      if (password) {
        const passHash = await bcrypt.hash(password, 10);
        updates.push('password = ?');
        params.push(passHash);
      }
      if (displayName) {
        updates.push('display_name = ?');
        params.push(displayName);
      }
      params.push(user.id);
      await conn.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, params);

      const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ ok: true, token });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Login with email + password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT id, password, verified FROM usuarios WHERE email = ?', [email]);
      if (!rows.length) return res.status(400).json({ error: 'invalid credentials' });
      const user = rows[0];
      if (!user.password) return res.status(400).json({ error: 'no password set, verify first' });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(400).json({ error: 'invalid credentials' });
      if (!user.verified) return res.status(400).json({ error: 'account not verified' });
      const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ ok: true, token });
    } finally { conn.release(); }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const parts = auth.split(' ');
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT id, email, display_name, balance FROM usuarios WHERE id = ?', [payload.id]);
      if (!rows.length) return res.status(404).json({ error: 'user not found' });
      return res.json({ ok: true, user: rows[0] });
    } finally { conn.release(); }
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
});

module.exports = router;
