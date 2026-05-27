import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface HistEntry {
  id: number;
  requisicion_id: number;
  estado: string;
  comentario: string | null;
  usuario: string | null;
  creado_en: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requisicionId = parseInt(id, 10);
  if (isNaN(requisicionId) || requisicionId <= 0) {
    return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
  }

  try {
    // Intenta leer desde la tabla de historial
    const rows = await query<HistEntry[]>(
      'SELECT * FROM requisicion_historial WHERE requisicion_id = ? ORDER BY creado_en ASC',
      [requisicionId]
    );

    // Si no hay historial, construye uno básico desde la requisición principal
    if (!rows || rows.length === 0) {
      const res = await query<any[]>(
        'SELECT requisicion_id, estado, comentario_rechazo, fecha_ultimo_modificacion FROM requisicion WHERE requisicion_id = ?',
        [requisicionId]
      );
      if (res.length === 0) {
        return NextResponse.json({ success: false, error: 'Requisición no encontrada' }, { status: 404 });
      }

      const fallback: HistEntry[] = [
        {
          id: 0,
          requisicion_id: requisicionId,
          estado: res[0].estado || 'pendiente',
          comentario: res[0].comentario_rechazo || null,
          usuario: null,
          creado_en: res[0].fecha_ultimo_modificacion || new Date().toISOString(),
        },
      ];
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
