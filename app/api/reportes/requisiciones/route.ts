// Importaciones al inicio del archivo
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import * as fs from 'fs';
import { readFile } from 'fs/promises';

// Interfaz para las requisiciones
interface Requisicion {
  
  consecutivo: string;
  empresa: string;
  fecha_solicitud: string;
  nombre_solicitante: string;
  proceso: string;
  justificacion: string;
  descripcion: string;
  cantidad: number;
  estado: string;
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
    console.error('Error al formatear fecha:', error);
    return dateString;
  }
};

// Función GET principal
export async function GET() {
  try {
    console.log('Iniciando generación de reporte...');
    
    // 1. Obtener datos de la base de datos
    console.log('Obteniendo datos de la base de datos...');
    const requisiciones = await query(`
      SELECT 
        requisicion_id,
        consecutivo,
        empresa,
        fecha_solicitud,
        nombre_solicitante,
        proceso,
        justificacion,
        descripcion,
        cantidad,
        estado
      FROM requisicion
      ORDER BY fecha_solicitud DESC
    `) as Requisicion[];

    if (!requisiciones || requisiciones.length === 0) {
      console.log('No se encontraron requisiciones');
      return NextResponse.json(
        { success: false, error: 'No se encontraron requisiciones' },
        { status: 404 }
      );
    }
    
    console.log(`Se encontraron ${requisiciones.length} requisiciones`);

    // 2. Importar dinámicamente jsPDF y autoTable
    console.log('Importando dependencias...');
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    console.log('Creando documento PDF...');
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
        console.warn('Advertencia: la imagen existe pero el tamaño en base64 es muy pequeño. Verifica el archivo footer.PNG');
        headerImageDataUri = null;
      }
    } catch (err) {
      console.error('No se pudo leer footer.PNG desde disco:', err);
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
        console.warn('Advertencia: la imagen existe pero el tamaño en base64 es muy pequeño. Verifica el archivo footer.PNG');
        footerImageDataUri = null;
      }
    } catch (err) {
      console.error('No se pudo leer footer.PNG desde disco:', err);
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
    // Mantener altura fija
    const footerHeight = 35;

    // Ajustar ancho automáticamente sin deformar
    const footerWidth = pageWidth * 0.9; // Ocupa solo el 60% del ancho
    const x = (pageWidth - footerWidth) / 2; // Centrado
    const y = pageHeight - footerHeight;

    doc.addImage(footerImageDataUri, 'PNG', x, y, footerWidth, footerHeight);
  } catch (err) {
    console.error('Error al agregar la imagen footer al PDF:', err);
  }
};

// Función para agregar el header (solo si se pudo leer)
const addHeaderToPage = () => {
  if (!headerImageDataUri) return; // Si no se cargó la imagen, no hace nada

  try {
    const headerHeight = 20; // Altura fija
    const headerWidth = pageWidth * 0.25; // Ajusta el tamaño proporcional (puedes modificarlo)

    // Posición alineada a la izquierda
    const x = 8; // Margen desde la izquierda
    const y = 8;  // Margen desde arriba

    doc.addImage(headerImageDataUri, 'PNG', x, y, headerWidth, headerHeight);
  } catch (err) {
    console.error('Error al agregar la imagen del header al PDF:', err);
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

    addHeaderToPage();
    // Título y fecha
    doc.setFontSize(20);
    doc.text(title, pageWidth / 2, 32, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generado el: ${date}`, 14, 38);

    // Configurar columnas de la tabl5a
    const tableColumn = [
      
      'Consecutivo', 
      'Empresa',
      'Fecha Solicitud',
      'Solicitante',
      'Proceso',
      'Cantidad',
      'Estado'
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
        String(req.cantidad || 0),
        estado
      ];
    });

    // Generar la tabla
    console.log('Generando tabla...');
  // @ts-ignore - Ignorar errores de tipo para autoTable
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [230, 126, 34],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didDrawPage: () => {
          addHeaderToPage();
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