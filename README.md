# Software Engineering Services — Sistema web

Landing page en **Angular**, API en **Node.js/Express**, datos en **PostgreSQL**, todo levantado con **Docker Compose**.
Pensado para desplegarse en un servidor propio (por ejemplo un VPS en Clouding) con Docker.

```
ses/
├── docker-compose.yml      # db + api + web
├── .env.example            # variables (copiar a .env)
├── iniciar.bat / .sh       # atajos: levantar todo (Windows / Linux-Mac)
├── detener.bat / .sh       # atajos: apagar todo
├── logo/                   # logo SVG/PNG (normal, blanco, ícono, favicon)
├── db/init/                # SQL que se ejecuta al crear la base por primera vez (esquema y proyectos de ejemplo)
├── api/
│   ├── src/                # API REST (Express + pg)
│   ├── migrations/         # cambios de la base, se aplican solos al arrancar la API
│   └── test/               # pruebas de la API contra una base real
├── frontend/               # Angular + Nginx (sirve la web y reenvía /api a la API)
└── .github/workflows/      # verificación automática en GitHub Actions
```

## Levantar todo

```bash
cp .env.example .env        # cambia POSTGRES_PASSWORD
docker compose up -d --build
```

- Web: http://localhost:8080
- API: http://localhost:8080/api/content?lang=es
- PostgreSQL: localhost:5434 (configurable con `DB_PORT` en `.env`), usuario y clave según `.env`

> Los scripts de `db/init` solo corren la **primera vez** que se crea el volumen; las migraciones
> (`api/migrations`) corren cada vez que arranca la API, cada una una sola vez.
> Para reiniciar la base desde cero (se pierden los datos): `docker compose down -v && docker compose up -d --build`

## Qué viene de la base de datos

| En la página | Tabla(s) |
|---|---|
| Títulos, subtítulos y bajadas de Inicio, Servicios, Proyectos y Contacto (y los 2 puntos destacados de Contacto) | `content_fields` + `content_texts` |
| Las tarjetas de Servicios (título, texto, ícono, orden, visibles u ocultas) y el texto de su ventana | `services` + `service_texts` |
| Las tarjetas de Proyectos (título, resumen, categoría, orden) y el título de cada demo | `projects` |
| El email de Contacto, y el email al que llegan los mensajes del formulario | `site_settings` |
| **Registro** de cada mensaje enviado por el formulario (email, mensaje, idioma, estado del aviso, a qué email se avisó) | `contact_requests` |

En el **código** queda la interfaz, que no es contenido: botones, etiquetas y errores del formulario, el menú,
el código de la terminal del Inicio, los dibujos de los íconos y las maquetas de las demos
(`frontend/src/app/core/i18n/en.ts` y `es.ts`).

Los textos de contenido que también están en esos archivos son **solo un respaldo**: se muestran únicamente
si la API no responde, para que la página nunca quede en blanco. El contenido real es el de la base.

### Cómo fluye el contenido

1. Al abrir la página, Angular pide `GET /api/content?lang=…` **antes de dibujarla** (espera hasta 2,5 s; si la
   API no responde, parte con el respaldo). Al cambiar de idioma pide el otro idioma, una vez.
2. Nginx (contenedor `web`) reenvía `/api/…` a la API (contenedor `api`, puerto 3000).
3. La API consulta PostgreSQL con consultas parametrizadas y responde JSON. Si a un texto le falta la traducción
   pedida, entrega la versión en inglés.
4. `I18nService` combina ese contenido con los textos de la interfaz; las plantillas leen `i18n.t()`.

Archivos clave: `api/src/index.js` (API), `frontend/src/app/core/content.service.ts` (carga del contenido),
`frontend/src/app/core/i18n.service.ts` (combinación con la interfaz).

## Editar el contenido

Con un programa como DBeaver o pgAdmin (servidor `localhost`, puerto `5434`, base `ses`, usuario `ses`),
o desde la terminal: `docker compose exec db psql -U ses -d ses`. Los cambios se ven al recargar la página.

```sql
-- Qué campos de texto existen, dónde se ven y cuál es su largo máximo
SELECT section, field, max_len, description FROM content_fields ORDER BY section, field;

-- Cambiar un texto (es / en)
UPDATE content_texts SET value = 'Software hecho a tu medida'
 WHERE section = 'hero' AND field = 'eyebrow' AND lang = 'es';

-- Servicios: ocultar uno, cambiar el orden, agregar un texto largo para su ventana
UPDATE services SET active = FALSE WHERE slug = 'integrations';
UPDATE services SET sort_order = 0 WHERE slug = 'web-applications';
UPDATE service_texts SET details = 'Primer párrafo…' || chr(10) || 'Segundo párrafo…'
 WHERE lang = 'es' AND service_id = (SELECT id FROM services WHERE slug = 'web-applications');

-- Agregar un servicio (íconos: requirements, web, systems, integrations, mobile, data, cloud, support)
INSERT INTO services (slug, icon, sort_order) VALUES ('mobile-apps', 'mobile', 5);
INSERT INTO service_texts (service_id, lang, title, summary)
SELECT id, v.lang, v.title, v.summary FROM services,
  (VALUES ('es', 'Aplicaciones móviles', 'Apps para iOS y Android.'),
          ('en', 'Mobile apps', 'Apps for iOS and Android.')) AS v(lang, title, summary)
 WHERE slug = 'mobile-apps';

-- Email de contacto (se muestra en Contacto y recibe los mensajes del formulario)
UPDATE site_settings SET contact_email = 'contacto@softenserv.cl';

-- Proyectos: texto base en inglés + traducción al español en "translations"
UPDATE projects SET title = 'Customer portal' WHERE slug = 'customer-portal';
UPDATE projects SET translations = jsonb_set(translations, '{es,title}', '"Portal de clientes"') WHERE slug = 'customer-portal';

-- Mensajes recibidos por el formulario
SELECT created_at, email, lang, status, notified_to, message FROM contact_requests ORDER BY created_at DESC;
```

