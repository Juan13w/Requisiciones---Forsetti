-- Script para verificar la configuración actual
-- Ejecutar este script para diagnosticar el problema

-- 1. Verificar si las nuevas empresas existen en la tabla coordinador
SELECT 'NUEVAS EMPRESAS EN COORDINADOR:' as info;
SELECT coordinador_id, correo, empresa, clave 
FROM coordinador 
WHERE empresa IN ('SERVISALUD', 'ACCESALUD', 'IMPROSALUDPLUS');

-- 2. Verificar la configuración del usuario dexiomara
SELECT 'CONFIGURACIÓN USUARIO DEXIOMARA:' as info;
SELECT coordinador_id, correo, empresa, clave 
FROM coordinador 
WHERE correo = 'dexiomara.jimenez@inprosalud.co';

-- 3. Verificar la configuración del usuario rulexor (para comparar)
SELECT 'CONFIGURACIÓN USUARIO RULEXOR:' as info;
SELECT coordinador_id, correo, empresa, clave 
FROM coordinador 
WHERE correo = 'rulexor.monasterios@solucionescorp.com.co';

-- 4. Verificar todas las empresas disponibles
SELECT 'TODAS LAS EMPRESAS DISPONIBLES:' as info;
SELECT DISTINCT empresa 
FROM coordinador 
WHERE empresa IS NOT NULL AND empresa != ''
ORDER BY empresa;
