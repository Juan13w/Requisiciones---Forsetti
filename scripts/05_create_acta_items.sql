-- Ítems de cada acta (tabla de artículos entregados)

CREATE TABLE IF NOT EXISTS acta_items (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  acta_id          INT           NOT NULL,
  codigo_articulo  VARCHAR(100)  NOT NULL DEFAULT '',
  descripcion      TEXT          NOT NULL,
  cantidad         DECIMAL(10,2) NOT NULL,
  orden            INT           NOT NULL DEFAULT 0,

  FOREIGN KEY (acta_id) REFERENCES actas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
