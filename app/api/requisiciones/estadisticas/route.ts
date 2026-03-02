import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function GET(req: NextRequest) {
  try {
    logger.debug('Obteniendo estadísticas de dashboard...');
    
    // Verificar si la tabla de usuarios existe
    const checkUsuariosQuery = `SHOW TABLES LIKE 'usuarios'`;
    const checkRequisicionQuery = `SHOW TABLES LIKE 'requisicion'`;
    
    const [usuariosTable, requisicionTable] = await Promise.all([
      query(checkUsuariosQuery),
      query(checkRequisicionQuery)
    ]);
    
    if (!usuariosTable || !requisicionTable) {
      logger.error('Tablas no encontradas', {
        usuarios: !!usuariosTable,
        requisicion: !!requisicionTable
      });
      return NextResponse.json(
        { error: 'Tablas de base de datos no encontradas' },
        { status: 500 }
      );
    }

    try {
      // Verificar el nombre correcto de la tabla de usuarios
      const checkUserTableQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name IN ('usuarios', 'users', 'usuario', 'user')
        LIMIT 1`;
      
      const [tableResult] = await query(checkUserTableQuery);
      const userTableName = tableResult?.table_name || 'usuarios';
      
      logger.debug('Usando tabla de usuarios', { userTableName });
      
      // Obtener total de usuarios únicos de las tablas compras y coordinador
      let totalUsuarios = 0;
      try {
        const countUsersQuery = `
          SELECT COUNT(DISTINCT correo) as total
          FROM (
            SELECT correo FROM compras WHERE correo IS NOT NULL AND correo != ''
            UNION 
            SELECT correo FROM coordinador WHERE correo IS NOT NULL AND correo != ''
          ) as usuarios`;
        
        const [userCount] = await query(countUsersQuery);
        totalUsuarios = userCount?.total || 0;
        logger.debug('Total de usuarios únicos', { totalUsuarios });
      } catch (error) {
        logger.error('Error al contar usuarios', error);
        totalUsuarios = 0;
      }
      
      // Obtener requisiciones de hoy
      const hoyQuery = `
        SELECT COUNT(*) as total
        FROM requisicion
        WHERE DATE(fecha_solicitud) = CURDATE()`;
      
      // Obtener total de requisiciones
      const totalRequisicionesQuery = `
        SELECT COUNT(*) as total
        FROM requisicion`;
      
      // Obtener requisiciones completadas (aprobadas)
      const completadasQuery = `
        SELECT COUNT(*) as total
        FROM requisicion
        WHERE estado = 'aprobada'`;

      // Ejecutar consultas restantes en paralelo
      logger.debug('Ejecutando consultas restantes...');
      const [
        hoyResult,
        totalRequisicionesResult,
        completadasResult
      ] = await Promise.all([
        query(hoyQuery).catch(e => {
          logger.error('Error en consulta hoy', e);
          return [];
        }),
        query(totalRequisicionesQuery).catch(e => {
          logger.error('Error en consulta totalRequisiciones', e);
          return [];
        }),
        query(completadasQuery).catch(e => {
          logger.error('Error en consulta completadas', e);
          return [];
        })
      ]);

      logger.debug('Resultados de consultas', {
        totalUsuarios,
        hoyResult,
        totalRequisicionesResult,
        completadasResult,
      });

    // Procesar resultados
    const hoy = Array.isArray(hoyResult) ? 
      hoyResult[0]?.total || 0 : 
      (hoyResult as any)?.total || 0;

    const totalRequisiciones = Array.isArray(totalRequisicionesResult) ? 
      totalRequisicionesResult[0]?.total || 0 : 
      (totalRequisicionesResult as any)?.total || 0;

    const completadas = Array.isArray(completadasResult) ? 
      completadasResult[0]?.total || 0 : 
      (completadasResult as any)?.total || 0;
    
      const searchParams = req.nextUrl.searchParams;
      const yearParam = searchParams.get('year');
      const year = yearParam === '2025' || yearParam === '2026' ? Number(yearParam) : 2025;

      // Obtener estadísticas por estado
      const porEstadoQuery = `
        SELECT 
          estado,
          COUNT(*) as cantidad,
          ROUND((COUNT(*) * 100.0) / (SELECT COUNT(*) FROM requisicion WHERE YEAR(fecha_solicitud) = ${year}), 2) as porcentaje
        FROM requisicion
        WHERE YEAR(fecha_solicitud) = ${year}
        GROUP BY estado
        ORDER BY cantidad DESC`;

      // Obtener estadísticas por proceso
      const porProcesoQuery = `
        SELECT 
          proceso,
          COUNT(*) as cantidad,
          ROUND((COUNT(*) * 100.0) / (SELECT COUNT(*) FROM requisicion WHERE YEAR(fecha_solicitud) = ${year}), 2) as porcentaje
        FROM requisicion
        WHERE YEAR(fecha_solicitud) = ${year}
        GROUP BY proceso
        ORDER BY cantidad DESC`;

      // CORREGIDO: Obtener estadísticas por mes usando DATE_FORMAT directamente
      const porDiaQuery = `
        WITH RECURSIVE meses_del_anio AS (
          SELECT 1 as mes
          UNION ALL
          SELECT mes + 1 FROM meses_del_anio WHERE mes < 12
        ),
        meses_con_datos AS (
          SELECT 
            YEAR(fecha_solicitud) as anio,
            MONTH(fecha_solicitud) as mes_numero,
            DATE_FORMAT(fecha_solicitud, '%M %Y') as mes_anio,
            SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
            SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas,
            SUM(CASE WHEN estado = 'pendiente' OR estado = 'pendiente de aprobación' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'en_gestion' THEN 1 ELSE 0 END) as en_gestion,
            SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as cerradas,
            COUNT(*) as total
          FROM requisicion
          WHERE YEAR(fecha_solicitud) = ${year}
          GROUP BY YEAR(fecha_solicitud), MONTH(fecha_solicitud)
        )
        SELECT 
          CONCAT('${year}-', LPAD(m.mes, 2, '0'), '-01') as fecha,
          DATE_FORMAT(
            CONCAT('${year}-', LPAD(m.mes, 2, '0'), '-01'),
            '%M %Y'
          ) as mes_anio,
          COALESCE(d.aprobadas, 0) as aprobadas,
          COALESCE(d.rechazadas, 0) as rechazadas,
          COALESCE(d.pendientes, 0) as pendientes,
          COALESCE(d.en_gestion, 0) as en_gestion,
          COALESCE(d.cerradas, 0) as completadas,
          COALESCE(d.total, 0) as total
        FROM meses_del_anio m
        LEFT JOIN meses_con_datos d ON m.mes = d.mes_numero AND d.anio = ${year}
        WHERE m.mes >= 1 AND m.mes <= 12
        ORDER BY m.mes ASC`;

      // Ejecutar consultas de gráficos
      const [porEstado, porProceso, porDia] = await Promise.all([
        query(porEstadoQuery).catch(e => {
          logger.error('Error en consulta porEstado', e);
          return [];
        }),
        query(porProcesoQuery).catch(e => {
          logger.error('Error en consulta porProceso', e);
          return [];
        }),
        query(porDiaQuery).catch(e => {
          logger.error('Error en consulta porDia', e);
          return [];
        })
      ]);

      logger.debug('Datos por día', porDia);

      // Formatear respuesta
      const responseData = {
        data: {
          porEstado: Array.isArray(porEstado) ? porEstado : [],
          porProceso: Array.isArray(porProceso) ? porProceso : [],
          porDia: Array.isArray(porDia) ? porDia : []
        }
      };

      logger.debug('Estadísticas del dashboard', responseData);
      return NextResponse.json(responseData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      logger.error('Error en consultas SQL', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error en consultas SQL',
          details: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Error general al obtener estadísticas', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener estadísticas',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}