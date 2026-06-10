import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// PUT /api/actas/[id]/items/[itemId] — Edita un ítem
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const actaId = parseInt(id);
  const iId = parseInt(itemId);
  if (isNaN(actaId) || isNaN(iId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'compras') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const actas = await query<any[]>(`SELECT estado FROM actas WHERE id = ?`, [actaId]);
  if (actas.length === 0) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
  if (actas[0].estado !== 'borrador') {
    return NextResponse.json({ error: 'Solo se pueden editar ítems en borrador' }, { status: 409 });
  }

  const body = await request.json();
  const campos: string[] = [];
  const valores: any[] = [];

  if (body.codigo_articulo !== undefined) { campos.push('codigo_articulo = ?'); valores.push(body.codigo_articulo); }
  if (body.descripcion !== undefined)     { campos.push('descripcion = ?');     valores.push(body.descripcion); }
  if (body.cantidad !== undefined)        { campos.push('cantidad = ?');        valores.push(body.cantidad); }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  valores.push(iId, actaId);
  const result = await query<any>(
    `UPDATE acta_items SET ${campos.join(', ')} WHERE id = ? AND acta_id = ?`,
    valores
  );

  if (result.affectedRows === 0) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}

// DELETE /api/actas/[id]/items/[itemId] — Elimina un ítem
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const actaId = parseInt(id);
  const iId = parseInt(itemId);
  if (isNaN(actaId) || isNaN(iId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'compras') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const actas = await query<any[]>(`SELECT estado FROM actas WHERE id = ?`, [actaId]);
  if (actas.length === 0) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
  if (actas[0].estado !== 'borrador') {
    return NextResponse.json({ error: 'Solo se pueden editar ítems en borrador' }, { status: 409 });
  }

  const result = await query<any>(
    `DELETE FROM acta_items WHERE id = ? AND acta_id = ?`,
    [iId, actaId]
  );

  if (result.affectedRows === 0) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
