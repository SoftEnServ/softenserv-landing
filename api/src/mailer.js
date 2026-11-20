import nodemailer from 'nodemailer';

/**
 * Envío de correos de contacto. Se configura con variables de entorno (ver .env.example):
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
 * El destinatario es el email de contacto de la base de datos (site_settings); MAIL_TO solo es el respaldo.
 * Si no hay SMTP configurado, el mensaje igual queda guardado en la base de datos.
 */
const SUBJECT = 'Contacto Comercial Landing Page';

const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transport = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

if (!configured) console.warn('SMTP no configurado: los mensajes de contacto se guardarán, pero no se enviarán por correo.');

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Envía el mensaje al email de contacto (to). "Responder" contesta directamente al visitante. Devuelve true si se envió. */
export async function sendContactMail({ id, email, message, to }) {
  if (!transport) return false;
  const date = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  await transport.sendMail({
    from: process.env.MAIL_FROM || `"Landing SES" <${process.env.SMTP_USER}>`,
    to,
    replyTo: email,
    subject: SUBJECT,
    text: `Nuevo mensaje desde el formulario de contacto (#${id})\n\nDe: ${email}\nFecha: ${date}\n\n${message}\n`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2937">
      <h2 style="color:#1d3557;margin:0 0 12px">Nuevo mensaje de contacto</h2>
      <p style="margin:0 0 4px"><b>De:</b> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <p style="margin:0 0 16px;color:#5b6676"><b>Fecha:</b> ${escapeHtml(date)} · Solicitud #${id}</p>
      <div style="white-space:pre-wrap;padding:16px;border-left:4px solid #3a9d93;background:#f3f5f8">${escapeHtml(message)}</div>
      <p style="margin-top:16px;color:#5b6676;font-size:13px">Responde este correo para contestarle directamente.</p>
    </div>`,
  });
  return true;
}
