import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// GET /api/actas/[id] — Obtiene el acta completa con su formato, empresa e ítems
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

  const actas = await query<any[]>(
    `SELECT a.*,
            f.codigo, f.version, f.vigencia, f.controlado,
            e.nombre AS empresa_nombre, e.logo_url, e.ciudad_default,
            c.nombre AS entregado_por_nombre, c.cargo AS entregado_por_cargo_perfil
     FROM actas a
     JOIN formato_acta f ON f.id = a.formato_acta_id
     LEFT JOIN empresas e ON e.id = a.empresa_id
     LEFT JOIN compras c ON c.usuario_id = a.entregado_por_user_id
     WHERE a.id = ?`,
    [actaId]
  );
  if (actas.length === 0) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

  const items = await query<any[]>(
    `SELECT id, codigo_articulo, descripcion, cantidad, orden
     FROM acta_items WHERE acta_id = ? ORDER BY orden`,
    [actaId]
  );

  return NextResponse.json({ success: true, data: { ...actas[0], items } });
}

// PUT /api/actas/[id] — Actualiza empresa, ciudad, observaciones (solo en borrador)
export async function PUT(
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

  const actas = await query<any[]>(`SELECT estado FROM actas WHERE id = ?`, [actaId]);
  if (actas.length === 0) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
  if (actas[0].estado !== 'borrador') {
    return NextResponse.json({ error: 'Solo se puede editar un acta en borrador' }, { status: 409 });
  }

  const body = await request.json();
  const campos: string[] = [];
  const valores: any[] = [];

  if (body.empresa_id !== undefined) { campos.push('empresa_id = ?'); valores.push(body.empresa_id); }
  if (body.ciudad !== undefined)     { campos.push('ciudad = ?');     valores.push(body.ciudad); }
  if (body.observaciones !== undefined) { campos.push('observaciones = ?'); valores.push(body.observaciones); }

  if (campos.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  valores.push(actaId);
  await query(`UPDATE actas SET ${campos.join(', ')} WHERE id = ?`, valores);

  return NextResponse.json({ success: true });
}
