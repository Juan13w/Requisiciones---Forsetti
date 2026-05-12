// Importaciones al inicio del archivo
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/utils/logger';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';
import { readFile } from 'fs/promises';

// Interfaz para las requisiciones
interface Requisicion {
  requisicion_id: number;
  consecutivo: string;
  empresa: string;
  fecha_solicitud: string;
  nombre_solicitante: string;
  proceso: string;
  justificacion: string;
  descripcion: string;
  cantidad: number;
  estado: string;
  aprobado_por?: string; // Campo opcional para el aprobador
}

// Función para formatear fechas
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    logger.error('Error al formatear fecha', error);
    return dateString;
  }
};

// Función GET principal con soporte para filtros
export async function GET(request: Request) {
  try {
    logger.info('Iniciando generación de reporte de requisiciones');
    
    // Obtener parámetros de filtro de la URL
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes'); // Formato: YYYY-MM
    const empresa = searchParams.get('empresa');
    const proceso = searchParams.get('proceso');
    const estado = searchParams.get('estado');
    
    logger.debug('Filtros aplicados al reporte', { mes, empresa, proceso, estado });
    
    // 1. Construir consulta SQL con filtros
    let sqlQuery = `
      SELECT 
        r.requisicion_id,
        r.consecutivo,
        r.empresa,
        r.fecha_solicitud,
        r.nombre_solicitante,
        r.proceso,
        r.justificacion,
        r.descripcion,
        r.cantidad,
        r.estado,
        r.aprobado_por
      FROM requisicion r
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Filtro por mes
    if (mes) {
      sqlQuery += ` AND DATE_FORMAT(fecha_solicitud, '%Y-%m') = ?`;
      params.push(mes);
    }
    
    // Filtro por empresa
    if (empresa) {
      sqlQuery += ` AND empresa = ?`;
      params.push(empresa);
    }
    
    // Filtro por proceso
    if (proceso) {
      sqlQuery += ` AND proceso = ?`;
      params.push(proceso);
    }
    
    // Filtro por estado
    if (estado) {
      sqlQuery += ` AND estado = ?`;
      params.push(estado);
    }
    
    sqlQuery += ` ORDER BY fecha_solicitud DESC`;
    const requisiciones = await query(sqlQuery, params) as Requisicion[];

    if (!requisiciones || requisiciones.length === 0) {
      logger.info('No se encontraron requisiciones para el reporte con los filtros aplicados');
      return NextResponse.json(
        { success: false, error: 'No se encontraron requisiciones con los filtros seleccionados. Intente con otros criterios.' },
        { status: 200 }
      );
    }
    
    logger.info('Requisiciones obtenidas para reporte', { cantidad: requisiciones.length });

    // 2. Importar dinámicamente jsPDF y autoTable
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Ruta pública de la imagen del footer
 // -------------------------------------------
// Insertar justo DEBAJO de la creación de `doc`
// const doc = new jsPDF({...});
// -------------------------------------------

 // ya lo tienes importado arriba como writeFile, si no, reutiliza

// Ruta del archivo en disco

    // header pdf
    const headerPath = join(process.cwd(), 'public', 'images', 'imagenes', 'logo4.png');

    let headerImageDataUri: string | null = null;

    try {
      // Leer el archivo y convertir a base64 (data URI)
      const imgBuffer = await readFile(headerPath);
      const imgBase64 = imgBuffer.toString('base64');
      headerImageDataUri = `data:image/png;base64,${imgBase64}`;

      // Opcional: comprobar que la cadena no está vacía
      if (!imgBase64 || imgBase64.length < 100) {
        logger.warn('La imagen de header existe pero su tamaño en base64 es muy pequeño. Verifica el archivo logo4.png');
        headerImageDataUri = null;
      }
    } catch (err) {
      logger.error('No se pudo leer la imagen de header desde disco', err);
      headerImageDataUri = null;
    }


    const footerPath = join(process.cwd(), 'public', 'images', 'imagenes', 'footer-pica.png');

    let footerImageDataUri: string | null = null;

    try {
      // Leer el archivo y convertir a base64 (data URI)
      const imgBuffer = await readFile(footerPath);
      const imgBase64 = imgBuffer.toString('base64');
      footerImageDataUri = `data:image/png;base64,${imgBase64}`;

      // Opcional: comprobar que la cadena no está vacía
      if (!imgBase64 || imgBase64.length < 100) {
        logger.warn('La imagen de footer existe pero su tamaño en base64 es muy pequeño. Verifica el archivo footer-pica.png');
        footerImageDataUri = null;
      }
    } catch (err) {
      logger.error('No se pudo leer la imagen de footer desde disco', err);
      footerImageDataUri = null;
    }

    // Medidas del PDF en mm (A4 horizontal = 297 x 210 mm)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerHeight = 20; // Altura indicada
    const headerHeight = 20; // Altura indicada

    // Función para agregar el footer (solo si se pudo leer)
    const addFooterToPage = () => {
  if (!footerImageDataUri) return; // Si no se cargó la imagen, no hace nada

  try {
    // Reducir altura para evitar superposición
    const footerHeight = 15; // Reducido de 35 a 15

    // Reducir ancho para dejar más espacio
    const footerWidth = pageWidth * 0.7; // Reducido de 90% a 70%
    const x = (pageWidth - footerWidth) / 2; // Centrado
    const y = pageHeight - footerHeight - 2; // Mover 2mm más abajo

    doc.addImage(footerImageDataUri, 'PNG', x, y, footerWidth, footerHeight);
  } catch (err) {
    logger.error('Error al agregar la imagen footer al PDF', err);
  }
};

// Función para agregar el header (solo si se pudo leer)
const addHeaderToPage = (currentPage: number) => {
  if (!headerImageDataUri) return; // Si no se cargó la imagen, no hace nada

  try {
    const headerHeight = 8; // Reducir altura significativamente
    const headerWidth = 30; // Reducir ancho

    // Posición más alta para evitar superposición con encabezado de tabla
    const x = 10; // Posición desde la izquierda
    const y = 3;  // Posición desde arriba (muy arriba)

    doc.addImage(headerImageDataUri, 'PNG', x, y, headerWidth, headerHeight);
  } catch (err) {
    logger.error('Error al agregar la imagen del header al PDF', err);
  }
};




    // Configuración del documento
    const title = 'Reporte de Requisiciones';
    const date = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Construir texto de filtros aplicados
    const filtrosAplicados: string[] = [];
    if (mes) {
      const [year, month] = mes.split('-');
      const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      filtrosAplicados.push(`Mes: ${mesesNombres[parseInt(month) - 1]} ${year}`);
    }
    if (empresa) filtrosAplicados.push(`Empresa: ${empresa}`);
    if (proceso) filtrosAplicados.push(`Proceso: ${proceso}`);
    if (estado) filtrosAplicados.push(`Estado: ${estado.charAt(0).toUpperCase() + estado.slice(1)}`);

    // El logo se agregará solo en didDrawPage para evitar superposición
    // Título y fecha
    doc.setFontSize(20);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generado el: ${date}`, 14, 21);
    
    // Mostrar filtros aplicados si hay alguno
    let startY = 23;
    if (filtrosAplicados.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Filtros: ${filtrosAplicados.join(' | ')}`, 14, 27);
      doc.setTextColor(0, 0, 0);
      startY = 31;
    }

    // Configurar columnas de la tabla
    const tableColumn = [
      'Consecutivo', 
      'Empresa',
      'Fecha',
      'Solicitante',
      'Proceso',
      'Descripción',
      'Estado',
      'Aprobado por'
    ];

    // Preparar datos de la tabla
    const tableRows = requisiciones.map(req => {
      const fechaFormateada = formatDate(req.fecha_solicitud);
      const estado = req.estado ? 
        (req.estado.charAt(0).toUpperCase() + req.estado.slice(1).toLowerCase()) : 
        'Pendiente';
      
      return [
        req.consecutivo || 'N/A',
        req.empresa || 'N/A',
        fechaFormateada,
        req.nombre_solicitante || 'N/A',
        req.proceso || 'N/A',
        req.descripcion || 'N/A',
        estado,
        req.aprobado_por || 'N/A'
      ];
    });

    // Generar la tabla
    console.log('Generando tabla...');
  // @ts-ignore - Ignorar errores de tipo para autoTable
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        styles: { 
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [230, 126, 34],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },  // Consecutivo
          1: { cellWidth: 14 },                    // Empresa
          2: { cellWidth: 14, halign: 'center' },  // Fecha
          3: { cellWidth: 32 },                    // Solicitante
          4: { cellWidth: 20 },                    // Proceso
          5: { cellWidth: 42 },                    // Descripción
          6: { cellWidth: 18, halign: 'center' },  // Estado
          7: { cellWidth: 26, halign: 'center' }   // Aprobado por
        },
        didDrawPage: (data: any) => {
          // Agregar header en todas las páginas con posición fija
          addHeaderToPage(data.pageNumber);
          addFooterToPage();
        }
      });

    // Guardar el PDF
    console.log('Guardando PDF...');
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Crear directorio de reportes si no existe
    const uploadDir = join(process.cwd(), 'public', 'reportes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generar nombre de archivo único
    const fileName = `reporte_requisiciones_${Date.now()}.pdf`;
    const filePath = join(uploadDir, fileName);

    // Guardar el archivo
    await writeFile(filePath, pdfBuffer);
    console.log('PDF generado exitosamente:', fileName);
    
    // Devolver la URL del archivo generado
    return NextResponse.json({ 
      success: true, 
      fileUrl: `/reportes/${fileName}`,
      fileName
    });

  } catch (error) {
    console.error('Error al generar el reporte:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al generar el reporte',
        stack: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}