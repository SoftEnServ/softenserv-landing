// Pruebas de la API contra una base de datos PostgreSQL real (la crea el flujo de GitHub Actions
// con db/init, igual que Docker). Levantan la API en un puerto propio y prueban sus respuestas.
// Uso local: con la base disponible (variables DB_*), `npm test`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from '../src/db.js';

const PORT = Number(process.env.TEST_PORT || 3999);
const BASE = `http://localhost:${PORT}`;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let api;
let log = '';

before(async () => {
  // Sin SMTP: los mensajes se guardan pero no se envían por correo
  api = spawn(process.execPath, ['src/index.js'], {
    cwd: root, env: { ...process.env, PORT: String(PORT), SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '' },
  });
  api.stdout.on('data', (d) => (log += d));
  api.stderr.on('data', (d) => (log += d));
  // Esperar a que responda (incluye aplicar las migraciones)
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return; } catch { /* aún no arranca */ }
    if (api.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`La API no arrancó:\n${log}`);
});

after(async () => { api?.kill(); await pool.end(); });

const getJson = async (url, init) => {
  const r = await fetch(BASE + url, init);
  return { status: r.status, body: await r.json() };
};
const postContact = (body) => getJson('/api/contact', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('health: la API y la base de datos responden', async () => {
  const { status, body } = await getJson('/api/health');
  assert.equal(status, 200);
  assert.deepEqual(body, { status: 'ok', db: 'ok' });
});

test('proyectos en español: los 6, ordenados, con su texto en español', async () => {
  const { status, body } = await getJson('/api/projects?lang=es');
  assert.equal(status, 200);
  assert.equal(body.length, 6);
  assert.deepEqual(body.map((p) => p.slug), [
    'customer-portal', 'inventory-system', 'scheduling-professionals',
    'erp-integration', 'reports-dashboard', 'entrepreneur-website',
  ]);
  assert.equal(body[0].title, 'Portal de clientes');
  assert.equal(body[1].category, 'Sistemas');
});

test('proyectos en inglés: el texto base en inglés', async () => {
  const { body } = await getJson('/api/projects?lang=en');
  assert.equal(body[0].title, 'Customer portal');
  assert.equal(body[1].category, 'Systems');
  assert.equal(body[2].summary, 'Online appointment booking with automatic email reminders.');
});

test('idioma desconocido: se usa inglés', async () => {
  const { body } = await getJson('/api/projects?lang=fr');
  assert.equal(body[0].title, 'Customer portal');
});

test('un proyecto por su slug, y 404 si no existe', async () => {
  const ok = await getJson('/api/projects/scheduling-professionals?lang=es');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.title, 'Agenda para profesionales');
  const missing = await getJson('/api/projects/no-existe');
  assert.equal(missing.status, 404);
});

test('contacto: rechaza un email inválido y un mensaje muy corto', async () => {
  const { status, body } = await postContact({ email: 'no-es-un-email', message: 'corto' });
  assert.equal(status, 400);
  assert.ok(body.errors.email);
  assert.ok(body.errors.message);
});

test('contacto: rechaza un email sin extensión válida', async () => {
  const { status } = await postContact({ email: 'ana@empresa', message: 'Necesito un sistema de reservas.' });
  assert.equal(status, 400);
});

test('contacto: guarda un mensaje válido con su idioma', async () => {
  const { status, body } = await postContact({ email: '  ana@empresa.cl ', message: 'Necesito un sistema de reservas para mi consulta.', lang: 'es' });
  assert.equal(status, 201);
  assert.equal(body.ok, true);
  assert.ok(Number.isInteger(body.id));
  const { rows } = await pool.query('SELECT email, message, lang, status FROM contact_requests WHERE id = $1', [body.id]);
  assert.deepEqual(rows[0], { email: 'ana@empresa.cl', message: 'Necesito un sistema de reservas para mi consulta.', lang: 'es', status: 'nuevo' });
});

