-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-10-2025 a las 15:35:35
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `requisiciones_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `administrador`
--

CREATE TABLE `administrador` (
  `administrador_id` int(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `clave` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `administrador`
--

INSERT INTO `administrador` (`administrador_id`, `correo`, `clave`) VALUES
(1, 'admin@empresa.com', 'admin1234');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `usuario_id` int(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `clave` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `compras`
--

INSERT INTO `compras` (`usuario_id`, `correo`, `clave`) VALUES
(1, 'michael.guataqui@emtra.com.co', 'K8ZQ4'),
(2, 'andres.nunez@simadrid.com.co', 'T9LQ2'),
(3, 'walter.florez@emtrasur.com.co', 'B7XK1'),
(4, 'jairo.oviedo@sertti.com.co', 'M6PT9'),
(5, 'ender.soto@solucionescorp.com.co', 'Q4VZ7'),
(6, 'juan.hernandez@solucionescorp.com.co', 'R3TX8'),
(7, 'angi.cardenas@solucionescorp.com.co', 'W5JP6'),
(8, 'miguel.izquierdo@solucionescorp.com.co', 'H4ZN2'),
(9, 'sandra.hernandez@emtra.com.co', 'SAN25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `coordinador`
--

CREATE TABLE `coordinador` (
  `coordinador_id` int(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `empresa` text NOT NULL,
  `clave` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `coordinador`
--

INSERT INTO `coordinador` (`coordinador_id`, `correo`, `empresa`, `clave`) VALUES
(1, 'ingrith.supelano@transitoxpress.co', 'SCI', 'A9XQ2'),
(2, 'andrea.velandia@transitoxpress.co', 'SCI', 'QW7D3'),
(3, 'claudia.parra@solucionescorp.com.co', 'SCI', 'M4ZT8'),
(4, 'german.sanchez@solucionescorp.com.co', 'SCI', 'P8LQ1'),
(5, 'paula.martinez@solucionescorp.com.co', 'SCI', 'Z3TX9'),
(6, 'william.zamora@solucionescorp.com.co', 'SCI', 'L7VQ4'),
(7, 'steve.vargas@solucionescorp.com.co', 'SCI', 'R9MP2'),
(8, 'andrea.pena@solucionescorp.co', 'SCI', 'D6QK5'),
(9, 'blanca.lopez@emtra.com.co', 'SCI', 'J2NX8'),
(10, 'dulfay.aponte@solucionescorp.com.co', 'SCI', 'T5KP7'),
(11, 'lorena.ramos@solucionescorp.com.co', 'SCI', 'F8WZ4'),
(12, 'pedro.pena@solucionescorp.com.co', 'SCI', 'K1QZ6'),
(14, 'laura.romero@emtra.com.co', 'EMTRA', 'B5TZ9'),
(15, 'laura.mosuca@emtra.com.co', 'EMTRA', 'R7MW1'),
(16, 'marcela.susatama@emtra.com.co', 'EMTRA', 'H3KQ8'),
(17, 'neyirette.benavides@emtra.com.co', 'EMTRA', 'W9PL2'),
(18, 'andrea.beltran@emtra.com.co', 'EMTRA', 'M6TX5'),
(19, 'contador@emtra.com.co', 'EMTRA', 'P4VQ7'),
(20, 'helen.arguello@emtra.com.co', 'EMTRA', 'S2KJ9'),
(21, 'contabilidad@emtra.com.co', 'EMTRA', 'L8DQP'),
(22, 'cesar.ortega@emtra.com.co', 'EMTRA', 'Q7WZ3'),
(23, 'arley.rincon@emtra.com.co', 'EMTRA', 'Z6NP4'),
(24, 'gestionhumana@inprosalud.co', 'INPROSALUD', 'K9TQ1'),
(25, 'contador@inprosalud.co', 'INPROSALUD', 'F3XZ8'),
(26, 'xiomara.jimenez@inprosalud.co', 'INPROSALUD', 'J5LP2'),
(27, 'paola.castiblanco@inprosalud.co', 'INPROSALUD', 'R8QZ7'),
(29, 'paul.barros@simadrid.com.co', 'SIMADRID', 'G7KQ2'),
(30, 'ivonne.martinez@simadrid.com.co', 'SIMADRID', 'M5RZ8'),
(31, 'contador@simadrid.com.co', 'SIMADRID', 'Q9LP3'),
(32, 'laura.bulla@simadrid.com.co', 'SIMADRID', 'Z6TW1'),
(33, 'monica.tusso@simadrid.com.co', 'SIMADRID', 'P3FV7'),
(34, 'sebastian.velasquez@emtrasur.com.co', 'EMTRASUR', 'H8QN2'),
(35, 'yuri.ripe@emtrasur.com.co', 'EMTRASUR', 'L5ZQ9'),
(37, 'ana.echavarria@emtrasur.com.co', 'EMTRASUR', 'X2KQ8'),
(38, 'lina.ortiz@emtrasur.com.co', 'EMTRASUR', 'V9TL3'),
(39, 'karol.palacio@emtrasur.com.co', 'EMTRASUR', 'W4PQ7'),
(40, 'sandra.montoya@emtrasur.com.co', 'EMTRASUR', 'J6ZX1'),
(41, 'loyda.fajardo@incorporando.com.co', 'INCORPORANDO', 'N7KQ5'),
(42, 'giselle.juyo@incorporando.com.co', 'INCORPORANDO', 'R2MP8'),
(43, 'rulexor.monasterios@solucionescorp.com.co', 'multiple', 'RUL25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `requisicion`
--

CREATE TABLE `requisicion` (
  `requisicion_id` int(100) NOT NULL,
  `consecutivo` varchar(100) NOT NULL,
  `empresa` varchar(100) NOT NULL,
  `fecha_solicitud` datetime NOT NULL,
  `nombre_solicitante` text NOT NULL,
  `proceso` varchar(100) NOT NULL,
  `justificacion` text NOT NULL,
  `descripcion` text NOT NULL,
  `cantidad` int(100) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `intentos_revision` int(11) NOT NULL,
  `comentario_respuesta` varchar(100) DEFAULT NULL,
  `comentario_rechazo` varchar(100) NOT NULL,
  `fecha_ultimo_rechazo` datetime DEFAULT NULL,
  `pdf` longblob NOT NULL,
  `coordinador_id` int(11) DEFAULT NULL,
  `fecha_ultimo_modificacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `requisicion_archivos`
