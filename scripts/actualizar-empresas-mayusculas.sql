-- Script para actualizar los nombres de las empresas a MAYÚSCULAS
-- Ejecutar este script en tu base de datos MySQL

-- Actualizar los nombres de las empresas a mayúsculas
UPDATE coordinador 
SET empresa = UPPER(empresa) 
WHERE empresa IN ('SERVISALUD', 'ACCESALUD', 'IMPROSALUDPLUS');

-- También actualizar las requisiciones existentes si hay alguna con estos nombres en minúscula
UPDATE requisicion 
SET empresa = UPPER(empresa) 
WHERE empresa IN ('servisalud', 'accesalud', 'improsaludplus');

-- Verificar los cambios (opcional)
SELECT coordinador_id, correo, empresa FROM coordinador WHERE empresa IN ('SERVISALUD', 'ACCESALUD', 'IMPROSALUDPLUS');
