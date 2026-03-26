/**
 * Scheduler — verifica posts agendados a cada 60 segundos
 * e envia o e-mail de lembrete quando o horário chega.
 */

const { query }  = require('../db/client');
const { sendScheduledPostReminder } = require('./email');

const INTERVAL_MS = 60_000;

async function runScheduler() {
  try {
    const { rows } = await query(`
      SELECT
        g.id, g.caption, g.hashtags, g.scheduled_at,
        u.email, u.name
      FROM generations g
      JOIN users u ON u.id = g.user_id
      WHERE g.schedule_status = 'pending'
        AND g.scheduled_at <= NOW()
    `);

    for (const row of rows) {
      try {
        await sendScheduledPostReminder(
          row.email,
          row.name,
          row.caption,
          row.hashtags,
          row.scheduled_at,
        );

        await query(
          `UPDATE generations SET schedule_status = 'sent' WHERE id = $1`,
          [row.id],
        );

        console.info('[SCHEDULER] lembrete enviado', { id: row.id, email: row.email });
      } catch (err) {
        console.error('[SCHEDULER] erro ao enviar lembrete', { id: row.id, err: err.message });
      }
    }
  } catch (err) {
    console.error('[SCHEDULER] erro ao consultar agendamentos:', err.message);
  }
}

function startScheduler() {
  console.log('[SCHEDULER] iniciado — verificando a cada 60s');
  setInterval(runScheduler, INTERVAL_MS);
  // Executa imediatamente no start para não esperar 60s
  runScheduler();
}

module.exports = { startScheduler };
