const pool = require('../db');
const { table } = require('./dbHelpers');

// logEvent supports demo flag; if conn provided, expect conn and pass demo flag via details.__demo
async function logEvent({ userId = null, type, details = {}, conn = null, ip = null, demo = false }) {
  try {
    const detailsStr = JSON.stringify(details || {});
    const tname = table('events', demo);
    if (conn) {
      await conn.query(`INSERT INTO ${tname} (user_id, type, details, ip) VALUES (?, ?, ?, ?)` , [userId, type, detailsStr, ip]);
      return;
    }
    const c = await pool.getConnection();
    try {
      await c.query(`INSERT INTO ${tname} (user_id, type, details, ip) VALUES (?, ?, ?, ?)` , [userId, type, detailsStr, ip]);
    } finally { c.release(); }
  } catch (err) {
    console.error('logEvent error', err);
  }
}

module.exports = { logEvent };
