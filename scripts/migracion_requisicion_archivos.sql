-- Crear la tabla requisicion_archivos si no existe
CREATE TABLE IF NOT EXISTS `requisicion_archivos` (
  `archivo_id` int(11) NOT NULL AUTO_INCREMENT,
  `requisicion_id` int(11) NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `ruta_archivo` longblob DEFAULT NULL,
  `tipo_mime` varchar(100) DEFAULT 'application/pdf',
  `tamano` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`archivo_id`),
  KEY `requisicion_id` (`requisicion_id`),
  CONSTRAINT `requisicion_archivos_ibfk_1` FOREIGN KEY (`requisicion_id`) REFERENCES `requisicion` (`requisicion_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrar los PDFs existentes a la nueva tabla
INSERT INTO `requisicion_archivos` (
  `requisicion_id`,
  `nombre_archivo`,
  `ruta_archivo`,
  `tipo_mime`,
  `tamano`,
  `fecha_creacion`
)
SELECT 
  `requisicion_id`,
  CONCAT('requisicion_', `requisicion_id`, '.pdf') as `nombre_archivo`,
  `pdf` as `ruta_archivo`,
  'application/pdf' as `tipo_mime`,
  LENGTH(`pdf`) as `tamano`,
  NOW() as `fecha_creacion`
FROM `requisicion`
WHERE `pdf` IS NOT NULL;

-- Crear un respaldo de la columna pdf por si acaso
ALTER TABLE `requisicion` ADD COLUMN `pdf_backup` LONGBLOB NULL AFTER `pdf`;
UPDATE `requisicion` SET `pdf_backup` = `pdf`;

-- Eliminar la restricción de clave foránea si existe (esto puede variar según tu base de datos)
-- ALTER TABLE `requisicion` DROP FOREIGN KEY `fk_requisicion_coordinador`;

-- Eliminar la columna pdf después de migrar los datos
-- ALTER TABLE `requisicion` DROP COLUMN `pdf`;

-- Nota: Descomenta la línea anterior para eliminar la columna después de verificar que todo funciona correctamente
-- y después de hacer una copia de seguridad de tu base de datos.
