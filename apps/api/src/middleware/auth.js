const jwt   = require('jsonwebtoken');
const { query } = require('../db/client');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token   = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      'SELECT id, email, name, plan, credits, email_verified, is_admin FROM users WHERE id = $1',
      [payload.sub]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
