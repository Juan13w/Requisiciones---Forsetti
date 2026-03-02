import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Ejecutar todas las consultas en paralelo para mejor rendimiento
    const [
      hoyResult,
      pendientesResult,
      completadasResult,
      totalRequisicionesResult,
      usuariosResult,
    ] = await Promise.all([
      // Requisiciones de hoy
      query(`
        SELECT COUNT(*) as count 
        FROM requisicion 
        WHERE DATE(fecha_solicitud) = CURDATE()
      `),
      
      // Requisiciones pendientes
      query(`
        SELECT COUNT(*) as count 
        FROM requisicion 
        WHERE estado = 'pendiente'
      `),
      
      // Requisiciones aprobadas (usadas como "completadas")
      query(`
        SELECT COUNT(*) as count 
        FROM requisicion 
        WHERE estado = 'aprobada'
      `),

      // Total de requisiciones
      query(`
        SELECT COUNT(*) as count 
        FROM requisicion
      `),
      
      // Usuarios activos (coordinadores + personal de compras)
      query(`
        SELECT 
          (SELECT COUNT(*) FROM coordinador) as coordinadores,
          (SELECT COUNT(*) FROM compras) as compradores
      `),
    ]);

    // Procesar resultados
    const hoy = hoyResult[0]?.count || 0;
    const pendientes = pendientesResult[0]?.count || 0;
    const completadas = completadasResult[0]?.count || 0;
    const totalRequisiciones = totalRequisicionesResult[0]?.count || 0;

    const totalUsuarios = 
      (usuariosResult[0]?.coordinadores || 0) + 
      (usuariosResult[0]?.compradores || 0);

    // Mantener compatibilidad con posibles consumidores anteriores
    // y además exponer los campos que espera el dashboard de admin
    return NextResponse.json({
      // Campos originales
      hoy,
      pendientes,
      completadas,
      totalUsuarios,

      // Campos esperados por el dashboard de administración
      hoyRequisiciones: hoy,
      totalRequisiciones,
      completadasRequisiciones: completadas,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard de administración:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}