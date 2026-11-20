-- El formulario de contacto ahora pide solo email y mensaje: el nombre pasa a ser opcional.
ALTER TABLE contact_requests ALTER COLUMN name DROP NOT NULL;
