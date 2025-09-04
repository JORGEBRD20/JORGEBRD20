const pool = require('../db');
const bcrypt = require('bcrypt');
const { logEvent } = require('../utils/logger');

async function createDemo() {
  const email = process.env.DEMO_EMAIL || 'demo@piscina.test';
  const password = process.env.DEMO_PASSWORD || 'demo1234';
  const phone = process.env.DEMO_PHONE || '+5511999999999';
  const displayName = process.env.DEMO_NAME || 'Demo User';
  const initialBalance = parseFloat(process.env.DEMO_BALANCE || '1000.00');

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (rows.length) {
      console.log('Demo user already exists with id:', rows[0].id);
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const [r] = await conn.query('INSERT INTO usuarios (email, phone, password, verified, display_name, balance) VALUES (?, ?, ?, ?, ?, ?)', [email, phone, hash, 1, displayName, initialBalance]);
    const userId = r.insertId;
    console.log('Created demo user id:', userId, 'email:', email, 'password:', password);

    await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [userId, 'seed_balance', initialBalance, 'Initial demo balance']);
    await logEvent({ userId, type: 'demo_user_created', details: { email, initialBalance } });
  } catch (err) {
    console.error('Error creating demo user', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit();
  }
}

createDemo();
