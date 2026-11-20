-- Proyectos de ejemplo: reemplázalos por tus proyectos reales.
INSERT INTO projects (slug, title, summary, category, status, progress, client, technologies, featured, sort_order, started_at) VALUES
('customer-portal', 'Portal de clientes', 'Plataforma web para que los clientes revisen pedidos, facturas y soporte en un solo lugar.', 'Web', 'en_progreso', 65, 'empresa', ARRAY['Angular','Node.js','PostgreSQL'], TRUE, 1, '2026-08-01'),
('inventory-system', 'Sistema de inventario', 'Control de stock multi-bodega con alertas de reposición y reportes.', 'Sistemas', 'en_progreso', 40, 'empresa', ARRAY['Angular','PostgreSQL','Docker'], TRUE, 2, '2026-09-15'),
('scheduling-professionals', 'Agenda para profesionales', 'Reserva de horas online con recordatorios automáticos por correo.', 'Web', 'completado', 100, 'persona', ARRAY['Angular','Express','PostgreSQL'], TRUE, 3, '2026-03-10'),
('erp-integration', 'Integración con ERP', 'Sincronización de ventas y facturación entre e-commerce y ERP.', 'Integraciones', 'completado', 100, 'empresa', ARRAY['Node.js','REST','Cron'], FALSE, 4, '2026-01-20'),
('reports-dashboard', 'Dashboard de reportes', 'Indicadores de negocio en tiempo real para la gerencia.', 'Datos', 'en_progreso', 25, 'empresa', ARRAY['Angular','Chart.js','PostgreSQL'], FALSE, 5, '2026-10-05'),
('entrepreneur-website', 'Sitio web emprendedor', 'Sitio autoadministrable con catálogo y formulario de contacto.', 'Web', 'planificado', 0, 'persona', ARRAY['Angular','Docker'], FALSE, 6, NULL);
