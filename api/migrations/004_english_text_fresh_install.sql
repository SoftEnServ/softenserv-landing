-- En una instalación nueva, db/init ya crea los proyectos con slugs en inglés, por lo que la migración 001
-- (que buscaba los slugs antiguos en español) no les ponía el texto base en inglés: en inglés se veían en español.
-- Se corrige aquí, buscando por los slugs actuales, y solo donde el texto base sigue siendo igual al español
-- (así no se pisan textos editados ni se cambia nada en una base que ya estaba bien).
UPDATE projects AS p SET title = v.title, summary = v.summary, category = v.category
FROM (VALUES
  ('customer-portal',          'Customer portal',              'Web platform where customers can check orders, invoices and support in one place.', 'Web'),
  ('inventory-system',         'Inventory system',             'Multi-warehouse stock control with restock alerts and reports.',                    'Systems'),
  ('scheduling-professionals', 'Scheduling for professionals', 'Online appointment booking with automatic email reminders.',                        'Web'),
  ('erp-integration',          'ERP integration',              'Sales and invoicing sync between the online store and the ERP.',                    'Integrations'),
  ('reports-dashboard',        'Reporting dashboard',          'Real-time business metrics for management.',                                        'Data'),
  ('entrepreneur-website',     'Small business website',       'Self-managed website with a product catalog and contact form.',                     'Web')
) AS v(slug, title, summary, category)
WHERE p.slug = v.slug AND p.title = p.translations->'es'->>'title';
