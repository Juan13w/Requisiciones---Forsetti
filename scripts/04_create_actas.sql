-- Tabla principal de actas de entrega

CREATE TABLE IF NOT EXISTS actas (
  id                      INT AUTO_INCREMENT PRIMARY KEY,

  -- Snapshot de la requisición
  consecutivo             VARCHAR(100)  NOT NULL,
  requisicion_id          INT           NOT NULL,

  -- Formato activo al momento de generar
  formato_acta_id         INT           NOT NULL,

  -- Empresa que entrega (define logo + ciudad). Nullable hasta implementar empresas.
  empresa_id              INT               NULL,

  -- Datos auto-llenados al generar
  fecha_entrega           DATE          NOT NULL,
  ciudad                  VARCHAR(150)  NOT NULL DEFAULT '',
  cliente                 VARCHAR(150)  NOT NULL DEFAULT '',

  -- Entregado por (compras logueado)
  entregado_por_user_id   INT           NOT NULL,
  entregado_por_cargo     VARCHAR(100)  NOT NULL DEFAULT '',
  firma_entregado_url     VARCHAR(500)      NULL,

  -- Recibido por (coordinador, vía link)
  recibido_por_user_id    INT               NULL,
  recibido_por_nombre     VARCHAR(150)      NULL,
  recibido_por_cargo      VARCHAR(150)      NULL,
  fecha_recibido          DATETIME          NULL,
  firma_recibido_url      VARCHAR(500)      NULL,

  -- Token de un solo uso para el link de firma
  firma_token             CHAR(36)          NULL,

  -- Contenido libre
  observaciones           TEXT              NULL,

  -- Estado del ciclo de vida
  estado                  ENUM('borrador','generada','enviada','recibida') NOT NULL DEFAULT 'borrador',

  -- PDF generado (ruta relativa, ej: /uploads/actas/acta_7.pdf)
  pdf_url                 VARCHAR(500)      NULL,

  created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_requisicion  (requisicion_id),
  UNIQUE KEY uq_firma_token  (firma_token),

  FOREIGN KEY (requisicion_id)        REFERENCES requisicion(requisicion_id),
  FOREIGN KEY (formato_acta_id)       REFERENCES formato_acta(id),
  FOREIGN KEY (entregado_por_user_id) REFERENCES compras(usuario_id)

  -- FK empresa_id -> empresas(id) se agrega en script posterior cuando exista la tabla
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
