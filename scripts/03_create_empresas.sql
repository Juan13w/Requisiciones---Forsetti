-- Tabla de empresas (eje B del encabezado: logo + ciudad)
-- Los logos ya existen en public/images/imagenes/
-- logo_url almacena la ruta relativa, ej: /images/imagenes/Logo1.png

CREATE TABLE IF NOT EXISTS empresas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  nit            VARCHAR(50)      NULL,
  logo_url       VARCHAR(500)     NULL,
  ciudad_default VARCHAR(150) NOT NULL DEFAULT '',
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- NOTA: actas.empresa_id referenciará esta tabla.
-- El FK se agrega cuando se poblen los datos de empresas.
-- Por ahora la columna en actas es nullable sin FK formal.
