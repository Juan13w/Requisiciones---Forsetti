import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import {
  processSignatureImage,
  parseDataUri,
  isAllowedSignatureMime,
  MAX_SIGNATURE_UPLOAD_BYTES,
} from '@/lib/signatureProcessor';

// GET /api/coordinador/perfil — Perfil de firma del coordinador logueado
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'coordinador') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const rows = await query<any[]>(
    `SELECT nombre, cargo, firma_url FROM coordinador WHERE coordinador_id = ?`,
    [session.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ perfil: rows[0] });
}

// PUT /api/coordinador/perfil — Configura nombre, cargo y firma del coordinador.
// La firma se guarda ya procesada (WebP lossless, fondo removido) para que se pueda
// reutilizar automáticamente al confirmar recepción de una acta.
export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.rol !== 'coordinador') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, cargo, firmaBase64, firmaOrigen } = body;

  if (!nombre?.trim() || !cargo?.trim()) {
    return NextResponse.json({ error: 'Nombre y cargo son requeridos' }, { status: 400 });
  }

  let firma_url: string | undefined;

  if (firmaBase64) {
    let mime: string;
    let buffer: Buffer;
    try {
      ({ mime, buffer } = parseDataUri(firmaBase64));
    } catch {
      return NextResponse.json({ error: 'Formato de firma inválido' }, { status: 400 });
    }

    if (!isAllowedSignatureMime(mime)) {
      return NextResponse.json(
        { error: 'Formato de imagen no soportado. Usa PNG, JPG o WebP.' },
        { status: 400 }
      );
    }
    if (buffer.byteLength > MAX_SIGNATURE_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'La imagen de la firma es demasiado grande (máx. 5 MB).' }, { status: 400 });
    }

    let procesada: Buffer;
    try {
      procesada = await processSignatureImage(buffer, {
        skipBackgroundRemoval: firmaOrigen === 'dibujo',
      });
    } catch (err) {
      return NextResponse.json({ error: 'No se pudo procesar la imagen de la firma', detail: String(err) }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'firmas', 'coordinador');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `coordinador_${session.id}.webp`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, procesada);
    firma_url = `/uploads/firmas/coordinador/${fileName}`;
  }

  if (firma_url) {
    await query(
      `UPDATE coordinador SET nombre = ?, cargo = ?, firma_url = ? WHERE coordinador_id = ?`,
      [nombre.trim(), cargo.trim(), firma_url, session.id]
    );
  } else {
    await query(
      `UPDATE coordinador SET nombre = ?, cargo = ? WHERE coordinador_id = ?`,
      [nombre.trim(), cargo.trim(), session.id]
    );
  }

  return NextResponse.json({ success: true, firma_url: firma_url ?? null });
}
