-- Slugs en inglés: cada proyecto tiene su página de demostración en un subdominio
-- (por ejemplo, scheduling-professionals.tudominio.com).
UPDATE projects SET slug = 'customer-portal'          WHERE slug = 'portal-clientes';
UPDATE projects SET slug = 'inventory-system'         WHERE slug = 'gestion-inventario';
UPDATE projects SET slug = 'scheduling-professionals' WHERE slug = 'agenda-profesional';
UPDATE projects SET slug = 'erp-integration'          WHERE slug = 'integracion-erp';
UPDATE projects SET slug = 'reports-dashboard'        WHERE slug = 'app-reportes';
UPDATE projects SET slug = 'entrepreneur-website'     WHERE slug = 'sitio-emprendedor';
