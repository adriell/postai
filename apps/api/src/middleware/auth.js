const jwt       = require('jsonwebtoken');
const { query } = require('../db/client');

const COOKIE_NAME = 'postai_token';

async function requireAuth(req, res, next) {
  try {
    // Aceita token via cookie httpOnly (preferencial) ou Authorization: Bearer (fallback para clientes externos)
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

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

function requireVerified(req, res, next) {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      error: 'Verifique seu e-mail antes de continuar.',
      code:  'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireVerified, COOKIE_NAME };
