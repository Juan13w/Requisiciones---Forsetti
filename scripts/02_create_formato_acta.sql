-- Tabla de versiones del formato de acta (eje A del encabezado)
-- Solo un registro puede tener activo = 1 a la vez.
-- Para cambiar de versión: INSERT nuevo + UPDATE SET activo=0 al anterior.

CREATE TABLE IF NOT EXISTS formato_acta (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  codigo      VARCHAR(50)  NOT NULL,
  version     VARCHAR(10)  NOT NULL,
  vigencia    DATE         NOT NULL,
  controlado  VARCHAR(5)   NOT NULL DEFAULT 'SI',
  activo      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
