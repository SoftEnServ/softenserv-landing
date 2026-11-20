import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { migrate } from './migrate.js';
import { sendContactMail } from './mailer.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));

const STATUSES = ['planificado', 'en_progreso', 'completado'];
const LANGS = ['en', 'es'];
const langOf = (req) => (LANGS.includes(req.query.lang) ? req.query.lang : 'en');

// Texto traducido con respaldo al texto base (inglés)
const I18N_COLS = `COALESCE(translations->$1->>'title', title)       AS title,
                   COALESCE(translations->$1->>'summary', summary)   AS summary,
                   COALESCE(translations->$1->>'category', category) AS category`;

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unavailable' });
  }
});

// Lista de proyectos. Opcionales: ?lang=en|es&status=en_progreso&category=Web&featured=true
app.get('/api/projects', async (req, res, next) => {
  try {
    const where = [];
    const params = [langOf(req)];
    const { status, category, featured } = req.query;
    if (status && STATUSES.includes(status)) { params.push(status); where.push(`status = $${params.length}`); }
    if (category) { params.push(category); where.push(`category = $${params.length}`); }
    if (featured === 'true') where.push('featured = TRUE');

    const sql = `SELECT id, slug, ${I18N_COLS}, status, progress, client,
                        technologies, image_url, repo_url, demo_url, featured, started_at
                 FROM projects ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY featured DESC, sort_order, id`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/projects/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *, ${I18N_COLS} FROM projects WHERE slug = $2`, [langOf(req), req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Contenido de la página en un idioma: textos (títulos, subtítulos y bajadas), servicios y email de contacto.
// Si a un texto le falta la traducción pedida, se usa la versión en inglés.
app.get('/api/content', async (req, res, next) => {
  try {
    const lang = langOf(req);
    const [texts, services, settings] = await Promise.all([
      pool.query(
        `SELECT f.section, f.field, COALESCE(t.value, en.value) AS value
           FROM content_fields f
           LEFT JOIN content_texts t  ON t.section = f.section  AND t.field = f.field  AND t.lang = $1
           LEFT JOIN content_texts en ON en.section = f.section AND en.field = f.field AND en.lang = 'en'
          ORDER BY f.section, f.field`, [lang]),
      pool.query(
        `SELECT s.slug, s.icon,
                COALESCE(t.title, en.title) AS title, COALESCE(t.summary, en.summary) AS summary,
                COALESCE(t.details, en.details) AS details
           FROM services s
           LEFT JOIN service_texts t  ON t.service_id = s.id  AND t.lang = $1
           LEFT JOIN service_texts en ON en.service_id = s.id AND en.lang = 'en'
          WHERE s.active
          ORDER BY s.sort_order, s.id`, [lang]),
      pool.query('SELECT contact_email FROM site_settings WHERE id = 1'),
    ]);
    const sections = {};
    for (const { section, field, value } of texts.rows) {
      if (value != null) (sections[section] ??= {})[field] = value;
    }
    res.json({ lang, texts: sections, services: services.rows, contactEmail: settings.rows[0]?.contact_email ?? null });
  } catch (err) { next(err); }
});

/** Email al que llegan los mensajes: el de la base de datos o, si no hay, el de la configuración (MAIL_TO). */
async function contactEmail() {
  const { rows } = await pool.query('SELECT contact_email FROM site_settings WHERE id = 1');
  return rows[0]?.contact_email || process.env.MAIL_TO || 'softenserv@gmail.com';
}

// Formato de email: usuario@dominio.ext (extensión de al menos 2 letras). Igual que en el formulario.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

// Formulario de contacto: solo email y mensaje
app.post('/api/contact', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim();
    const message = String(req.body?.message ?? '').trim();
    const lang = LANGS.includes(req.body?.lang) ? req.body.lang : null;
    const errors = {};
    if (!EMAIL_RE.test(email) || email.length > 160) errors.email = 'Correo no válido';
    if (message.length < 10 || message.length > 5000) errors.message = 'El mensaje debe tener entre 10 y 5000 caracteres';
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    // 1) Queda registrado siempre, aunque después falle el correo
    const { rows } = await pool.query(
      `INSERT INTO contact_requests (email, message, lang) VALUES ($1, $2, $3) RETURNING id, created_at`,
      [email, message, lang]
    );
    const id = rows[0].id;

    // 2) Aviso por correo al email de contacto configurado en la base de datos
    const to = await contactEmail();
    let status = 'nuevo';
    try {
      if (await sendContactMail({ id, email, message, to })) status = 'enviado';
    } catch (err) {
      status = 'error_envio';
      console.error(`No se pudo enviar el correo de la solicitud #${id}:`, err.message);
    }
    await pool.query('UPDATE contact_requests SET status = $1, notified_to = $2 WHERE id = $3',
      [status, status === 'nuevo' ? null : to, id]);

    res.status(201).json({ ok: true, id });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = Number(process.env.PORT || 3000);
try {
  await migrate();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
app.listen(port, () => console.log(`API SES escuchando en :${port}`));
