ALTER TABLE requisicion
  ADD COLUMN rechazado_por VARCHAR(100) NULL AFTER aprobado_por;
