-- Script para configurar al usuario dexiomara.jimenez@inprosalud.co exactamente como rulexor.monasterios@solucionescorp.com.co
-- Ejecutar este script en tu base de datos MySQL

-- Actualizar el usuario para que tenga empresa='multiple' (igual que rulexor)
UPDATE coordinador 
SET empresa = 'multiple' 
WHERE correo = 'dexiomara.jimenez@inprosalud.co';

-- Si el usuario no existe, insertarlo con la misma configuración que rulexor
INSERT IGNORE INTO coordinador (correo, empresa, clave) 
VALUES ('dexiomara.jimenez@inprosalud.co', 'multiple', 'DEX2025');

-- Verificar el cambio
SELECT coordinador_id, correo, empresa, clave 
FROM coordinador 
WHERE correo = 'dexiomara.jimenez@inprosalud.co';
