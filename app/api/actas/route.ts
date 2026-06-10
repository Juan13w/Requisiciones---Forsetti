import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

// POST /api/actas — Crea un acta en borrador pre-cargada desde la requisición
export async function POST(request: NextRequest) {
  try {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'compras') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { requisicion_id } = await request.json();
  if (!requisicion_id) {
    return NextResponse.json({ error: 'requisicion_id requerido' }, { status: 400 });
  }

  // Verificar que la requisición exista y no tenga acta ya
  const [req] = await query<any[]>(
    `SELECT requisicion_id, consecutivo, empresa, proceso, coordinador_id
     FROM requisicion WHERE requisicion_id = ?`,
    [requisicion_id]
  );
  if (!req) {
    return NextResponse.json({ error: 'Requisición no encontrada' }, { status: 404 });
  }

  const existente = await query<any[]>(
    `SELECT id FROM actas WHERE requisicion_id = ?`,
    [requisicion_id]
  );
  if (existente.length > 0) {
    return NextResponse.json({ success: true, acta_id: existente[0].id, existing: true }, { status: 200 });
  }

  // Tomar el formato activo
  const formatos = await query<any[]>(
    `SELECT id FROM formato_acta WHERE activo = 1 LIMIT 1`
  );
  if (formatos.length === 0) {
    return NextResponse.json({ error: 'No hay formato activo configurado' }, { status: 500 });
  }
  const formato_acta_id = formatos[0].id;

  // Resolver empresa por nombre (coincide con requisicion.empresa)
  const empresaRows = await query<any[]>(
    `SELECT id, ciudad_default FROM empresas WHERE nombre = ? AND activo = 1 LIMIT 1`,
    [req.empresa]
  );
  const empresa_id   = empresaRows[0]?.id ?? null;
  const ciudad       = empresaRows[0]?.ciudad_default ?? '';

  // Datos del usuario compras
  const comprasRows = await query<any[]>(
    `SELECT usuario_id, nombre, cargo, firma_url FROM compras WHERE usuario_id = ?`,
    [session.id]
  );
  const compras = comprasRows[0] ?? {};

  const firma_token = uuidv4();
  const fecha_hoy = new Date().toISOString().split('T')[0];

  let acta_id: number;
  try {
    const result = await query<any>(
      `INSERT INTO actas
         (consecutivo, requisicion_id, formato_acta_id, empresa_id,
          fecha_entrega, ciudad, cliente,
          entregado_por_user_id, entregado_por_cargo, firma_entregado_url,
          recibido_por_user_id, firma_token, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador')`,
      [
        req.consecutivo,
        requisicion_id,
        formato_acta_id,
        empresa_id,
        fecha_hoy,
        ciudad,
        req.proceso,
        session.id,
        compras.cargo ?? '',
        compras.firma_url ?? null,
        req.coordinador_id ?? null,
        firma_token,
      ]
    );
    acta_id = result.insertId;
  } catch (insertErr: any) {
    // Race condition (e.g. React Strict Mode double-invoke): another concurrent
    // request already created the acta between our SELECT check and this INSERT.
    if (insertErr.code === 'ER_DUP_ENTRY') {
      const [existing] = await query<any[]>(
        `SELECT id FROM actas WHERE requisicion_id = ?`,
        [requisicion_id]
      );
      if (existing) {
        return NextResponse.json({ success: true, acta_id: existing.id, existing: true }, { status: 200 });
      }
    }
    throw insertErr;
  }

  // Pre-cargar un ítem desde la descripción de la requisición
  const [reqDetalle] = await query<any[]>(
    `SELECT descripcion, cantidad FROM requisicion WHERE requisicion_id = ?`,
    [requisicion_id]
  );
  if (reqDetalle) {
    await query(
      `INSERT INTO acta_items (acta_id, codigo_articulo, descripcion, cantidad, orden)
       VALUES (?, '', ?, ?, 1)`,
      [acta_id, reqDetalle.descripcion, reqDetalle.cantidad]
    );
  }

  return NextResponse.json({ success: true, acta_id }, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/actas]', e);
    return NextResponse.json({ error: e.message ?? 'Error interno' }, { status: 500 });
  }
}
