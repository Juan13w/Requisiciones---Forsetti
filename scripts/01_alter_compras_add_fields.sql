-- Agrega nombre, cargo y firma_url a la tabla compras
-- Ejecutar una sola vez

ALTER TABLE compras
  ADD COLUMN nombre    VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN cargo     VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN firma_url VARCHAR(500)     NULL;
