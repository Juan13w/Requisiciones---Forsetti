-- Habilita eliminación en cascada al borrar una requisición.
-- Cadena resultante:
--   requisicion → actas → acta_items
--   requisicion → requisicion_archivos  (ya tenía CASCADE)
--   requisicion → requisicion_historial (se agrega aquí)
--
-- Ejecutar una sola vez.

-- 1. actas: reemplazar FK sin CASCADE por una con CASCADE
ALTER TABLE actas
  DROP FOREIGN KEY actas_ibfk_1,
  ADD CONSTRAINT actas_ibfk_1
    FOREIGN KEY (requisicion_id)
    REFERENCES requisicion(requisicion_id)
    ON DELETE CASCADE;

-- 2. requisicion_historial: no tenía FK (solo índice), se agrega con CASCADE
ALTER TABLE requisicion_historial
  ADD CONSTRAINT fk_historial_requisicion
    FOREIGN KEY (requisicion_id)
    REFERENCES requisicion(requisicion_id)
    ON DELETE CASCADE;
