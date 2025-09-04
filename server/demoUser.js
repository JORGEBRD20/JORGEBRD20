const pool = require('./db');

let demoUserId = null;

async function ensureDemoUser() {
  const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@piscina.test';
  const DEMO_PHONE = process.env.DEMO_PHONE || '+5511999999999';
  const DEMO_NAME = process.env.DEMO_NAME || 'Demo User';
  const DEMO_BALANCE = parseFloat(process.env.DEMO_BALANCE || '1200.00');
  const DEMO_POOL_BALANCE = parseFloat(process.env.DEMO_POOL_BALANCE || '385000.00');

  const conn = await pool.getConnection();
  try {
    // ensure usuarios demo exists
    const [rows] = await conn.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [DEMO_EMAIL]);
    if (rows.length) {
      demoUserId = rows[0].id;
      // update balance to demo amount for demo user (do not overwrite if already higher?) we'll set to demo for demo mode
      await conn.query('UPDATE usuarios SET display_name = ?, phone = ?, verified = 1, balance = ? WHERE id = ?', [DEMO_NAME, DEMO_PHONE, DEMO_BALANCE, demoUserId]);
    } else {
      const [r] = await conn.query('INSERT INTO usuarios (email, phone, verified, display_name, balance) VALUES (?, ?, ?, ?, ?)', [DEMO_EMAIL, DEMO_PHONE, 1, DEMO_NAME, DEMO_BALANCE]);
      demoUserId = r.insertId;
    }

    // ensure piscina row exists and set demo balance
    const [p] = await conn.query('SELECT id FROM piscina WHERE id = 1');
    if (p.length) {
      await conn.query('UPDATE piscina SET balance = ? WHERE id = 1', [DEMO_POOL_BALANCE]);
    } else {
      await conn.query('INSERT INTO piscina (id, balance) VALUES (1, ?)', [DEMO_POOL_BALANCE]);
    }

    // ensure quadrados seeded (16 slots)
    for (let i = 1; i <= 16; i++) {
      await conn.query('INSERT INTO quadrados (slot) SELECT ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quadrados WHERE slot = ?)', [i, i]);
    }

    return demoUserId;
  } finally {
    conn.release();
  }
}

function getDemoUserId() { return demoUserId; }

module.exports = { ensureDemoUser, getDemoUserId };
