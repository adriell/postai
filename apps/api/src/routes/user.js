const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { query }       = require('../db/client');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.name, u.plan, u.credits, u.created_at,
              (SELECT COUNT(*) FROM generations WHERE user_id = u.id AND status = 'done') AS total_generations
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// GET /api/user/credits/log
router.get('/credits/log', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT delta, reason, ref_id, created_at
       FROM credits_log WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ log: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico de créditos' });
  }
});

// PATCH /api/user/profile
router.patch('/profile', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Nome inválido' });
  }
  try {
    const { rows } = await query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, plan, credits',
      [name.trim(), req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;
