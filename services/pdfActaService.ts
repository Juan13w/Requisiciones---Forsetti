import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface ActaData {
  // Encabezado — Eje A (formato)
  formato: {
    codigo: string;
    version: string;
    vigencia: string;
    controlado: string;
  };
  // Encabezado — Eje B (empresa)
  logoUrl: string | null;

  // Campos auto-llenados
  consecutivo: string;
  fecha: string;
  ciudad: string;
  cliente: string;

  // Entregado por
  entregadoPorNombre: string;
  entregadoPorCargo: string;
  firmaEntregadoUrl: string | null;

  // Recibido por (null mientras no se haya firmado)
  recibidoPorNombre: string | null;
  recibidoPorCargo: string | null;
  firmaRecibidoUrl: string | null;

  // Ítems
  items: { codigoArticulo: string; descripcion: string; cantidad: string }[];

  // Observaciones
  observaciones: string | null;
}

function buildHtml(data: ActaData): string {
  const vigenciaFormateada = data.formato.vigencia
    ? new Date(data.formato.vigencia).toISOString().split('T')[0]
    : '';

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td class="cell-center">${item.codigoArticulo || ''}</td>
        <td class="cell-center">${item.descripcion}</td>
        <td class="cell-center">${item.cantidad}</td>
      </tr>`
    )
    .join('');

  const logoHtml = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="Logo" class="logo-img" />`
    : '<div class="logo-placeholder"></div>';

  const firmaEntregadoHtml = data.firmaEntregadoUrl
    ? `<img src="${data.firmaEntregadoUrl}" alt="Firma" class="firma-img" />`
    : '<div class="firma-espacio"></div>';

  const firmaRecibidoHtml = data.firmaRecibidoUrl
    ? `<img src="${data.firmaRecibidoUrl}" alt="Firma" class="firma-img" />`
    : '<div class="firma-espacio"></div>';

  const observacionesHtml = data.observaciones
    ? `<p class="observaciones"><strong>Observaciones:</strong> ${data.observaciones}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    color: #000;
    padding: 28px 36px;
    background: #fff;
  }

  /* ── ENCABEZADO ── */
  .header {
    display: grid;
    grid-template-columns: 180px 1fr 120px;
    border: 1.5px solid #000;
    margin-bottom: 20px;
  }
  .header-meta {
    border-right: 1.5px solid #000;
    padding: 6px 10px;
    font-size: 9.5pt;
    line-height: 1.7;
  }
  .header-meta span { font-weight: bold; }
  .header-title {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    padding: 8px 12px;
    line-height: 1.3;
  }
  .header-logo {
    border-left: 1.5px solid #000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  .logo-img { max-width: 100px; max-height: 70px; object-fit: contain; }
  .logo-placeholder { width: 100px; height: 60px; }

  /* ── CUERPO ── */
  .body { padding: 4px 0; }
  .campo {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 11pt;
  }
  .campo-label { font-weight: bold; min-width: 110px; }
  .campo-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .campo-row .campo { flex: 1; }

  .intro {
    margin: 14px 0 18px 0;
    font-size: 11pt;
  }

  /* ── TABLA DE ÍTEMS ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  th {
    border: 1.5px solid #000;
    padding: 8px 6px;
    text-align: center;
    font-size: 10pt;
    font-weight: bold;
    background: #fff;
  }
  td {
    border: 1px solid #000;
    padding: 7px 6px;
    font-size: 10pt;
    min-height: 28px;
  }
  .cell-center { text-align: center; }

  .observaciones {
    font-size: 10pt;
    margin-bottom: 24px;
    color: #333;
  }

  /* ── FIRMAS ── */
  .firmas {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    gap: 40px;
  }
  .firma-bloque { flex: 1; }
  .firma-titulo {
    font-weight: bold;
    font-size: 11pt;
    margin-bottom: 10px;
  }
  .firma-img {
    max-width: 160px;
    max-height: 70px;
    object-fit: contain;
    display: block;
    margin-bottom: 2px;
  }
  .firma-espacio { height: 60px; }
  .firma-linea {
    border-top: 1px solid #000;
    margin-top: 4px;
    margin-bottom: 4px;
    width: 80%;
  }
  .firma-cargo { font-size: 10pt; }
</style>
</head>
<body>

  <!-- ENCABEZADO -->
  <div class="header">
    <div class="header-meta">
      <span>Controlado:</span> ${data.formato.controlado}<br/>
      <span>Código:</span> ${data.formato.codigo}<br/>
      <span>Vigencia:</span> ${vigenciaFormateada}<br/>
      <span>Versión:</span> ${data.formato.version}
    </div>
    <div class="header-title">ACTA DE ENTREGA DE<br/>ARTÍCULOS</div>
    <div class="header-logo">${logoHtml}</div>
  </div>

  <!-- CUERPO -->
  <div class="body">
    <div class="campo-row">
      <div class="campo">
        <span class="campo-label">FECHA.</span>
        <span>${data.fecha}</span>
      </div>
      <div class="campo">
        <span class="campo-label">CONSECUTIVO.</span>
        <span>${data.consecutivo}</span>
      </div>
    </div>

    <div class="campo">
      <span class="campo-label">CIUDAD.</span>
      <span>${data.ciudad}</span>
    </div>

    <div class="campo">
      <span class="campo-label">CLIENTE.</span>
      <span>${data.cliente}.</span>
    </div>

    <p class="intro">
      Por medio de esta acta se realiza la entrega de los insumos correspondientes:
    </p>

    <!-- TABLA DE ÍTEMS -->
    <table>
      <thead>
        <tr>
          <th style="width:22%">CÓDIGO<br/>ARTICULO</th>
          <th style="width:56%">INSUMO O PRODUCTO</th>
          <th style="width:22%">CANTIDAD</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    ${observacionesHtml}

    <!-- FIRMAS -->
    <div class="firmas">
      <div class="firma-bloque">
        <div class="firma-titulo">Entregado por:</div>
        ${firmaEntregadoHtml}
        <div class="firma-linea"></div>
        <div class="firma-cargo">
          <strong>Cargo:</strong> ${data.entregadoPorCargo}
        </div>
      </div>
      <div class="firma-bloque">
        <div class="firma-titulo">Recibido por:</div>
        ${firmaRecibidoHtml}
        <div class="firma-linea"></div>
        <div class="firma-cargo">
          ${data.recibidoPorNombre ? `<strong>${data.recibidoPorNombre}</strong><br/>` : ''}
          <strong>Cargo:</strong> ${data.recibidoPorCargo || ''}
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

function fileUrlToDataUri(url: string): string | null {
  try {
    const filePath = url.startsWith('file://') ? fileURLToPath(url) : url;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function generarPdfActa(data: ActaData, outputPath: string): Promise<void> {
  const resolved: ActaData = {
    ...data,
    logoUrl:           data.logoUrl          ? fileUrlToDataUri(data.logoUrl)          : null,
    firmaEntregadoUrl: data.firmaEntregadoUrl ? fileUrlToDataUri(data.firmaEntregadoUrl) : null,
    firmaRecibidoUrl:  data.firmaRecibidoUrl  ? fileUrlToDataUri(data.firmaRecibidoUrl)  : null,
  };
  const html = buildHtml(resolved);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, pdfBuffer);
  } finally {
    await browser.close();
  }
}

export function resolveAbsolutePath(relativeUrl: string): string {
  return path.join(process.cwd(), 'public', relativeUrl);
}
