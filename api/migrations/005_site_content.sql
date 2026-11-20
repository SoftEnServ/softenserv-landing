-- =====================================================================================================
-- Contenido de la página desde la base de datos
--   content_fields    catálogo de textos de contenido (títulos, subtítulos y bajadas) con su largo máximo
--   content_texts     el texto de cada campo en cada idioma (es / en)
--   services          los servicios (orden, ícono, visibles u ocultos)
--   service_texts     el texto de cada servicio en cada idioma
--   site_settings     ajustes del sitio (una sola fila): el email de contacto
-- Además: límites de largo en los textos traducidos de los proyectos, y el registro de mensajes del
-- formulario guarda el idioma y a qué email se notificó.
--
-- Todos los límites los hace respetar la propia base de datos: un INSERT o UPDATE con un texto más largo
-- que el permitido (o vacío) se rechaza con un mensaje que indica el campo y el máximo.
-- =====================================================================================================

-- ---------- Textos de contenido ----------
CREATE TABLE content_fields (
  section     VARCHAR(30) NOT NULL,                 -- hero | services | projects | contact
  field       VARCHAR(30) NOT NULL,                 -- eyebrow, title, lead...
  max_len     SMALLINT    NOT NULL CHECK (max_len BETWEEN 1 AND 2000),
  description VARCHAR(200),                         -- dónde se ve (para quien edite)
  PRIMARY KEY (section, field)
);

CREATE TABLE content_texts (
  section    VARCHAR(30) NOT NULL,
  field      VARCHAR(30) NOT NULL,
  lang       CHAR(2)     NOT NULL CHECK (lang IN ('es', 'en')),
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (section, field, lang),
  FOREIGN KEY (section, field) REFERENCES content_fields (section, field) ON UPDATE CASCADE
);

-- Largo máximo según el catálogo, y no vacío
CREATE OR REPLACE FUNCTION check_content_text() RETURNS TRIGGER AS $$
DECLARE lim SMALLINT;
BEGIN
  SELECT max_len INTO lim FROM content_fields WHERE section = NEW.section AND field = NEW.field;
  IF btrim(NEW.value) = '' THEN
    RAISE EXCEPTION 'El texto %.% (%) no puede quedar vacío', NEW.section, NEW.field, NEW.lang;
  END IF;
  IF char_length(NEW.value) > lim THEN
    RAISE EXCEPTION 'El texto %.% (%) tiene % caracteres; el máximo es %',
      NEW.section, NEW.field, NEW.lang, char_length(NEW.value), lim;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_texts_check BEFORE INSERT OR UPDATE ON content_texts
  FOR EACH ROW EXECUTE FUNCTION check_content_text();

-- Si se achica un máximo, no puede quedar ningún texto existente por sobre él
CREATE OR REPLACE FUNCTION check_content_field_limit() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM content_texts t WHERE t.section = NEW.section AND t.field = NEW.field
             AND char_length(t.value) > NEW.max_len) THEN
    RAISE EXCEPTION 'Hay textos de %.% más largos que % caracteres: acórtalos antes de bajar el máximo',
      NEW.section, NEW.field, NEW.max_len;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_fields_limit BEFORE UPDATE OF max_len ON content_fields
  FOR EACH ROW EXECUTE FUNCTION check_content_field_limit();

INSERT INTO content_fields (section, field, max_len, description) VALUES
  ('hero',     'eyebrow',  60, 'Inicio: título pequeño sobre el titular (junto a la casita)'),
  ('hero',     'titleA',   60, 'Inicio: titular, primera parte'),
  ('hero',     'titleHl',  60, 'Inicio: titular, parte destacada en verde'),
  ('hero',     'titleB',   10, 'Inicio: titular, cierre (por ejemplo el punto final)'),
  ('hero',     'lead',    200, 'Inicio: bajada bajo el titular'),
  ('services', 'eyebrow',  30, 'Servicios: título de la sección'),
  ('services', 'title',   120, 'Servicios: subtítulo'),
  ('services', 'lead',    200, 'Servicios: bajada'),
  ('projects', 'eyebrow',  30, 'Proyectos: título de la sección'),
  ('projects', 'title',   120, 'Proyectos: subtítulo'),
  ('contact',  'eyebrow',  30, 'Contacto: título de la sección'),
  ('contact',  'title',   160, 'Contacto: subtítulo'),
  ('contact',  'lead',    400, 'Contacto: bajada'),
  ('contact',  'perk1',    80, 'Contacto: primer punto destacado (con ✓)'),
  ('contact',  'perk2',    80, 'Contacto: segundo punto destacado (con ✓)');

