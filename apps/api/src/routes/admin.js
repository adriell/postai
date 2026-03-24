const express = require('express');
const { z }   = require('zod');
const { query } = require('../db/client');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas exigem auth + admin
router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (_req, res) => {
  try {
    const [users, gens, credits, plans] = await Promise.all([
      query(`
        SELECT
          COUNT(*)                                            AS total,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS this_month,
          COUNT(*) FILTER (WHERE email_verified = TRUE)      AS verified
        FROM users
      `),
      query(`
        SELECT
          COUNT(*)                                                          AS total,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS this_month,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)               AS today
        FROM generations WHERE status = 'done'
      `),
      query(`
        SELECT COALESCE(SUM(ABS(delta)), 0) AS consumed
        FROM credits_log WHERE reason = 'generation'
      `),
      query(`
        SELECT plan, COUNT(*) AS count
        FROM users GROUP BY plan ORDER BY count DESC
      `),
    ]);

    res.json({
      users: {
        total:      parseInt(users.rows[0].total),
        this_month: parseInt(users.rows[0].this_month),
        verified:   parseInt(users.rows[0].verified),
      },
      generations: {
        total:      parseInt(gens.rows[0].total),
        this_month: parseInt(gens.rows[0].this_month),
        today:      parseInt(gens.rows[0].today),
      },
      credits_consumed: parseInt(credits.rows[0].consumed),
      plans: Object.fromEntries(plans.rows.map(r => [r.plan, parseInt(r.count)])),
    });
  } catch (err) {
    console.error('[ADMIN] stats error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// GET /api/admin/users?page=1&limit=20&search=
router.get('/users', async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;

  try {
    const params = search
      ? [search, limit, offset]
      : [limit, offset];

    const whereClause = search
      ? 'WHERE u.name ILIKE $1 OR u.email ILIKE $1'
      : '';

    const [itemsRes, countRes] = await Promise.all([
      query(`
        SELECT
          u.id, u.email, u.name, u.plan, u.credits,
          u.email_verified, u.is_admin, u.created_at,
          COUNT(g.id)::int AS generation_count
        FROM users u
        LEFT JOIN generations g ON g.user_id = u.id AND g.status = 'done'
        ${whereClause}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}
      `, params),
      query(`
        SELECT COUNT(*) FROM users u ${whereClause}
      `, search ? [search] : []),
    ]);

    res.json({
      items: itemsRes.rows,
      total: parseInt(countRes.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error('[ADMIN] users error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// PATCH /api/admin/users/:id/credits  { delta: number }
router.patch('/users/:id/credits', async (req, res) => {
  const delta = parseInt(req.body.delta);
  if (isNaN(delta) || delta === 0) {
    return res.status(400).json({ error: 'delta deve ser um número diferente de zero' });
  }

  try {
    const { rows } = await query(
      `UPDATE users SET credits = GREATEST(0, credits + $1), updated_at = NOW()
       WHERE id = $2 RETURNING id, credits`,
      [delta, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    await query(
      `INSERT INTO credits_log (user_id, delta, reason, ref_id)
       VALUES ($1, $2, 'manual', NULL)`,
      [req.params.id, delta]
    );

    res.json({ id: rows[0].id, credits: rows[0].credits });
  } catch (err) {
    console.error('[ADMIN] credits error:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar créditos' });
  }
});

// PATCH /api/admin/users/:id/plan  { plan: string }
router.patch('/users/:id/plan', async (req, res) => {
  const planSchema = z.enum(['free', 'starter', 'pro', 'agency']);
  const result = planSchema.safeParse(req.body.plan);
  if (!result.success) return res.status(400).json({ error: 'Plano inválido' });

  try {
    const { rows } = await query(
      `UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2 RETURNING id, plan`,
      [result.data, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[ADMIN] plan error:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

module.exports = router;
