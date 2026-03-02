-- Script para verificar si el aprobador se está guardando
-- Ejecutar este script después de aprobar una requisición

-- 1. Verificar si hay campos de aprobador en la tabla requisicion
SELECT 'CAMPOS EN REQUISICION:' as info;
DESCRIBE requisicion;

-- 2. Verificar si hay campos de aprobador en la tabla historial
SELECT 'CAMPOS EN HISTORIAL:' as info;
DESCRIBE requisicion_historial;

-- 3. Buscar requisiciones aprobadas recientes
SELECT 'REQUISICIONES APROBADAS RECIENTES:' as info;
SELECT 
  requisicion_id,
  consecutivo,
  estado,
  aprobado_por,
  fecha_solicitud
FROM requisicion 
WHERE estado = 'aprobada' 
ORDER BY fecha_solicitud DESC 
LIMIT 5;

-- 4. Buscar historial de aprobaciones recientes
SELECT 'HISTORIAL DE APROBACIONES RECIENTES:' as info;
SELECT 
  id,
  requisicion_id,
  estado,
  aprobador_nombre,
  comentario,
  creado_en
FROM requisicion_historial 
WHERE estado = 'aprobada' 
ORDER BY creado_en DESC 
LIMIT 5;
