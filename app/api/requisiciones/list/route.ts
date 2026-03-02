import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        requisicion_id,
        consecutivo,
        empresa,
        fecha_solicitud,
        proceso,
        descripcion,
        justificacion,
        cantidad,
        estado,
        comentario_rechazo,
        NULL as img
      FROM requisicion
      ORDER BY fecha_solicitud DESC
    `);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener las solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al obtener las solicitudes' },
      { status: 500 }
    );
  }
}