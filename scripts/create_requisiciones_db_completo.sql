-- =============================================================================
-- SCRIPT DE CREACIÓN COMPLETA: requisiciones_db
-- Generado: 2026-06-01
-- Fuente:   Extraído de archivos .frm vía INFORMATION_SCHEMA + scripts del proyecto
-- MariaDB:  10.4.32
-- =============================================================================
-- Orden de creación respeta dependencias de claves foráneas:
--   coordinador, compras, administrador, formato_acta, empresas,
--   password_reset_tokens, requisicion, requisicion_archivos,
--   requisicion_historial, actas, acta_items
-- =============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `requisiciones_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE `requisiciones_db`;
-- -----------------------------------------------------------------------------


-- ============================================================
-- 1. coordinador
-- ============================================================
CREATE TABLE IF NOT EXISTS `coordinador` (
  `coordinador_id` int(100)     NOT NULL AUTO_INCREMENT,
  `correo`         varchar(100) NOT NULL,
  `empresa`        text         NOT NULL,
  `clave`          varchar(100) NOT NULL,
  PRIMARY KEY (`coordinador_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 2. compras
-- ============================================================
CREATE TABLE IF NOT EXISTS `compras` (
  `usuario_id` int(100)     NOT NULL AUTO_INCREMENT,
  `correo`     varchar(100) NOT NULL,
  `clave`      varchar(100) NOT NULL,
  `nombre`     varchar(100) NOT NULL DEFAULT '',
  `cargo`      varchar(100) NOT NULL DEFAULT '',
  `firma_url`  varchar(500)     NULL,
  PRIMARY KEY (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 3. administrador
-- ============================================================
CREATE TABLE IF NOT EXISTS `administrador` (
  `administrador_id` int(100)     NOT NULL AUTO_INCREMENT,
  `correo`           varchar(100) NOT NULL,
  `clave`            varchar(100) NOT NULL,
  PRIMARY KEY (`administrador_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 4. formato_acta
-- ============================================================
CREATE TABLE IF NOT EXISTS `formato_acta` (
  `id`         int(11)     NOT NULL AUTO_INCREMENT,
  `codigo`     varchar(50) NOT NULL,
  `version`    varchar(10) NOT NULL,
  `vigencia`   date        NOT NULL,
  `controlado` varchar(5)  NOT NULL DEFAULT 'SI',
  `activo`     tinyint(1)  NOT NULL DEFAULT 0,
  `created_at` timestamp   NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 5. empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS `empresas` (
  `id`             int(11)      NOT NULL AUTO_INCREMENT,
  `nombre`         varchar(150) NOT NULL,
  `nit`            varchar(50)      NULL,
  `logo_url`       varchar(500)     NULL,
  `ciudad_default` varchar(150) NOT NULL DEFAULT '',
  `activo`         tinyint(1)   NOT NULL DEFAULT 1,
  `created_at`     timestamp    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 6. password_reset_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`         int(11)      NOT NULL AUTO_INCREMENT,
  `email`      varchar(255) NOT NULL,
  `token`      varchar(255) NOT NULL,
  `expires_at` datetime     NOT NULL,
  `created_at` datetime         NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `token`      (`token`),
  KEY        `idx_email`  (`email`),
  KEY        `idx_expires`(`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 7. requisicion
-- ============================================================
CREATE TABLE IF NOT EXISTS `requisicion` (
  `requisicion_id`           int(100)     NOT NULL AUTO_INCREMENT,
  `consecutivo`              varchar(100) NOT NULL,
  `empresa`                  varchar(100) NOT NULL,
  `fecha_solicitud`          datetime     NOT NULL,
  `nombre_solicitante`       text         NOT NULL,
  `proceso`                  varchar(100) NOT NULL,
  `justificacion`            text         NOT NULL,
  `justificacion_ti`         varchar(100) NOT NULL,
  `descripcion`              text         NOT NULL,
  `cantidad`                 int(100)     NOT NULL,
  `estado`                   varchar(20)  NOT NULL DEFAULT 'pendiente',
  `intentos_revision`        int(11)      NOT NULL,
  `comentario_respuesta`     varchar(100)     NULL,
  `comentario_rechazo`       varchar(100) NOT NULL,
  `comentario_rechazo_f`     varchar(255) NOT NULL DEFAULT '',
  `fecha_ultimo_rechazo`     datetime         NULL,
  `pdf`                      longblob     NOT NULL,
  `coordinador_id`           int(11)          NULL,
  `fecha_ultimo_modificacion` timestamp   NOT NULL DEFAULT current_timestamp()
                                                    ON UPDATE current_timestamp(),
  `aprobado_por`             varchar(255)     NULL,
  PRIMARY KEY (`requisicion_id`),
  KEY `fk_requisicion_coordinador` (`coordinador_id`),
  CONSTRAINT `fk_requisicion_coordinador`
    FOREIGN KEY (`coordinador_id`)
    REFERENCES `coordinador` (`coordinador_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 8. requisicion_archivos
-- ============================================================
CREATE TABLE IF NOT EXISTS `requisicion_archivos` (
  `archivo_id`      int(11)      NOT NULL AUTO_INCREMENT,
  `requisicion_id`  int(11)      NOT NULL,
  `nombre_archivo`  varchar(255) NOT NULL,
  `ruta_archivo`    longblob     NOT NULL,
  `fecha_subida`    timestamp    NOT NULL DEFAULT current_timestamp(),
  `tipo_mime`       varchar(100) NOT NULL,
  `tamano`          int(11)      NOT NULL,
  PRIMARY KEY (`archivo_id`),
  KEY `requisicion_id` (`requisicion_id`),
  CONSTRAINT `requisicion_archivos_ibfk_1`
    FOREIGN KEY (`requisicion_id`)
    REFERENCES `requisicion` (`requisicion_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 9. requisicion_historial
-- ============================================================
CREATE TABLE IF NOT EXISTS `requisicion_historial` (
  `id`               int(11)      NOT NULL AUTO_INCREMENT,
  `requisicion_id`   int(11)      NOT NULL,
  `estado`           varchar(20)  NOT NULL,
  `comentario`       text             NULL,
  `usuario`          varchar(255)     NULL,
  `creado_en`        timestamp    NOT NULL DEFAULT current_timestamp(),
  `aprobador_nombre` varchar(255)     NULL,
  PRIMARY KEY (`id`),
  KEY `idx_historial_requisicion_id` (`requisicion_id`),
  CONSTRAINT `fk_historial_requisicion`
    FOREIGN KEY (`requisicion_id`)
    REFERENCES `requisicion` (`requisicion_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 10. actas
-- ============================================================
CREATE TABLE IF NOT EXISTS `actas` (
  `id`                    int(11)      NOT NULL AUTO_INCREMENT,
  `consecutivo`           varchar(100) NOT NULL,
  `requisicion_id`        int(11)      NOT NULL,
  `formato_acta_id`       int(11)      NOT NULL,
  `empresa_id`            int(11)          NULL,
  `fecha_entrega`         date         NOT NULL,
  `ciudad`                varchar(150) NOT NULL DEFAULT '',
  `cliente`               varchar(150) NOT NULL DEFAULT '',
  `entregado_por_user_id` int(11)      NOT NULL,
  `entregado_por_cargo`   varchar(100) NOT NULL DEFAULT '',
  `firma_entregado_url`   varchar(500)     NULL,
  `recibido_por_user_id`  int(11)          NULL,
  `recibido_por_nombre`   varchar(150)     NULL,
  `recibido_por_cargo`    varchar(150)     NULL,
  `fecha_recibido`        datetime         NULL,
  `firma_recibido_url`    varchar(500)     NULL,
  `firma_token`           char(36)         NULL,
  `observaciones`         text             NULL,
  `estado`                enum('borrador','generada','enviada','recibida')
                                       NOT NULL DEFAULT 'borrador',
  `pdf_url`               varchar(500)     NULL,
  `created_at`            timestamp    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_requisicion` (`requisicion_id`),
  UNIQUE KEY `uq_firma_token` (`firma_token`),
  KEY `formato_acta_id`       (`formato_acta_id`),
  KEY `entregado_por_user_id` (`entregado_por_user_id`),
  CONSTRAINT `actas_ibfk_1`
    FOREIGN KEY (`requisicion_id`)
    REFERENCES `requisicion` (`requisicion_id`)
    ON DELETE CASCADE,
  CONSTRAINT `actas_ibfk_2`
    FOREIGN KEY (`formato_acta_id`)
    REFERENCES `formato_acta` (`id`),
  CONSTRAINT `actas_ibfk_3`
    FOREIGN KEY (`entregado_por_user_id`)
    REFERENCES `compras` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- 11. acta_items
-- ============================================================
CREATE TABLE IF NOT EXISTS `acta_items` (
  `id`              int(11)       NOT NULL AUTO_INCREMENT,
  `acta_id`         int(11)       NOT NULL,
  `codigo_articulo` varchar(100)  NOT NULL DEFAULT '',
  `descripcion`     text          NOT NULL,
  `cantidad`        decimal(10,2) NOT NULL,
  `orden`           int(11)       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `acta_id` (`acta_id`),
  CONSTRAINT `acta_items_ibfk_1`
    FOREIGN KEY (`acta_id`)
    REFERENCES `actas` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =============================================================================
-- DATOS SEED (usuarios y configuración base)
-- =============================================================================

INSERT IGNORE INTO `administrador` (`administrador_id`, `correo`, `clave`) VALUES
(1, 'admin@empresa.com', 'admin1234');

INSERT IGNORE INTO `formato_acta` (`codigo`, `version`, `vigencia`, `controlado`, `activo`) VALUES
('LG-FO13', '03', '2025-04-03', 'SI', 1);

INSERT IGNORE INTO `empresas` (`nombre`, `logo_url`, `ciudad_default`, `activo`) VALUES
('SCI',            '/images/imagenes/Logo4.png',  'Funza, Cundinamarca', 1),
('EMTRA',          '/images/imagenes/Logo3.png',  'Funza, Cundinamarca', 1),
('INPROSALUD',     '/images/imagenes/Logo2.png',  'Funza, Cundinamarca', 1),
('SIMADRID',       '/images/imagenes/Logo7.png',  'Funza, Cundinamarca', 1),
('EMTRASUR',       '/images/imagenes/Logo5.png',  'Funza, Cundinamarca', 1),
('SERVISALUD',     '/images/imagenes/Logo15.png', 'Funza, Cundinamarca', 1),
('ACCESALUD',      '/images/imagenes/Logo1.png',  'Funza, Cundinamarca', 1),
('INCORPORANDO',   NULL,                           'Funza, Cundinamarca', 1),
('INPROSALUDPLUS', NULL,                           'Funza, Cundinamarca', 1);

INSERT IGNORE INTO `compras` (`usuario_id`, `correo`, `clave`, `nombre`, `cargo`) VALUES
(1,  'michael.guataqui@emtra.com.co',          'K8ZQ4', '', ''),
(2,  'andres.nunez@simadrid.com.co',            'T9LQ2', '', ''),
(3,  'walter.florez@emtrasur.com.co',           'B7XK1', '', ''),
(4,  'jairo.oviedo@sertti.com.co',              'M6PT9', '', ''),
(5,  'ender.soto@solucionescorp.com.co',         'Q4VZ7', '', ''),
(6,  'juan.hernandez@solucionescorp.com.co',     'R3TX8', '', ''),
(7,  'angi.cardenas@solucionescorp.com.co',      'W5JP6', '', ''),
(8,  'miguel.izquierdo@solucionescorp.com.co',   'H4ZN2', '', ''),
(9,  'sandra.hernandez@emtra.com.co',            'SAN25', '', '');

INSERT IGNORE INTO `coordinador` (`coordinador_id`, `correo`, `empresa`, `clave`) VALUES
(1,  'ingrith.supelano@transitoxpress.co',              'SCI',         'A9XQ2'),
(2,  'andrea.velandia@transitoxpress.co',               'SCI',         'QW7D3'),
(3,  'claudia.parra@solucionescorp.com.co',             'SCI',         'M4ZT8'),
(4,  'german.sanchez@solucionescorp.com.co',            'SCI',         'P8LQ1'),
(5,  'paula.martinez@solucionescorp.com.co',            'SCI',         'Z3TX9'),
(6,  'william.zamora@solucionescorp.com.co',            'SCI',         'L7VQ4'),
(7,  'steve.vargas@solucionescorp.com.co',              'SCI',         'R9MP2'),
(8,  'andrea.pena@solucionescorp.co',                   'SCI',         'D6QK5'),
(9,  'blanca.lopez@emtra.com.co',                       'SCI',         'J2NX8'),
(10, 'dulfay.aponte@solucionescorp.com.co',             'SCI',         'T5KP7'),
(11, 'lorena.ramos@solucionescorp.com.co',              'SCI',         'F8WZ4'),
(12, 'pedro.pena@solucionescorp.com.co',                'SCI',         'K1QZ6'),
(14, 'laura.romero@emtra.com.co',                       'EMTRA',       'B5TZ9'),
(15, 'laura.mosuca@emtra.com.co',                       'EMTRA',       'R7MW1'),
(16, 'marcela.susatama@emtra.com.co',                   'EMTRA',       'H3KQ8'),
(17, 'neyirette.benavides@emtra.com.co',                'EMTRA',       'W9PL2'),
(18, 'andrea.beltran@emtra.com.co',                     'EMTRA',       'M6TX5'),
(19, 'contador@emtra.com.co',                           'EMTRA',       'P4VQ7'),
(20, 'helen.arguello@emtra.com.co',                     'EMTRA',       'S2KJ9'),
(21, 'contabilidad@emtra.com.co',                       'EMTRA',       'L8DQP'),
(22, 'cesar.ortega@emtra.com.co',                       'EMTRA',       'Q7WZ3'),
(23, 'arley.rincon@emtra.com.co',                       'EMTRA',       'Z6NP4'),
(24, 'gestionhumana@inprosalud.co',                     'INPROSALUD',  'K9TQ1'),
(25, 'contador@inprosalud.co',                          'INPROSALUD',  'F3XZ8'),
(26, 'xiomara.jimenez@inprosalud.co',                   'INPROSALUD',  'J5LP2'),
(27, 'paola.castiblanco@inprosalud.co',                 'INPROSALUD',  'R8QZ7'),
(29, 'paul.barros@simadrid.com.co',                     'SIMADRID',    'G7KQ2'),
(30, 'ivonne.martinez@simadrid.com.co',                 'SIMADRID',    'M5RZ8'),
(31, 'contador@simadrid.com.co',                        'SIMADRID',    'Q9LP3'),
(32, 'laura.bulla@simadrid.com.co',                     'SIMADRID',    'Z6TW1'),
(33, 'monica.tusso@simadrid.com.co',                    'SIMADRID',    'P3FV7'),
(34, 'sebastian.velasquez@emtrasur.com.co',             'EMTRASUR',    'H8QN2'),
(35, 'yuri.ripe@emtrasur.com.co',                       'EMTRASUR',    'L5ZQ9'),
(37, 'ana.echavarria@emtrasur.com.co',                  'EMTRASUR',    'X2KQ8'),
(38, 'lina.ortiz@emtrasur.com.co',                      'EMTRASUR',    'V9TL3'),
(39, 'karol.palacio@emtrasur.com.co',                   'EMTRASUR',    'W4PQ7'),
(40, 'sandra.montoya@emtrasur.com.co',                  'EMTRASUR',    'J6ZX1'),
(41, 'loyda.fajardo@incorporando.com.co',               'INCORPORANDO','N7KQ5'),
(42, 'giselle.juyo@incorporando.com.co',                'INCORPORANDO','R2MP8'),
(43, 'rulexor.monasterios@solucionescorp.com.co',       'multiple',    'RUL25');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
