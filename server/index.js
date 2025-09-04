const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

(async () => {
  const redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('Redis Client Error', err));
  await redis.connect();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: false
  });

  app.post('/auth/send-otp', async (req, res) => {
    const { email, phone } = req.body;
    if (!email || !phone) return res.status(400).json({ error: 'email and phone required' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;
    await redis.set(otpKey, code, { EX: 600 });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@vio.test',
      to: email,
      subject: 'VIO Verification Code',
      text: `Your VIO verification code is ${code}`
    });
    return res.json({ ok: true });
  });

  app.post('/auth/verify-otp', async (req, res) => {
    const { email, code, displayName } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'email and code required' });
    const otpKey = `otp:${email}`;
    const saved = await redis.get(otpKey);
    if (saved !== code) return res.status(400).json({ error: 'invalid code' });
    await redis.del(otpKey);
    const userId = uuidv4();
    const userKey = `user:${userId}`;
    const user = { id: userId, email, displayName: displayName || null };
    await redis.set(userKey, JSON.stringify(user));
    await redis.set(`user_by_email:${email}`, userId);
    return res.json({ ok: true, user });
  });

  // Send ephemeral message: store in Redis with TTL (default 24h)
  app.post('/messages/send', async (req, res) => {
    const { from, to, type, payload, unopenedTtlHours } = req.body;
    if (!from || !to || !type || !payload) return res.status(400).json({ error: 'invalid body' });
    const id = uuidv4();
    const msgKey = `msg:${id}`;
    const ttlHours = unopenedTtlHours || 24;
    const ttlSeconds = Math.max(60, Math.floor(ttlHours * 3600));
    const message = { id, from, to, type, payload, createdAt: Date.now() };
    await redis.set(msgKey, JSON.stringify(message), { EX: ttlSeconds });
    await redis.lPush(`inbox:${to}`, id);
    return res.json({ ok: true, id });
  });

  // Poll messages (IDs only)
  app.get('/messages/poll', async (req, res) => {
    const { user } = req.query;
    if (!user) return res.status(400).json({ error: 'user required' });
    const ids = await redis.lRange(`inbox:${user}`, 0, -1);
    return res.json({ ok: true, ids });
  });

  // Open message: return payload and set short TTL (20s)
  app.post('/messages/open', async (req, res) => {
    const { user, id } = req.body;
    if (!user || !id) return res.status(400).json({ error: 'user and id required' });
    const msgKey = `msg:${id}`;
    const raw = await redis.get(msgKey);
    if (!raw) return res.status(404).json({ error: 'message not found or expired' });
    const message = JSON.parse(raw);
    if (message.to !== user) return res.status(403).json({ error: 'not authorized' });

    await redis.expire(msgKey, 20);
    await redis.lRem(`inbox:${user}`, 0, id);
    return res.json({ ok: true, message });
  });

  app.listen(PORT, () => console.log(`VIO relay running on ${PORT}`));
})();
