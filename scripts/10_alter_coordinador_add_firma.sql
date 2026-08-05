-- Agrega nombre, cargo y firma_url a la tabla coordinador, análogo a lo que ya
-- existe en `compras` (ver 01_alter_compras_add_fields.sql). Permite que el
-- coordinador configure su firma una sola vez y se reutilice al confirmar
-- recepción de actas, en vez de tener que dibujarla cada vez.

ALTER TABLE coordinador
  ADD COLUMN nombre    VARCHAR(150) NOT NULL DEFAULT '',
  ADD COLUMN cargo     VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN firma_url VARCHAR(500)     NULL;
