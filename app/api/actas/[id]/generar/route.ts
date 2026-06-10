import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { pathToFileURL } from 'url';
import { query } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import { generarPdfActa, ActaData } from '@/services/pdfActaService';
import { enviarActaParaFirma } from '@/services/emailService';

// POST /api/actas/[id]/generar
// Valida ≥1 ítem, genera el PDF, actualiza estado → 'generada'/'enviada', envía correo.
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

  // Cargar acta con formato y empresa
  const actas = await query<any[]>(
    `SELECT a.*,
            f.codigo, f.version, f.vigencia, f.controlado,
            e.logo_url, e.ciudad_default,
            c.nombre AS comp_nombre, c.cargo AS comp_cargo, c.firma_url AS comp_firma
     FROM actas a
     JOIN formato_acta f ON f.id = a.formato_acta_id
     LEFT JOIN empresas e ON e.id = a.empresa_id
     LEFT JOIN compras c ON c.usuario_id = a.entregado_por_user_id
     WHERE a.id = ?`,
    [actaId]
  );
  if (actas.length === 0) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

  const acta = actas[0];
  if (acta.estado !== 'borrador') {
    return NextResponse.json({ error: 'El acta ya fue generada' }, { status: 409 });
  }

  // Validar ≥1 ítem
  const items = await query<any[]>(
    `SELECT id, codigo_articulo, descripcion, cantidad FROM acta_items
     WHERE acta_id = ? ORDER BY orden`,
    [actaId]
  );
  if (items.length === 0) {
    return NextResponse.json({ error: 'El acta debe tener al menos un ítem' }, { status: 422 });
  }

  // Resolver logo (URL absoluta para Puppeteer)
  let logoUrl: string | null = null;
  if (acta.logo_url) {
    logoUrl = pathToFileURL(path.join(process.cwd(), 'public', acta.logo_url)).href;
  }

  // Resolver firma de compras
  let firmaEntregadoUrl: string | null = null;
  if (acta.comp_firma) {
    firmaEntregadoUrl = pathToFileURL(path.join(process.cwd(), 'public', acta.comp_firma)).href;
  }

  const fechaFormateada = new Date(acta.fecha_entrega).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const actaData: ActaData = {
    formato: {
      codigo:     acta.codigo,
      version:    acta.version,
      vigencia:   acta.vigencia,
      controlado: acta.controlado,
    },
    logoUrl,
    consecutivo:          acta.consecutivo,
    fecha:                fechaFormateada,
    ciudad:               acta.ciudad_default || acta.ciudad || '',
    cliente:              acta.cliente,
    entregadoPorNombre:   acta.comp_nombre || '',
    entregadoPorCargo:    acta.entregado_por_cargo || acta.comp_cargo || '',
    firmaEntregadoUrl,
    recibidoPorNombre:    null,
    recibidoPorCargo:     null,
    firmaRecibidoUrl:     null,
    items: items.map((i) => ({
      codigoArticulo: i.codigo_articulo || '',
      descripcion:    i.descripcion,
      cantidad:       String(i.cantidad),
    })),
    observaciones: acta.observaciones ?? null,
  };

  // Generar PDF
  const pdfRelativo = `/uploads/actas/acta_${actaId}.pdf`;
  const pdfAbsoluto = path.join(process.cwd(), 'public', pdfRelativo);

  try {
    await generarPdfActa(actaData, pdfAbsoluto);
  } catch (err) {
    console.error('[generar] Error al generar PDF:', err);
    return NextResponse.json({ error: 'Error al generar el PDF', detail: String(err) }, { status: 500 });
  }

  // Obtener correo del coordinador receptor
  let correoCoordinador: string | null = null;
  if (acta.recibido_por_user_id) {
    const coord = await query<any[]>(
      `SELECT correo FROM coordinador WHERE coordinador_id = ?`,
      [acta.recibido_por_user_id]
    );
    correoCoordinador = coord[0]?.correo ?? null;
  }

  // Enviar correo si hay destinatario
  let estadoFinal = 'generada';
  if (correoCoordinador) {
    const enviado = await enviarActaParaFirma({
      consecutivo:  acta.consecutivo,
      cliente:      acta.cliente,
      fecha:        fechaFormateada,
      firmaToken:   acta.firma_token,
      destinatario: correoCoordinador,
      pdfPath:      pdfAbsoluto,
    });
    if (enviado) estadoFinal = 'enviada';
  }

  // Actualizar estado y pdf_url
  await query(
    `UPDATE actas SET estado = ?, pdf_url = ? WHERE id = ?`,
    [estadoFinal, pdfRelativo, actaId]
  );

  return NextResponse.json({
    success:  true,
    pdf_url:  pdfRelativo,
    estado:   estadoFinal,
    enviado:  estadoFinal === 'enviada',
  });
}