### Límites de largo

La base de datos rechaza cualquier INSERT o UPDATE que se pase del máximo (o deje un texto vacío), con un
mensaje que dice el campo y el límite, por ejemplo: `El texto hero.eyebrow (es) tiene 61 caracteres; el máximo es 60`.

| Contenido | Máximo |
|---|---|
| Textos de contenido | el `max_len` de cada campo en `content_fields` (entre 10 y 400) |
| Servicio: título / resumen / texto de la ventana | 60 / 200 / 1500 |
| Proyecto: título / resumen / categoría (inglés y español) | 160 / 300 / 60 |
| Email de contacto | 160, y debe tener formato de email |

Para cambiar un máximo: `UPDATE content_fields SET max_len = … WHERE …`. No deja bajarlo por debajo de un
texto que ya exista; primero hay que acortarlo.

## Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de la API y la base de datos |
| GET | `/api/content?lang=es\|en` | Textos de contenido, servicios y email de contacto |
| GET | `/api/projects?lang=es\|en` | Proyectos ordenados. Filtros opcionales: `status`, `category`, `featured=true` |
| GET | `/api/projects/:slug?lang=es\|en` | Un proyecto (404 si no existe) |
| POST | `/api/contact` | Formulario: `{ email, message, lang }`. Lo registra y avisa por correo |

## Correo de contacto

Cada mensaje del formulario queda **siempre** registrado en `contact_requests` y luego se envía al email de
`site_settings`, con el asunto **"Contacto Comercial Landing Page"**. Al responder ese correo, la respuesta va
directo al visitante. Para que Gmail permita el envío:

1. Activa la verificación en 2 pasos en la cuenta de Google.
2. Crea una contraseña de aplicación en https://myaccount.google.com/apppasswords
3. Ponla en `.env` como `SMTP_PASS=` (sin espacios) y deja `SMTP_USER=softenserv@gmail.com`.
4. Reconstruye la API: `docker compose up -d --build api`

En `contact_requests.status` queda `enviado`, `error_envio` (revisa `docker compose logs api`)
o `nuevo` (SMTP sin configurar: el mensaje se guardó pero no se avisó).

## Migraciones de base de datos

La API aplica al arrancar, en orden y una sola vez, los archivos `api/migrations/*.sql` que aún no se hayan
ejecutado (registro en la tabla `schema_migrations`). Para un cambio nuevo, crea el siguiente número
(`006_lo_que_sea.sql`) y reconstruye la API: `docker compose up -d --build api`.

| Migración | Qué hace |
|---|---|
| 001 | Traducciones de los proyectos (columna `translations`) |
| 002 | El formulario pide solo email y mensaje |
| 003 | Slugs de los proyectos en inglés |
| 004 | Texto en inglés de los proyectos en instalaciones nuevas |
| 005 | Contenido desde la base: textos, servicios, email de contacto, límites de largo y registro del idioma |

## Verificación automática (GitHub Actions)

En cada push a `main` y en cada pull request, el flujo **Verificación** (`.github/workflows/verificacion.yml`)
comprueba, sin desplegar nada:

1. **Frontend:** compila en modo producción.
2. **API y base de datos:** crea un PostgreSQL desde cero como Docker (`db/init`), aplica todas las migraciones
   y ejecuta las pruebas de `api/test/`: proyectos, contenido, formulario y límites de largo.
3. **Docker:** construye las imágenes de la API y de la web.

El resultado se ve en la pestaña **Actions** del repositorio. Para correr las pruebas en tu equipo, con Docker
levantado y sin instalar nada fuera de los contenedores:

```bash
docker compose run --rm -v "$PWD/api/test:/app/test" -e TEST_PORT=3999 api npm test
```

> Las pruebas modifican datos temporalmente y los restauran, y dejan un mensaje de prueba en
> `contact_requests`. En GitHub corren contra una base desechable; en tu equipo, mejor sobre una base de desarrollo.

## Demos del portafolio

Cada proyecto tiene una página de demostración (por ahora una maqueta con datos ficticios) en `/demo/<slug>`,
por ejemplo http://localhost:8080/demo/scheduling-professionals. Al hacer clic en la tarjeta del proyecto,
la demo se abre en una pestaña nueva. Las maquetas están en `frontend/src/app/components/demo/mocks.ts`;
para agregar una, crea su componente ahí y su `@case` con el slug en `demo.ts`.

## Dominio y correo con tu dominio

Ver `DOMINIO-Y-CORREO.md`: apuntar softenserv.cl (NIC Chile + Cloudflare) a tu servidor y recibir
contacto@softenserv.cl en tu Gmail.

## Desarrollo local (sin Docker para el frontend)

```bash
docker compose up -d db api      # o corre la API con: cd api && npm i && npm run dev
cd frontend && npm install
npx ng serve                     # http://localhost:4200 (reenvía /api a localhost:3000)
```

Para el modo dev, expón el puerto de la API agregando `ports: ["3000:3000"]` al servicio `api`.
