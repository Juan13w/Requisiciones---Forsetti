-- Seed inicial de empresas
-- nombre debe coincidir EXACTAMENTE con el campo empresa en la tabla requisicion
-- para que la resolución automática de empresa_id funcione al generar actas.

INSERT INTO empresas (nombre, logo_url, ciudad_default, activo) VALUES
('SCI',            '/images/imagenes/Logo4.png',  'Funza, Cundinamarca', 1),
('EMTRA',          '/images/imagenes/Logo3.png',  'Funza, Cundinamarca', 1),
('INPROSALUD',     '/images/imagenes/Logo2.png',  'Funza, Cundinamarca', 1),
('SIMADRID',       '/images/imagenes/Logo7.png',  'Funza, Cundinamarca', 1),
('EMTRASUR',       '/images/imagenes/Logo5.png',  'Funza, Cundinamarca', 1),
('SERVISALUD',     '/images/imagenes/Logo15.png', 'Funza, Cundinamarca', 1),
('ACCESALUD',      '/images/imagenes/Logo1.png',  'Funza, Cundinamarca', 1),
('INCORPORANDO',   NULL,                           'Funza, Cundinamarca', 1),
('INPROSALUDPLUS', NULL,                           'Funza, Cundinamarca', 1);