// ---------- Contenido de la página ----------

test('contenido en español: textos de cada sección, servicios y email', async () => {
  const { status, body } = await getJson('/api/content?lang=es');
  assert.equal(status, 200);
  assert.equal(body.texts.hero.eyebrow, 'Desarrollo y Sistemas a medida');
  assert.equal(body.texts.hero.titleHl, 'soluciones que funcionan');
  assert.equal(body.texts.services.eyebrow, 'Servicios');
  assert.equal(body.texts.projects.title, 'Conócenos por las soluciones que construimos.');
  assert.equal(body.texts.contact.perk2, 'Para empresas y personas');
  assert.deepEqual(body.services.map((s) => s.icon), ['requirements', 'web', 'systems', 'integrations']);
  assert.equal(body.services[0].title, 'Levantamiento de requerimientos');
  assert.equal(body.contactEmail, 'softenserv@gmail.com');
});

test('contenido en inglés', async () => {
  const { body } = await getJson('/api/content?lang=en');
  assert.equal(body.texts.hero.eyebrow, 'Custom Development and Systems');
  assert.equal(body.services[3].title, 'Integrations & APIs');
});

test('un cambio en la base se ve en la API, y un servicio inactivo no se muestra', async () => {
  await pool.query("UPDATE content_texts SET value = 'Hecho a tu medida' WHERE section = 'hero' AND field = 'eyebrow' AND lang = 'es'");
  await pool.query("UPDATE services SET active = FALSE WHERE slug = 'integrations'");
  try {
    const { body } = await getJson('/api/content?lang=es');
    assert.equal(body.texts.hero.eyebrow, 'Hecho a tu medida');
    assert.equal(body.services.length, 3);
  } finally {
    await pool.query("UPDATE content_texts SET value = 'Desarrollo y Sistemas a medida' WHERE section = 'hero' AND field = 'eyebrow' AND lang = 'es'");
    await pool.query("UPDATE services SET active = TRUE WHERE slug = 'integrations'");
  }
});

test('el email de contacto sale de la base de datos', async () => {
  await pool.query("UPDATE site_settings SET contact_email = 'ventas@softenserv.cl'");
  try {
    const { body } = await getJson('/api/content?lang=es');
    assert.equal(body.contactEmail, 'ventas@softenserv.cl');
  } finally {
    await pool.query("UPDATE site_settings SET contact_email = 'softenserv@gmail.com'");
  }
});

// ---------- Límites de largo (los hace respetar la base de datos) ----------

const rejects = (sql, re) => assert.rejects(pool.query(sql), re);

test('límites: textos de contenido demasiado largos o vacíos', async () => {
  await rejects("UPDATE content_texts SET value = repeat('x', 61) WHERE section = 'hero' AND field = 'eyebrow' AND lang = 'es'", /el máximo es 60/);
  await rejects("UPDATE content_texts SET value = '  ' WHERE section = 'hero' AND field = 'lead' AND lang = 'en'", /no puede quedar vacío/);
  await rejects("UPDATE content_fields SET max_len = 5 WHERE section = 'hero' AND field = 'lead'", /acórtalos antes de bajar el máximo/);
});

test('límites: servicios, email y proyectos', async () => {
  await rejects("UPDATE service_texts SET title = repeat('x', 61) WHERE lang = 'es'", /service_title_1_a_60_caracteres/);
  await rejects("UPDATE service_texts SET summary = repeat('x', 201) WHERE lang = 'es'", /service_summary_1_a_200_caracteres/);
  await rejects("UPDATE site_settings SET contact_email = 'sin-arroba'", /contact_email_formato_valido/);
  await rejects("UPDATE projects SET translations = jsonb_set(translations, '{es,title}', to_jsonb(repeat('x', 161)))", /project_translation_title_hasta_160/);
  await rejects("UPDATE projects SET title = repeat('x', 161)", /value too long/);
});
