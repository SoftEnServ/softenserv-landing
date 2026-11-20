-- Idiomas: el texto base de cada proyecto queda en INGLÉS (idioma principal)
-- y las traducciones van en la columna JSONB "translations", por ejemplo:
--   {"es": {"title": "...", "summary": "...", "category": "..."}}

ALTER TABLE projects ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Los proyectos existentes estaban en español: se mueven a translations.es
UPDATE projects
SET translations = jsonb_build_object('es', jsonb_build_object('title', title, 'summary', summary, 'category', category))
WHERE translations = '{}'::jsonb;

-- Texto base en inglés para los proyectos de ejemplo
UPDATE projects SET title = 'Customer portal', summary = 'Web platform where customers can check orders, invoices and support in one place.', category = 'Web' WHERE slug = 'portal-clientes';
UPDATE projects SET title = 'Inventory system', summary = 'Multi-warehouse stock control with restock alerts and reports.', category = 'Systems' WHERE slug = 'gestion-inventario';
UPDATE projects SET title = 'Scheduling for professionals', summary = 'Online appointment booking with automatic email reminders.', category = 'Web' WHERE slug = 'agenda-profesional';
UPDATE projects SET title = 'ERP integration', summary = 'Sales and invoicing sync between the online store and the ERP.', category = 'Integrations' WHERE slug = 'integracion-erp';
UPDATE projects SET title = 'Reporting dashboard', summary = 'Real-time business metrics for management.', category = 'Data' WHERE slug = 'app-reportes';
UPDATE projects SET title = 'Small business website', summary = 'Self-managed website with a product catalog and contact form.', category = 'Web' WHERE slug = 'sitio-emprendedor';
