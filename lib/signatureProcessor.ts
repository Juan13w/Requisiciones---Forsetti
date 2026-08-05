import sharp, { Sharp } from 'sharp';

/**
 * Procesa una imagen de firma (dibujada en canvas o subida por el usuario) y la
 * normaliza a un único formato de almacenamiento: WebP lossless con fondo
 * transparente cuando es posible.
 *
 * Pipeline:
 *  1. Decodifica el buffer de entrada (PNG/JPEG).
 *  2. Si viene sin canal alfa (ej. foto/escaneo con fondo blanco), aplica una
 *     "chroma key" simple sobre blancos/casi-blancos para volverlos transparentes.
 *  3. Recorta (trim) el espacio en blanco/transparente sobrante alrededor del trazo.
 *  4. Redimensiona sin upscaling a un ancho máximo razonable para uso en PDF.
 *  5. Codifica como WebP lossless (~10-30 KB típico, con transparencia).
 */

const MAX_WIDTH = 700; // px — suficiente para impresión en PDF, no amplía imágenes menores

// Un pixel se considera "fondo" (y se vuelve transparente) si es lo bastante claro y
// desaturado. Esto cubre tanto el blanco puro como los cuadros grises de los patrones
// de "transparencia" que algunos editores (Photoshop, GIMP, Preview, etc.) graban como
// color real al exportar/capturar — típicamente grises neutros entre ~150 y 255.
const BACKGROUND_MIN_BRIGHTNESS = 150;
const BACKGROUND_MAX_SATURATION = 12; // diferencia máx. entre canal más claro y más oscuro (desaturación)

export const MAX_SIGNATURE_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_INPUT_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export function isAllowedSignatureMime(mime: string): boolean {
  return ALLOWED_INPUT_MIME.has(mime.toLowerCase());
}

/**
 * Convierte a transparentes los píxeles claros y desaturados (blanco puro, o grises
 * neutros tipo cuadriculado de "transparencia"). Deja intacta la tinta oscura/de color
 * y cualquier transparencia real que ya traiga la imagen (no toca el alfa de los
 * píxeles que no matchean el criterio de "fondo").
 */
async function backgroundToTransparent(image: Sharp): Promise<Sharp> {
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    if (min >= BACKGROUND_MIN_BRIGHTNESS && (max - min) <= BACKGROUND_MAX_SATURATION) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: { width, height, channels } });
}

/**
 * Procesa un buffer de imagen de firma y devuelve el WebP lossless final.
 *
 * `skipBackgroundRemoval` se usa únicamente para firmas dibujadas en el canvas de la
 * app (siempre PNG con transparencia real, generado por nosotros) — en ese caso no
 * hace falta chroma-key. Para archivos subidos por el usuario SIEMPRE se aplica,
 * incluso si el PNG ya trae canal alfa: muchos editores exportan/capturan con el
 * canal alfa presente pero completamente opaco (255), habiendo "horneado" el patrón
 * de cuadros de su vista de transparencia como color real — confiar en `hasAlpha`
 * para saltarse este paso deja ese cuadriculado visible en el resultado final.
 */
export async function processSignatureImage(
  input: Buffer,
  opts: { skipBackgroundRemoval?: boolean } = {}
): Promise<Buffer> {
  let pipeline = sharp(input, { failOn: 'none' });

  if (!opts.skipBackgroundRemoval) {
    pipeline = await backgroundToTransparent(sharp(input, { failOn: 'none' }));
    // Despeckle: el chroma-key es un corte binario por pixel, así que los bordes de
    // celda de un cuadriculado (antialiasing/compresión que cae justo fuera del
    // umbral) sobreviven como líneas finísimas de 1-2px. Un filtro de mediana 3x3
    // limpia ese ruido aislado sin afectar de forma perceptible el trazo de la firma
    // (más grueso y continuo).
    pipeline = pipeline.median(3);
  }

  const trimmed = pipeline.trim({ background: '#ffffff', threshold: 10 });

  const resized = trimmed.resize({
    width: MAX_WIDTH,
    withoutEnlargement: true,
    fit: 'inside',
  });

  return resized.webp({ lossless: true, effort: 5 }).toBuffer();
}

/** Extrae mime + buffer de un data URI (data:image/png;base64,...). */
export function parseDataUri(dataUri: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri);
  if (!match) {
    throw new Error('Formato de imagen inválido');
  }
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}
