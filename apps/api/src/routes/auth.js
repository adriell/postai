const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const { z }      = require('zod');
const rateLimit  = require('express-rate-limit');
const { query }  = require('../db/client');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

// ── Schemas ───────────────────────────────────────────────────

const registerSchema = z.object({
  email:    z.string().email('Email inválido'),
  name:     z.string().min(2, 'Nome muito curto').max(100),
  // Mínimo 8 chars + ao menos 1 número para evitar senhas triviais
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ── Rate limit específico para auth (brute-force protection) ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});

// ── Helpers ───────────────────────────────────────────────────

function signToken(userId) {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function setCookieToken(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 dias em ms
    path:     '/',
  });
}

function safeUser(u) {
  return {
    id: u.id, email: u.email, name: u.name,
    plan: u.plan, credits: u.credits,
    email_verified: u.email_verified, is_admin: u.is_admin,
  };
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const hash    = await bcrypt.hash(data.password, 12);
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const { rows } = await query(
      `INSERT INTO users (email, name, password_hash, plan, credits, email_verify_token, email_verify_expires)
       VALUES ($1, $2, $3, 'free', 5, $4, $5)
       RETURNING id, email, name, plan, credits, email_verified, is_admin`,
      [data.email, data.name, hash, token, expires]
    );

    const user = rows[0];

    sendVerificationEmail(data.email, data.name, token).catch(err =>
      console.error('[AUTH] Erro ao enviar e-mail de verificação:', err.message)
    );

    const jwt_ = signToken(user.id);
    setCookieToken(res, jwt_);
    res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('[AUTH] register error:', err.message);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const { rows } = await query(
      'SELECT id, email, name, plan, credits, password_hash, email_verified, is_admin FROM users WHERE email = $1',
      [data.email]
    );

    // Resposta genérica para não vazar se o e-mail existe
    if (!rows.length) return res.status(401).json({ error: 'Email ou senha incorretos' });

    const user  = rows[0];
    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou senha incorretos' });

    const token = signToken(user.id);
    setCookieToken(res, token);
    res.json({ user: safeUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    console.error('[AUTH] login error:', err.message);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

// ── GET /api/auth/verify-email?token=xxx ─────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token inválido' });
  }

  try {
    const { rows } = await query(
      `SELECT id FROM users
       WHERE email_verify_token = $1 AND email_verify_expires > NOW() AND email_verified = FALSE`,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    await query(
      `UPDATE users
       SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL, updated_at = NOW()
       WHERE id = $1`,
      [rows[0].id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] verify-email error:', err.message);
    res.status(500).json({ error: 'Erro ao verificar e-mail' });
  }
});

// ── POST /api/auth/resend-verification ───────────────────────
router.post('/resend-verification', requireAuth, async (req, res) => {
  if (req.user.email_verified) {
    return res.status(400).json({ error: 'E-mail já verificado' });
  }

  try {
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE id = $3`,
      [token, expires, req.user.id]
    );

    await sendVerificationEmail(req.user.email, req.user.name, token);
    res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] resend-verification error:', err.message);
    res.status(500).json({ error: 'Erro ao reenviar e-mail' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Informe o e-mail' });

  try {
    const { rows } = await query('SELECT id, name FROM users WHERE email = $1', [email]);

    // Responde ok mesmo se não existir (evita enumeração de e-mails)
    if (rows.length) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await query(
        `UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3`,
        [token, expires, rows[0].id]
      );

      sendPasswordResetEmail(email, rows[0].name, token).catch(err =>
        console.error('[AUTH] Erro ao enviar reset de senha:', err.message)
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] forgot-password error:', err.message);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;

  const result = z.object({
    token:    z.string().min(1),
    password: z.string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .regex(/[0-9]/, 'Senha deve conter ao menos um número'),
  }).safeParse({ token, password });

  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  try {
    const { rows } = await query(
      `SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()`,
      [result.data.token]
    );

    if (!rows.length) return res.status(400).json({ error: 'Token inválido ou expirado' });

    const hash = await bcrypt.hash(result.data.password, 12);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [hash, rows[0].id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] reset-password error:', err.message);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

module.exports = router;
