import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extender el tipo jsPDF para incluir autoTable
type JsPDFWithAutoTable = jsPDF & {
  autoTable: (options: any) => jsPDF;
};

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Solo para desarrollo, en producción debería ser true
  },
});

// Función para generar el PDF usando jsPDF
async function generatePdfReport(data: any) {
  // Crear un nuevo documento
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as JsPDFWithAutoTable;

  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  const tableStartY = 40;
  
  // Encabezado del reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(40, 62, 80);
  doc.text('REPORTE DE REQUISICIONES', pageWidth / 2, 20, { align: 'center' });

  try {
  const headerPath = path.join(process.cwd(), 'public', 'images', 'imagenes', 'logo4.png');
  await fs.access(headerPath);
  const headerImg = await fs.readFile(headerPath);
  const headerData = `data:image/png;base64,${headerImg.toString('base64')}`;

  // Tamaño y posición
  const headerWidth = 40;
  const headerHeight = 20;
  const xHeader = 15; // Izquierda
  const yHeader = 5;

  doc.addImage(headerData, 'PNG', xHeader, yHeader, headerWidth, headerHeight);
} catch (err) {
  console.error('No se pudo cargar el header:', err);
}

  
  // Información de la empresa y fecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Empresa: Todas las empresas`, margin, 30);
  doc.text(
    `Generado el: ${new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 
    pageWidth - margin, 
    30, 
    { align: 'right' }
  );

  // Configuración de la tabla
  const headers = [
    'CONSECUTIVO', 
    'EMPRESA', 
    'FECHA', 
    'PROCESO', 
    'CANTIDAD',
    'ESTADO'
  ];

  // Formatear datos para la tabla
  const tableData = data.requisiciones.map((item: any) => [
    item.consecutivo?.toString() || 'N/A',
    item.empresa?.toString() || 'N/A',
    item.fechaSolicitud ? new Date(item.fechaSolicitud).toLocaleDateString('es-ES') : 'N/A',
    item.proceso?.toString() || 'N/A',
    (item.cantidad !== null && item.cantidad !== undefined) ? item.cantidad.toString() : '0',
    item.estado ? (item.estado.charAt(0).toUpperCase() + item.estado.slice(1)) : 'N/A'
  ]);

  // Agregar tabla al documento
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: tableStartY,
    margin: { top: 10 },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      lineWidth: 0.1,
      lineColor: [221, 221, 221],
    },
    headStyles: {
      fillColor: [230, 126, 34],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 50 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 }
    },
 
  });

  // Devolver el PDF como un buffer
  return doc.output('arraybuffer');
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, requisiciones } = await request.json();

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Generar el PDF
    const pdfBytes = await generatePdfReport({ requisiciones });
    
    // Configuración del correo
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@tuapp.com',
      to,
      subject,
      text: message || 'Adjunto encontrará el reporte de requisiciones solicitado.',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Reporte de Requisiciones</h1>
          </div>
          <div style="padding: 20px; background-color: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hola,</p>
            <p>${message || 'Adjunto encontrará el reporte de requisiciones solicitado.'}</p>
            <p>Este es un mensaje automático, por favor no responda a este correo.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>© ${new Date().getFullYear()} Sistema de Requisiciones. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `reporte-requisiciones-${new Date().toISOString().split('T')[0]}.pdf`,
          content: Buffer.from(pdfBytes).toString('base64'),
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    };

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Correo con reporte enviado exitosamente',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al enviar el correo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
