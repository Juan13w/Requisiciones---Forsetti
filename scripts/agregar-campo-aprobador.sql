-- Script para agregar campos de aprobador a las tablas
-- Ejecutar este script para modificar la estructura de la base de datos

-- 1. Agregar campo a tabla requisicion (para PDF)
ALTER TABLE requisicion ADD COLUMN aprobado_por VARCHAR(255) DEFAULT NULL;

-- 2. Agregar campos a tabla requisicion_historial (para historial)
ALTER TABLE requisicion_historial ADD COLUMN aprobador_id INT DEFAULT NULL;
ALTER TABLE requisicion_historial ADD COLUMN aprobador_nombre VARCHAR(255) DEFAULT NULL;

-- 3. Crear índice para mejor rendimiento
CREATE INDEX idx_requisicion_aprobado_por ON requisicion(aprobado_por);
CREATE INDEX idx_historial_aprobador_id ON requisicion_historial(aprobador_id);
