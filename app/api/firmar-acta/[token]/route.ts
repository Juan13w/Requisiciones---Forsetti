import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { query } from '@/lib/db';
import { generarPdfActa, ActaData } from '@/services/pdfActaService';
import { enviarConfirmacionRecibo } from '@/services/emailService';

// GET /api/firmar-acta/[token] — Devuelve los datos del acta para mostrar en la página de firma
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const actas = await query<any[]>(
    `SELECT a.id, a.consecutivo, a.cliente, a.fecha_entrega, a.ciudad,
            a.observaciones, a.estado, a.firma_token,
            f.codigo, f.version, f.vigencia, f.controlado,
            e.logo_url, e.ciudad_default,
            c.nombre AS entregado_por_nombre, c.cargo AS entregado_por_cargo,
            c.firma_url AS firma_entregado_url
     FROM actas a
     JOIN formato_acta f ON f.id = a.formato_acta_id
     LEFT JOIN empresas e ON e.id = a.empresa_id
     LEFT JOIN compras c ON c.usuario_id = a.entregado_por_user_id
     WHERE a.firma_token = ?`,
    [token]
  );

  if (actas.length === 0) {
    return NextResponse.json({ error: 'Link inválido o ya utilizado' }, { status: 404 });
  }

  const acta = actas[0];
  if (acta.estado === 'recibida') {
    return NextResponse.json({ error: 'Este acta ya fue firmada' }, { status: 410 });
  }
  if (!['generada', 'enviada'].includes(acta.estado)) {
    return NextResponse.json({ error: 'El acta no está disponible para firma' }, { status: 409 });
  }

  const items = await query<any[]>(
    `SELECT codigo_articulo, descripcion, cantidad FROM acta_items
     WHERE acta_id = ? ORDER BY orden`,
    [acta.id]
  );

  return NextResponse.json({
    success: true,
    data: {
      consecutivo:          acta.consecutivo,
      cliente:              acta.cliente,
      fecha:                new Date(acta.fecha_entrega).toLocaleDateString('es-CO', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            }),
      ciudad:               acta.ciudad_default || acta.ciudad || '',
      observaciones:        acta.observaciones,
      entregadoPorNombre:   acta.entregado_por_nombre,
      entregadoPorCargo:    acta.entregado_por_cargo,
      formato: {
        codigo:     acta.codigo,
        version:    acta.version,
        vigencia:   acta.vigencia,
        controlado: acta.controlado,
      },
      items,
    },
  });
}

// POST /api/firmar-acta/[token] — Recibe la firma, regenera PDF, marca como recibida
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const actas = await query<any[]>(
    `SELECT a.*,
            f.codigo, f.version, f.vigencia, f.controlado,
            e.logo_url, e.ciudad_default,
            c.nombre AS comp_nombre, c.cargo AS comp_cargo, c.firma_url AS comp_firma,
            coord.correo AS correo_compras
     FROM actas a
     JOIN formato_acta f ON f.id = a.formato_acta_id
     LEFT JOIN empresas e ON e.id = a.empresa_id
     LEFT JOIN compras c ON c.usuario_id = a.entregado_por_user_id
     LEFT JOIN compras coord ON coord.usuario_id = a.entregado_por_user_id
     WHERE a.firma_token = ?`,
    [token]
  );

  if (actas.length === 0) {
    return NextResponse.json({ error: 'Link inválido o ya utilizado' }, { status: 404 });
  }

  const acta = actas[0];
  if (acta.estado === 'recibida') {
    return NextResponse.json({ error: 'Este acta ya fue firmada' }, { status: 410 });
  }

  const body = await request.json();
  const { nombre, cargo, firmaBase64 } = body;

  if (!nombre?.trim() || !cargo?.trim() || !firmaBase64) {
    return NextResponse.json(
      { error: 'nombre, cargo y firmaBase64 son requeridos' },
      { status: 400 }
    );
  }

  // Guardar imagen de firma del receptor
  const firmaRelativa = `/uploads/firmas/recibido/acta_${acta.id}_recibido.png`;
  const firmaAbsoluta = path.join(process.cwd(), 'public', firmaRelativa);
  const base64Data = firmaBase64.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(firmaAbsoluta, Buffer.from(base64Data, 'base64'));

  // Resolver paths para Puppeteer
  let logoUrl: string | null = null;
  if (acta.logo_url) {
    logoUrl = pathToFileURL(path.join(process.cwd(), 'public', acta.logo_url)).href;
  }

  let firmaEntregadoUrl: string | null = null;
  if (acta.comp_firma) {
    firmaEntregadoUrl = pathToFileURL(path.join(process.cwd(), 'public', acta.comp_firma)).href;
  }

  const firmaRecibidoUrl = pathToFileURL(firmaAbsoluta).href;

  const fechaFormateada = new Date(acta.fecha_entrega).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const fechaRecibido = new Date().toLocaleString('es-CO');

  const items = await query<any[]>(
    `SELECT codigo_articulo, descripcion, cantidad FROM acta_items
     WHERE acta_id = ? ORDER BY orden`,
    [acta.id]
  );

  const actaData: ActaData = {
    formato: {
      codigo:     acta.codigo,
      version:    acta.version,
      vigencia:   acta.vigencia,
      controlado: acta.controlado,
    },
    logoUrl,
    consecutivo:        acta.consecutivo,
    fecha:              fechaFormateada,
    ciudad:             acta.ciudad_default || acta.ciudad || '',
    cliente:            acta.cliente,
    entregadoPorNombre: acta.comp_nombre || '',
    entregadoPorCargo:  acta.entregado_por_cargo || acta.comp_cargo || '',
    firmaEntregadoUrl,
    recibidoPorNombre:  nombre,
    recibidoPorCargo:   cargo,
    firmaRecibidoUrl,
    items: items.map((i) => ({
      codigoArticulo: i.codigo_articulo || '',
      descripcion:    i.descripcion,
      cantidad:       String(i.cantidad),
    })),
    observaciones: acta.observaciones ?? null,
  };

  // Regenerar PDF con ambas firmas (reemplaza el original)
  const pdfRelativo = `/uploads/actas/acta_${acta.id}.pdf`;
  const pdfAbsoluto = path.join(process.cwd(), 'public', pdfRelativo);

  try {
    await generarPdfActa(actaData, pdfAbsoluto);
  } catch (err) {
    return NextResponse.json({ error: 'Error al regenerar el PDF', detail: String(err) }, { status: 500 });
  }

  // Guardar en DB y invalidar token
  await query(
    `UPDATE actas
     SET estado = 'recibida',
         recibido_por_nombre = ?,
         recibido_por_cargo  = ?,
         firma_recibido_url  = ?,
         fecha_recibido      = NOW(),
         firma_token         = NULL,
         pdf_url             = ?
     WHERE id = ?`,
    [nombre, cargo, firmaRelativa, pdfRelativo, acta.id]
  );

  // Notificar a compras
  if (acta.correo_compras) {
    await enviarConfirmacionRecibo({
      consecutivo:       acta.consecutivo,
      recibidoPorNombre: nombre,
      recibidoPorCargo:  cargo,
      fechaRecibido,
      destinatario:      acta.correo_compras,
      pdfPath:           pdfAbsoluto,
    });
  }

  return NextResponse.json({ success: true });
}
