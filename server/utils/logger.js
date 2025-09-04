const pool = require('../db');

async function logEvent({ userId = null, type, details = {}, conn = null, ip = null }) {
  try {
    const detailsStr = JSON.stringify(details || {});
    if (conn) {
      await conn.query('INSERT INTO events (user_id, type, details, ip) VALUES (?, ?, ?, ?)', [userId, type, detailsStr, ip]);
      return;
    }
    const c = await pool.getConnection();
    try {
      await c.query('INSERT INTO events (user_id, type, details, ip) VALUES (?, ?, ?, ?)', [userId, type, detailsStr, ip]);
    } finally { c.release(); }
  } catch (err) {
    console.error('logEvent error', err);
  }
}

module.exports = { logEvent };
