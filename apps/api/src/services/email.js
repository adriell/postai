const FROM    = process.env.EMAIL_FROM  || 'PostAI <noreply@postai.com.br>';
const APP_URL = process.env.APP_URL     || 'http://localhost:3010';

// Inicialização lazy — evita crash quando a chave não está configurada
let _resend = null;
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 'sua_chave_resend_aqui') return null;
  if (!_resend) {
    const { Resend } = require('resend');
    _resend = new Resend(key);
  }
  return _resend;
}

// ── Templates ─────────────────────────────────────────────────

function baseTemplate(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#833ab4 0%,#fd1d1d 50%,#fcb045 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">PostAI</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.82);font-size:13px;">Criador de conteúdo para Instagram</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${bodyHtml}
          <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:20px;">
            Se você não solicitou isso, pode ignorar este e-mail com segurança.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btnStyle(text, href) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;background:linear-gradient(135deg,#833ab4,#fd1d1d);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;">${text}</a>`;
}

// ── Envio de verificação ───────────────────────────────────────

async function sendVerificationEmail(email, name, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;

  const body = `
    <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Olá, ${name}! 👋</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#4b5563;line-height:1.7;">
      Sua conta foi criada com sucesso. Clique no botão abaixo para confirmar seu e-mail e liberar todos os recursos.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">Este link expira em 24 horas.</p>
    ${btnStyle('Confirmar e-mail', link)}
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
      Ou cole este link no navegador:<br>
      <a href="${link}" style="color:#833ab4;word-break:break-all;">${link}</a>
    </p>`;

  return _send(email, 'Confirme seu e-mail — PostAI', baseTemplate('Confirmar e-mail', body));
}

// ── Envio de reset de senha ───────────────────────────────────

async function sendPasswordResetEmail(email, name, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;

  const body = `
    <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Redefinir senha</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#4b5563;line-height:1.7;">
      Recebemos uma solicitação para redefinir a senha da conta <strong>${email}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">Este link expira em 1 hora.</p>
    ${btnStyle('Redefinir senha', link)}
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
      Ou cole este link no navegador:<br>
      <a href="${link}" style="color:#833ab4;word-break:break-all;">${link}</a>
    </p>`;

  return _send(email, 'Redefinir senha — PostAI', baseTemplate('Redefinir senha', body));
}

// ── Envio interno ─────────────────────────────────────────────

async function _send(to, subject, html) {
  const client = getResend();
  if (!client) {
    console.log(`\n[EMAIL - DEV] Para: ${to} | Assunto: ${subject}`);
    console.log(`[EMAIL - DEV] Defina RESEND_API_KEY para enviar de verdade.\n`);
    return { id: 'dev-mode' };
  }
  return client.emails.send({ from: FROM, to, subject, html });
}

// ── Lembrete de post agendado ──────────────────────────────────

async function sendScheduledPostReminder(email, name, caption, hashtags, scheduledAt) {
  const dateStr = new Date(scheduledAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const hashtagLine = Array.isArray(hashtags) ? hashtags.join(' ') : hashtags;
  const previewCaption = caption.length > 200 ? caption.slice(0, 200) + '…' : caption;

  const body = `
    <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Hora de postar! 📸</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.7;">
      Olá, <strong>${name}</strong>! Você agendou um lembrete para <strong>${dateStr}</strong>.
      Aqui está a legenda que você preparou:
    </p>
    <div style="background:#f9fafb;border-left:4px solid #833ab4;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 16px;">
      <p style="margin:0 0 12px;font-size:14px;color:#1f2937;line-height:1.7;white-space:pre-wrap;">${previewCaption}</p>
      <p style="margin:0;font-size:13px;color:#6366f1;">${hashtagLine}</p>
    </div>
    <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">
      Copie a legenda acima, abra o Instagram e publique agora. 🚀
    </p>
    ${btnStyle('Abrir PostAI', APP_URL)}`;

  return _send(email, `Lembrete de post — ${dateStr}`, baseTemplate('Lembrete de post', body));
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendScheduledPostReminder };
