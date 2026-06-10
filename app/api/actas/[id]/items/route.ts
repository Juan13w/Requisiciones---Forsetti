import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

async function getActaEnBorrador(actaId: number) {
  const rows = await query<any[]>(`SELECT id, estado FROM actas WHERE id = ?`, [actaId]);
  if (rows.length === 0) return null;
  return rows[0];
}

// GET /api/actas/[id]/items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actaId = parseInt(id);
  if (isNaN(actaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const items = await query<any[]>(
    `SELECT id, codigo_articulo, descripcion, cantidad, orden
     FROM acta_items WHERE acta_id = ? ORDER BY orden`,
    [actaId]
  );

  return NextResponse.json({ success: true, data: items });
}

// POST /api/actas/[id]/items — Agrega un ítem
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actaId = parseInt(id);
  if (isNaN(actaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'compras') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const acta = await getActaEnBorrador(actaId);
  if (!acta) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
  if (acta.estado !== 'borrador') {
    return NextResponse.json({ error: 'Solo se pueden editar ítems en borrador' }, { status: 409 });
  }

  const { codigo_articulo = '', descripcion = '', cantidad } = await request.json();
  if (cantidad === undefined) {
    return NextResponse.json({ error: 'cantidad es requerida' }, { status: 400 });
  }

  const maxOrden = await query<any[]>(
    `SELECT COALESCE(MAX(orden), 0) AS max_orden FROM acta_items WHERE acta_id = ?`,
    [actaId]
  );
  const orden = (maxOrden[0]?.max_orden ?? 0) + 1;

  const result = await query<any>(
    `INSERT INTO acta_items (acta_id, codigo_articulo, descripcion, cantidad, orden)
     VALUES (?, ?, ?, ?, ?)`,
    [actaId, codigo_articulo, descripcion, cantidad, orden]
  );

  return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
}