--

CREATE TABLE `requisicion_archivos` (
  `archivo_id` int(11) NOT NULL,
  `requisicion_id` int(11) NOT NULL,
  `nombre_archivo` varchar(255) NOT NULL,
  `ruta_archivo` longblob NOT NULL,
  `fecha_subida` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_mime` varchar(100) NOT NULL,
  `tamano` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `requisicion_historial`
--

CREATE TABLE `requisicion_historial` (
  `id` int(11) NOT NULL,
  `requisicion_id` int(11) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `comentario` text DEFAULT NULL,
  `usuario` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `requisicion_historial`
--

INSERT INTO `requisicion_historial` (`id`, `requisicion_id`, `estado`, `comentario`, `usuario`, `creado_en`) VALUES
(1, 1, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 15:59:51'),
(2, 2, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 16:55:15'),
(3, 3, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:02:59'),
(4, 4, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:08:26'),
(5, 5, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:20:23'),
(6, 6, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:22:28'),
(7, 7, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:30:36'),
(8, 8, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:34:45'),
(9, 9, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:35:08'),
(10, 10, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:43:46'),
(11, 11, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 17:45:03'),
(12, 12, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 18:08:31'),
(13, 13, 'pendiente', 'Requisición creada', 'ingrith.supelano@transitoxpress.co', '2025-10-07 18:38:50'),
(14, 14, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 13:39:27'),
(15, 14, 'correccion', 'qm', NULL, '2025-10-10 13:40:22'),
(16, 14, 'pendiente', '', NULL, '2025-10-10 13:50:26'),
(17, 15, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 14:33:14'),
(18, 15, 'correccion', 'no', NULL, '2025-10-10 14:42:31'),
(19, 15, 'pendiente', '', NULL, '2025-10-10 14:50:17'),
(20, 15, 'correccion', 'a', NULL, '2025-10-10 14:52:03'),
(21, 15, 'pendiente', '', NULL, '2025-10-10 14:52:33'),
(22, 16, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 17:31:06'),
(23, 17, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 18:14:36'),
(24, 18, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 18:18:57'),
(25, 19, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 18:23:06'),
(26, 20, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 18:30:46'),
(27, 21, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 18:33:27'),
(28, 22, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 18:34:13'),
(29, 23, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 19:40:28'),
(30, 23, 'correccion', 'no cumple', NULL, '2025-10-10 21:15:10'),
(31, 23, 'pendiente', 'Requisición actualizada', NULL, '2025-10-10 21:16:45'),
(32, 23, 'correccion', 'dddd', NULL, '2025-10-10 21:18:23'),
(33, 24, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-10 21:24:45'),
(34, 24, 'correccion', 'bla', NULL, '2025-10-10 21:25:41'),
(35, 24, 'correccion', 'sss', NULL, '2025-10-10 21:33:27'),
(36, 24, 'correccion', 'aaa', NULL, '2025-10-10 21:35:07'),
(37, 24, 'correccion', 'xxx', NULL, '2025-10-10 21:53:29'),
(38, 15, 'correccion', 's', NULL, '2025-10-10 21:55:11'),
(39, 24, 'correccion', 'vvv', NULL, '2025-10-10 21:57:27'),
(40, 24, 'pendiente', 'Requisición actualizada', NULL, '2025-10-11 14:21:24'),
(41, 24, 'pendiente', 'Requisición actualizada', NULL, '2025-10-11 14:32:17'),
(42, 15, 'pendiente', 'Requisición actualizada', NULL, '2025-10-11 14:32:48'),
(43, 24, 'correccion', 'no cumple', NULL, '2025-10-11 16:41:11'),
(44, 24, 'pendiente', 'Requisición actualizada', NULL, '2025-10-11 16:41:52'),
(45, 25, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 13:36:30'),
(46, 25, 'correccion', 'fff', NULL, '2025-10-14 13:39:55'),
(47, 25, 'pendiente', 'Requisición actualizada', NULL, '2025-10-14 13:40:37'),
(48, 25, 'correccion', 'corregir', NULL, '2025-10-14 14:21:03'),
(49, 25, 'pendiente', 'Requisición actualizada', NULL, '2025-10-14 16:12:20'),
(50, 26, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 16:48:46'),
(51, 27, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 16:50:38'),
(52, 28, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 16:59:31'),
(53, 29, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 17:03:11'),
(54, 30, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 17:12:04'),
(55, 31, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 17:16:31'),
(56, 32, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 17:32:10'),
(57, 32, 'correccion', 'dd', NULL, '2025-10-14 17:52:16'),
(58, 32, 'pendiente', 'Requisición actualizada', NULL, '2025-10-14 17:52:35'),
(59, 33, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 21:22:54'),
(60, 34, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 21:24:24'),
(61, 35, 'pendiente', 'Requisición creada', 'rulexor.monasterios@solucionescorp.com.co', '2025-10-14 21:32:56');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `administrador`
--
ALTER TABLE `administrador`
  ADD PRIMARY KEY (`administrador_id`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`usuario_id`);

--
-- Indices de la tabla `coordinador`
--
ALTER TABLE `coordinador`
  ADD PRIMARY KEY (`coordinador_id`);

--
-- Indices de la tabla `requisicion`
--
ALTER TABLE `requisicion`
  ADD PRIMARY KEY (`requisicion_id`),
  ADD KEY `fk_requisicion_coordinador` (`coordinador_id`);

--
-- Indices de la tabla `requisicion_archivos`
--
ALTER TABLE `requisicion_archivos`
  ADD PRIMARY KEY (`archivo_id`),
  ADD KEY `requisicion_id` (`requisicion_id`);

--
-- Indices de la tabla `requisicion_historial`
--
ALTER TABLE `requisicion_historial`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_historial_requisicion_id` (`requisicion_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `administrador`
--
ALTER TABLE `administrador`
  MODIFY `administrador_id` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `usuario_id` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `coordinador`
--
ALTER TABLE `coordinador`
  MODIFY `coordinador_id` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT de la tabla `requisicion`
--
ALTER TABLE `requisicion`
  MODIFY `requisicion_id` int(100) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de la tabla `requisicion_archivos`
--
ALTER TABLE `requisicion_archivos`
  MODIFY `archivo_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT de la tabla `requisicion_historial`
--
ALTER TABLE `requisicion_historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `requisicion`
--
ALTER TABLE `requisicion`
  ADD CONSTRAINT `fk_requisicion_coordinador` FOREIGN KEY (`coordinador_id`) REFERENCES `coordinador` (`coordinador_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `requisicion_archivos`
--
ALTER TABLE `requisicion_archivos`
  ADD CONSTRAINT `requisicion_archivos_ibfk_1` FOREIGN KEY (`requisicion_id`) REFERENCES `requisicion` (`requisicion_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
