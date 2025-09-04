const pool = require('./db');
const { logEvent } = require('./utils/logger');

// raffle runs every 10 seconds
function startRaffle(io) {
  setInterval(async () => {
    try {
      const conn = await pool.getConnection();
      try {
        const now = new Date();
        const [rows] = await conn.query('SELECT q.slot, q.rented_by, u.email FROM quadrados q JOIN usuarios u ON u.id = q.rented_by WHERE q.rented_until > ?',[now]);
        if (!rows.length) return; // nobody rented
        const winners = [];
        for (const r of rows) {
          const chance = Math.random();
          if (chance < 0.49) winners.push(r);
        }
        const results = [];
        if (winners.length) {
          await conn.beginTransaction();
          try {
            for (const w of winners) {
              const payout = 10.00;
              const fee = +(payout * 0.04).toFixed(2);
              const net = +(payout - fee).toFixed(2);

              // pay user
              await conn.query('UPDATE usuarios SET balance = balance + ? WHERE id = ?', [net, w.rented_by]);
              // pool pays payout and receives fee (net change = -payout + fee)
              await conn.query('UPDATE piscina SET balance = balance - ? + ? WHERE id = 1', [payout, fee]);
              await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (?, ?, ?, ?)', [w.rented_by, 'raffle', net, `slot:${w.slot}`]);
              await conn.query('INSERT INTO historico (user_id, type, amount, details) VALUES (NULL, ?, ?, ?)', ['fee', fee, `slot:${w.slot}, user:${w.rented_by}`]);

              results.push({ slot: w.slot, user_id: w.rented_by, net, fee });

              // log event per winner within the transaction
              await logEvent({ userId: w.rented_by, type: 'raffle_win', details: { slot: w.slot, net, fee }, conn });
            }
            await conn.commit();
          } catch (err) { await conn.rollback(); throw err; }
        }

        // Emit results to clients
        io.emit('raffle_result', { time: new Date(), results });
        if (results.length) {
          console.log('Raffle results:', results);
        }
      } finally { conn.release(); }
    } catch (err) {
      console.error('Raffle error', err);
    }
  }, 10000);
}

module.exports = { startRaffle };
