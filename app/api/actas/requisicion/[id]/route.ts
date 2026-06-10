import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// GET /api/actas/requisicion/[id] — Obtiene el acta asociada a una requisición (cualquier rol autenticado)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const actas = await query<any[]>(
    `SELECT id, estado, pdf_url, fecha_entrega, ciudad, observaciones,
            recibido_por_nombre, recibido_por_cargo, fecha_recibido
     FROM actas WHERE requisicion_id = ?`,
    [id]
  );

  if (actas.length === 0) {
    return NextResponse.json({ acta: null });
  }

  return NextResponse.json({ acta: actas[0] });
}
