-- Esquema principal de Software Engineering Services
CREATE TYPE project_status AS ENUM ('planificado', 'en_progreso', 'completado');
CREATE TYPE client_type AS ENUM ('empresa', 'persona');

CREATE TABLE projects (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(120) UNIQUE NOT NULL,
  title         VARCHAR(160) NOT NULL,
  summary       VARCHAR(300) NOT NULL,
  description   TEXT,
  category      VARCHAR(60)  NOT NULL,          -- ej: Web, Móvil, Sistemas, Integraciones
  status        project_status NOT NULL DEFAULT 'en_progreso',
  progress      SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  client        client_type NOT NULL DEFAULT 'empresa',
  technologies  TEXT[] NOT NULL DEFAULT '{}',
  image_url     VARCHAR(500),
  repo_url      VARCHAR(500),
  demo_url      VARCHAR(500),
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT NOT NULL DEFAULT 0,
  started_at    DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status   ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);

-- Solicitudes de contacto / toma inicial de requerimientos
CREATE TABLE contact_requests (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL,
  company     VARCHAR(160),
  service     VARCHAR(80),
  message     TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
