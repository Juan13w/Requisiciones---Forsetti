import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const archivoId = params.id;

    const [rows]: any[] = await pool.query(
      'SELECT nombre_archivo, ruta_archivo, tipo_mime FROM requisicion_archivos WHERE archivo_id = ?',
      [archivoId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const archivo = rows[0];

    console.log('📂 ruta_archivo:', archivo.ruta_archivo);
    console.log('📂 Tipo:', typeof archivo.ruta_archivo);

    let buffer: Buffer;

    if (Buffer.isBuffer(archivo.ruta_archivo)) {
      buffer = archivo.ruta_archivo;
    } else if (typeof archivo.ruta_archivo === 'string') {
      // ✅ Convierte el texto en binario
      buffer = Buffer.from(archivo.ruta_archivo, 'binary');
    } else if (archivo.ruta_archivo?.data) {
      buffer = Buffer.from(archivo.ruta_archivo.data);
    } else {
      console.error('Formato inesperado en ruta_archivo:', archivo.ruta_archivo);
      return NextResponse.json(
        { error: 'Archivo corrupto o ilegible' },
        { status: 500 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': archivo.tipo_mime || 'application/pdf',
        'Content-Disposition': `inline; filename="${archivo.nombre_archivo}"`
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener archivo PDF:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
