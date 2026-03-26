const express    = require('express');
const multer     = require('multer');
const sharp      = require('sharp');
const { z }      = require('zod');
const Anthropic  = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');

const { requireAuth, requireVerified } = require('../middleware/auth');
const { query }       = require('../db/client');

const router   = express.Router();
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPEG, PNG e WebP são aceitas'));
    }
  },
});
const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Rate limit extra apenas para geração
const rateLimit = require('express-rate-limit');
const genLimit  = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Limite de gerações por minuto atingido. Aguarde.' }
});

const FORMAT_SIZES = {
  feed:     { width: 1080, height: 1080 },
  story:    { width: 1080, height: 1920 },
  portrait: { width: 1080, height: 1350 },
};

const generateSchema = z.object({
  nicho:    z.string().min(1).max(100),
  tone:     z.string().min(1).max(100),
  language: z.string().default('pt-BR'),
  extra:    z.string().max(300).optional(),
  format:   z.enum(['feed', 'story', 'portrait']).default('feed'),
});

// POST /api/generate
router.post('/', requireAuth, requireVerified, genLimit, upload.single('image'), async (req, res) => {
  const genId = uuidv4();

  try {
    // 1. Valida parâmetros
    const params = generateSchema.parse({
      nicho:    req.body.nicho,
      tone:     req.body.tone,
      language: req.body.language,
      extra:    req.body.extra,
      format:   req.body.format,
    });

    const { width: W, height: H } = FORMAT_SIZES[params.format];

    if (!req.file) {
      return res.status(400).json({ error: 'Imagem obrigatória' });
    }

    // 2. Verifica e consome crédito atomicamente
    const { rows: creditRows } = await query(
      'SELECT use_credit($1, $2) AS ok',
      [req.user.id, genId]
    );

    if (!creditRows[0].ok) {
      return res.status(402).json({
        error: 'Créditos insuficientes. Faça upgrade do plano.',
        code:  'NO_CREDITS'
      });
    }

    // 3. Registra geração como pending
    await query(
      `INSERT INTO generations (id, user_id, nicho, tone, language, extra_info, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [genId, req.user.id, params.nicho, params.tone, params.language, params.extra || null]
    );

    // 4. Processa imagem com sharp
    // versão para enviar à IA (menor, sem filtros)
    const forAI = await sharp(req.file.buffer)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // versão "renderizada" — foto inteira com fundo desfocado (sem cortar)
    // 1. fundo: mesma imagem em cover + blur forte + escurecimento
    const background = await sharp(req.file.buffer)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .blur(55)
      .modulate({ brightness: 0.55, saturation: 0.6 })
      .toBuffer();

    // 2. foto principal: cabe inteira (sem crop), com filtro profissional
    const foreground = await sharp(req.file.buffer)
      .resize(W, H, { fit: 'inside', withoutEnlargement: false })
      .normalise()
      .modulate({ saturation: 1.3, brightness: 1.04, hue: 6 })
      .linear(1.08, -10)
      .sharpen({ sigma: 1.0, m1: 0.5, m2: 3.0 })
      .jpeg({ quality: 95 })
      .toBuffer();

    // 3. vignete suave nas bordas
    const vignetteOverlay = Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
      '<defs><radialGradient id="vg" cx="50%" cy="50%" r="68%">' +
      '<stop offset="0%" stop-color="transparent"/>' +
      '<stop offset="100%" stop-color="rgba(0,0,0,0.32)"/>' +
      '</radialGradient></defs>' +
      `<rect width="${W}" height="${H}" fill="url(#vg)"/>` +
      '</svg>'
    );

    // 4. composição: fundo + foto centralizada + vignete
    const rendered = await sharp(background)
      .composite([
        { input: foreground, gravity: 'centre' },
        { input: vignetteOverlay, blend: 'over' },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    const imageBase64    = forAI.toString('base64');
    const renderedBase64 = rendered.toString('base64');

    // 5. Monta prompt — solicita 3 variações de tom diferente
    const extraText = params.extra ? `\nDetalhe extra: "${params.extra}"` : '';
    const prompt = `Você é uma pessoa real que usa muito o Instagram no Brasil e sabe escrever legendas que parecem autênticas, não publicidade.

Olha essa imagem e cria 3 variações de legenda para o Instagram no nicho de "${params.nicho}".
Idioma: ${params.language}.${extraText}

Cada variação deve ter um tom diferente e parecer escrita por uma pessoa real. Evite clichês de marketing.
Use linguagem natural, emojis com moderação. CTA discreto se quiser.

Responda APENAS em JSON válido, sem texto fora do JSON, sem markdown, sem backticks:
{"variations":[
  {"tone_label":"Descontraído","caption":"...","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10","#tag11","#tag12","#tag13","#tag14","#tag15"]},
  {"tone_label":"Profissional","caption":"...","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10","#tag11","#tag12","#tag13","#tag14","#tag15"]},
  {"tone_label":"Inspirador","caption":"...","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10","#tag11","#tag12","#tag13","#tag14","#tag15"]}
]}

Regras:
- caption: 2 a 4 parágrafos curtos em ${params.language}, quebras de linha com \\n
- hashtags: exatamente 15 tags relevantes por variação, mix de populares e de nicho, com #
- Nenhum texto fora do JSON.`;

    // 6. Chama Claude API
    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text',  text: prompt }
        ]
      }]
    });

    // 7. Parse da resposta
    const raw    = message.content.find(b => b.type === 'text')?.text || '';
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed.variations) || parsed.variations.length === 0) {
      throw new Error('Resposta da IA em formato inválido');
    }

    // Usa a primeira variação como padrão no banco
    const primary = parsed.variations[0];

    // 8. Atualiza geração como done
    await query(
      `UPDATE generations SET caption = $1, hashtags = $2, status = 'done' WHERE id = $3`,
      [primary.caption, primary.hashtags, genId]
    );

    // 9. Retorna resultado com todas as variações
    res.json({
      id:             genId,
      variations:     parsed.variations,
      caption:        primary.caption,
      hashtags:       primary.hashtags,
      credits:        req.user.credits - 1,
      processedImage: `data:image/jpeg;base64,${renderedBase64}`,
      format:         params.format,
    });

  } catch (err) {
    // Reverte crédito se a geração falhou após ser consumido
    await query(
      `UPDATE users SET credits = credits + 1 WHERE id = $1`,
      [req.user.id]
    ).catch(() => {});

    await query(
      `UPDATE generations SET status = 'error', error_msg = $1 WHERE id = $2`,
      [err.message, genId]
    ).catch(() => {});

    console.error('[GENERATE] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao gerar conteúdo. Crédito não consumido.' });
  }
});

// GET /api/generate/history
router.get('/history', requireAuth, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const { rows } = await query(
      `SELECT id, nicho, tone, caption, hashtags, status, created_at
       FROM generations
       WHERE user_id = $1 AND status = 'done'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const { rows: countRows } = await query(
      'SELECT COUNT(*) FROM generations WHERE user_id = $1 AND status = $2',
      [req.user.id, 'done']
    );

    res.json({
      items: rows,
      total: parseInt(countRows[0].count),
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// POST /api/generate/:id/schedule — agenda lembrete por e-mail
router.post('/:id/schedule', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { scheduled_at } = req.body;

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at obrigatório (ISO 8601)' });
  }

  const date = new Date(scheduled_at);
  if (isNaN(date.getTime()) || date <= new Date()) {
    return res.status(400).json({ error: 'Data deve ser futura' });
  }

  try {
    const { rows } = await query(
      `UPDATE generations
       SET scheduled_at = $1, schedule_status = 'pending'
       WHERE id = $2 AND user_id = $3 AND status = 'done'
       RETURNING id, scheduled_at`,
      [date.toISOString(), id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Geração não encontrada' });
    }

    res.json({ ok: true, scheduled_at: rows[0].scheduled_at });
  } catch (err) {
    console.error('[SCHEDULE] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao agendar' });
  }
});

// DELETE /api/generate/:id/schedule — cancela agendamento
router.delete('/:id/schedule', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await query(
      `UPDATE generations
       SET schedule_status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND schedule_status = 'pending'
       RETURNING id`,
      [id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Agendamento não encontrado ou já enviado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[SCHEDULE] Erro ao cancelar:', err.message);
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
});

// GET /api/generate/scheduled — lista posts com lembrete pendente
router.get('/scheduled', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, nicho, caption, scheduled_at, schedule_status
       FROM generations
       WHERE user_id = $1 AND schedule_status = 'pending'
       ORDER BY scheduled_at ASC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

module.exports = router;
