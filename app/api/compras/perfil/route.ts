import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'compras') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const rows = await query<any[]>(
    `SELECT nombre, cargo, firma_url FROM compras WHERE usuario_id = ?`,
    [session.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ perfil: rows[0] });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'compras') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, cargo, firmaBase64 } = body;

  if (!nombre?.trim() || !cargo?.trim()) {
    return NextResponse.json({ error: 'Nombre y cargo son requeridos' }, { status: 400 });
  }

  let firma_url: string | undefined;

  if (firmaBase64) {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'firmas', 'compras');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `compras_${session.id}.png`;
    const filePath = path.join(uploadsDir, fileName);
    const base64Data = firmaBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    firma_url = `/uploads/firmas/compras/${fileName}`;
  }

  if (firma_url) {
    await query(
      `UPDATE compras SET nombre = ?, cargo = ?, firma_url = ? WHERE usuario_id = ?`,
      [nombre.trim(), cargo.trim(), firma_url, session.id]
    );
  } else {
    await query(
      `UPDATE compras SET nombre = ?, cargo = ? WHERE usuario_id = ?`,
      [nombre.trim(), cargo.trim(), session.id]
    );
  }

  return NextResponse.json({ success: true, firma_url: firma_url ?? null });
}
