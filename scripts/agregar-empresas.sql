-- Script para agregar las nuevas empresas: servisalud, accesalud, improsaludplus
-- Ejecutar este script en tu base de datos MySQL

-- Insertar las nuevas empresas en la tabla coordinador
INSERT INTO coordinador (correo, empresa, clave) VALUES 
('coordinador@servisalud.com', 'servisalud', 'SRV2025'),
('coordinador@accesalud.com', 'accesalud', 'ACC2025'),
('coordinador@improsaludplus.com', 'improsaludplus', 'IMP2025');

-- Opcional: Agregar algunas requisiciones de ejemplo para cada empresa (para pruebas)
-- Puedes comentar estas líneas si no quieres datos de prueba

-- INSERT INTO requisicion (consecutivo, empresa, fecha_solicitud, nombre_solicitante, proceso, justificacion, descripcion, cantidad, estado, coordinador_id) VALUES
-- ('REQ-2025-SRV1', 'servisalud', CURDATE(), 'coordinador@servisalud.com', 'Sistemas', 'Prueba de requisición', 'Equipos de cómputo para oficina', 5, 'pendiente', (SELECT coordinador_id FROM coordinador WHERE empresa = 'servisalud' LIMIT 1)),
-- ('REQ-2025-ACC1', 'accesalud', CURDATE(), 'coordinador@accesalud.com', 'Suministros', 'Prueba de requisición', 'Material médico de oficina', 10, 'pendiente', (SELECT coordinador_id FROM coordinador WHERE empresa = 'accesalud' LIMIT 1)),
-- ('REQ-2025-IMP1', 'improsaludplus', CURDATE(), 'coordinador@improsaludplus.com', 'Mantenimiento', 'Prueba de requisición', 'Herramientas de mantenimiento', 3, 'pendiente', (SELECT coordinador_id FROM coordinador WHERE empresa = 'improsaludplus' LIMIT 1));
