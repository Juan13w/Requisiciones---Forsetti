-- Script para verificar el correo exacto de la usuaria
-- Ejecutar este script para encontrar el correo correcto

-- Buscar usuarios con nombres similares a xiomara o dexiomara
SELECT 'USUARIOS CON NOMBRE SIMILAR A XIOMARA:' as info;
SELECT coordinador_id, correo, empresa, clave 
FROM coordinador 
WHERE correo LIKE '%xiomara%' OR correo LIKE '%dexiomara%';

-- Buscar todos los usuarios que tengan empresa='multiple'
SELECT 'USUARIOS CON EMPRESA= MULTIPLE:' as info;
SELECT coordinador_id, correo, empresa, clave 
FROM coordinador 
WHERE empresa = 'multiple';

-- Verificar todas las empresas que existen (para confirmar mayúsculas)
SELECT 'TODAS LAS EMPRESAS EXISTENTES:' as info;
SELECT DISTINCT empresa 
FROM coordinador 
WHERE empresa IS NOT NULL AND empresa != ''
ORDER BY empresa;