INSERT INTO content_texts (section, field, lang, value) VALUES
  ('hero', 'eyebrow', 'es', 'Desarrollo y Sistemas a medida'),
  ('hero', 'eyebrow', 'en', 'Custom Development and Systems'),
  ('hero', 'titleA',  'es', 'Tus requerimientos en '),
  ('hero', 'titleA',  'en', 'Your requirements into '),
  ('hero', 'titleHl', 'es', 'soluciones que funcionan'),
  ('hero', 'titleHl', 'en', 'solutions that work'),
  ('hero', 'titleB',  'es', '.'),
  ('hero', 'titleB',  'en', '.'),
  ('hero', 'lead',    'es', 'Te escuchamos, luego definimos para construir y entregar tu producto.'),
  ('hero', 'lead',    'en', 'We listen to you, then we define, to build and deliver your product.'),
  ('services', 'eyebrow', 'es', 'Servicios'),
  ('services', 'eyebrow', 'en', 'Services'),
  ('services', 'title',   'es', 'Estas son las áreas en las que nos desenvolvemos'),
  ('services', 'title',   'en', 'These are the areas we work in'),
  ('services', 'lead',    'es', 'Cada una de ellas es parte de un todo, pero son especialidades por separado.'),
  ('services', 'lead',    'en', 'Each one is part of a whole, but they are separate specialties.'),
  ('projects', 'eyebrow', 'es', 'Proyectos'),
  ('projects', 'eyebrow', 'en', 'Projects'),
  ('projects', 'title',   'es', 'Conócenos por las soluciones que construimos.'),
  ('projects', 'title',   'en', 'Get to know us through the solutions we build.'),
  ('contact', 'eyebrow', 'es', 'Contacto'),
  ('contact', 'eyebrow', 'en', 'Contact'),
  ('contact', 'title',   'es', '¿Algún proyecto en mente? ¿Algún problema específico que solucionar?'),
  ('contact', 'title',   'en', 'A project in mind? A specific problem to solve?'),
  ('contact', 'lead',    'es', 'Sólo cuéntanos qué necesitas referenciando tu caso y tus datos. Te responderemos a la brevedad para preparar una solución acorde a tus necesidades.'),
  ('contact', 'lead',    'en', 'Just tell us what you need, describing your case and your contact details. We''ll get back to you shortly to prepare a solution that fits your needs.'),
  ('contact', 'perk1',   'es', 'Propuesta con alcance y plazos claros'),
  ('contact', 'perk1',   'en', 'A proposal with clear scope and timelines'),
  ('contact', 'perk2',   'es', 'Para empresas y personas'),
  ('contact', 'perk2',   'en', 'For businesses and individuals');

-- ---------- Servicios ----------
CREATE TABLE services (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(60) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- ícono del catálogo del sitio (los dibujos están en el código; aquí solo se elige cuál)
  icon       VARCHAR(30) NOT NULL CHECK (icon IN ('requirements', 'web', 'systems', 'integrations', 'mobile', 'data', 'cloud', 'support')),
  sort_order INT NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,          -- FALSE: no se muestra
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE service_texts (
  service_id INT     NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  lang       CHAR(2) NOT NULL CHECK (lang IN ('es', 'en')),
  title      TEXT    NOT NULL CONSTRAINT service_title_1_a_60_caracteres   CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
  summary    TEXT    NOT NULL CONSTRAINT service_summary_1_a_200_caracteres CHECK (char_length(btrim(summary)) BETWEEN 1 AND 200),
  -- texto más largo para la ventana que se abre al hacer clic; si está vacío, se muestra el resumen
  details    TEXT             CONSTRAINT service_details_hasta_1500_caracteres CHECK (details IS NULL OR char_length(details) <= 1500),
  PRIMARY KEY (service_id, lang)
);

INSERT INTO services (slug, icon, sort_order) VALUES
  ('requirements', 'requirements', 1),
  ('web-applications', 'web', 2),
  ('management-systems', 'systems', 3),
  ('integrations', 'integrations', 4);

INSERT INTO service_texts (service_id, lang, title, summary)
SELECT s.id, v.lang, v.title, v.summary FROM (VALUES
  ('requirements', 'es', 'Levantamiento de requerimientos', 'Entendemos tu proceso y lo traducimos en requerimientos claros, priorizados y medibles.'),
  ('requirements', 'en', 'Requirements gathering', 'We understand your process and turn it into clear, prioritized and measurable requirements.'),
  ('web-applications', 'es', 'Aplicaciones web', 'Portales, plataformas y sitios modernos, rápidos y adaptados a cualquier dispositivo.'),
  ('web-applications', 'en', 'Web applications', 'Modern, fast portals, platforms and websites that work on any device.'),
  ('management-systems', 'es', 'Sistemas de gestión', 'Inventario, ventas, agendas y procesos internos hechos a la medida de tu operación.'),
  ('management-systems', 'en', 'Management systems', 'Inventory, sales, scheduling and internal processes built around how you operate.'),
  ('integrations', 'es', 'Integraciones y APIs', 'Conectamos tus herramientas: ERP, pasarelas de pago, correo y servicios externos.'),
  ('integrations', 'en', 'Integrations & APIs', 'We connect your tools: ERP, payment gateways, email and third-party services.')
) AS v(slug, lang, title, summary) JOIN services s ON s.slug = v.slug;

-- ---------- Ajustes del sitio (una sola fila) ----------
CREATE TABLE site_settings (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- email que se muestra en Contacto y al que llegan los mensajes del formulario
  contact_email VARCHAR(160) NOT NULL
    CONSTRAINT contact_email_formato_valido CHECK (contact_email ~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$'),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
INSERT INTO site_settings (contact_email) VALUES ('softenserv@gmail.com');

-- ---------- Proyectos: límites también en los textos traducidos ----------
-- (el texto base en inglés ya los tiene: title 160, summary 300, category 60)
ALTER TABLE projects
  ADD CONSTRAINT project_translation_title_hasta_160
    CHECK (char_length(COALESCE(translations->'es'->>'title', '')) <= 160),
  ADD CONSTRAINT project_translation_summary_hasta_300
    CHECK (char_length(COALESCE(translations->'es'->>'summary', '')) <= 300),
  ADD CONSTRAINT project_translation_category_hasta_60
    CHECK (char_length(COALESCE(translations->'es'->>'category', '')) <= 60);

-- ---------- Registro de mensajes del formulario ----------
ALTER TABLE contact_requests
  ADD COLUMN lang        CHAR(2) CHECK (lang IN ('es', 'en')),   -- idioma en que se escribió
  ADD COLUMN notified_to VARCHAR(160);                            -- email al que se notificó
