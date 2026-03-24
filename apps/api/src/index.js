require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');

const { testConnection } = require('./db/client');
const authRoutes         = require('./routes/auth');
const generateRoutes     = require('./routes/generate');
const userRoutes         = require('./routes/user');
const adminRoutes        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3011;

// ── Segurança ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3010').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));

// ── Rate limiting global ──────────────────────────────────────
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas requisições. Aguarde um momento.' },
}));

// ── Body / cookie parsers ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const db = await testConnection();
  res.json({ status: 'ok', db, ts: new Date().toISOString() });
});

// ── Rotas ─────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/user',     userRoutes);
app.use('/api/admin',    adminRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// ── Error handler global ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  // Em produção nunca vaza detalhes internos para o cliente
  const message = process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message;
  res.status(err.status || 500).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 PostAI API rodando em http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
