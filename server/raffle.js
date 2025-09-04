const pool = require('./db');
const { logEvent } = require('./utils/logger');
const { table } = require('./utils/dbHelpers');

// raffle runs every 10 seconds
function startRaffle(io) {
  setInterval(async () => {
    try {
      const conn = await pool.getConnection();
      try {
        const now = new Date();

        // Process real pool
        const [rows] = await conn.query('SELECT q.slot, q.rented_by FROM quadrados q WHERE q.rented_until > ?', [now]);
        await processRaffleBatch(conn, rows, false, io);

        // Process demo pool
        const demoQuad = table('quadrados', true);
        const [drows] = await conn.query(`SELECT q.slot, q.rented_by FROM ${demoQuad} q WHERE q.rented_until > ?`, [now]);
        await processRaffleBatch(conn, drows, true, io);

      } finally { conn.release(); }
    } catch (err) {
      console.error('Raffle error', err);
    }
  }, 10000);
}

async function processRaffleBatch(conn, rows, demo, io) {
  if (!rows || !rows.length) return;
  const winners = [];
  for (const r of rows) {
    const chance = Math.random();
    if (chance < 0.49) winners.push(r);
  }
  const results = [];
  if (winners.length) {
    await conn.beginTransaction();
    try {
      const poolTable = table('piscina', demo);
      const histTable = table('historico', demo);
      for (const w of winners) {
        const payout = 10.00;
        const fee = +(payout * 0.04).toFixed(2);
        const net = +(payout - fee).toFixed(2);

        // pay user
        await conn.query('UPDATE usuarios SET balance = balance + ? WHERE id = ?', [net, w.rented_by]);
        // pool pays payout and receives fee
        await conn.query(`UPDATE ${poolTable} SET balance = balance - ? + ? WHERE id = 1`, [payout, fee]);
        await conn.query(`INSERT INTO ${histTable} (user_id, type, amount, details) VALUES (?, ?, ?, ?)`, [w.rented_by, 'raffle', net, `slot:${w.slot}`]);
        await conn.query(`INSERT INTO ${histTable} (user_id, type, amount, details) VALUES (NULL, ?, ?, ?)`, ['fee', fee, `slot:${w.slot}, user:${w.rented_by}`]);

        results.push({ slot: w.slot, user_id: w.rented_by, net, fee });

        // log event per winner within the transaction
        await logEvent({ userId: w.rented_by, type: demo ? 'demo_raffle_win' : 'raffle_win', details: { slot: w.slot, net, fee }, conn, demo });
      }
      await conn.commit();
    } catch (err) { await conn.rollback(); throw err; }
  }

  // Emit results to clients (label demo results)
  io.emit('raffle_result', { time: new Date(), results, demo });
  if (results.length) console.log(demo ? 'Demo raffle results:' : 'Raffle results:', results);
}

module.exports = { startRaffle };
