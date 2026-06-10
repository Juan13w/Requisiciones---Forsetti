import nodemailer from 'nodemailer';
import fs from 'fs';
import { logger } from '@/utils/logger';

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface RequisicionData {
  titulo: string;
  descripcion: string;
  fecha_creacion: string;
  creado_por: string;
}

interface AprobacionData {
  consecutivo: string;
  empresa: string;
  descripcion: string;
  cantidad: number;
  proceso: string;
  nombre_solicitante: string;
  aprobado_por: string;
  fecha_aprobacion: string;
}

/**
 * Envía un correo de notificación cuando se crea una nueva requisición
 * @param to Correo electrónico del destinatario
 * @param requisicion Datos de la requisición
 */
export async function enviarNotificacionRequisicion(
  to: string,
  requisicion: RequisicionData
) {
  try {
    const mailOptions = {
      from: `"Sistema de Requisiciones" <${process.env.EMAIL_FROM || 'no-reply@empresa.com'}>`,
      to,
      subject: `Nueva Requisición #${requisicion.titulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nueva Requisición Creada</h2>
          <p>Se ha creado una nueva requisición en el sistema de gestión de requisiciones.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Detalles de la Requisición</h3>
            
            <p><strong>Título:</strong> ${requisicion.titulo}</p>
            <p><strong>Descripción:</strong> ${requisicion.descripcion}</p>
            <p><strong>Fecha de creación:</strong> ${new Date(requisicion.fecha_creacion).toLocaleDateString()}</p>
            <p><strong>Creado por:</strong> ${requisicion.creado_por}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 0.9em;">
            Este es un correo automático, por favor no responder directamente a este mensaje.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Correo de notificación enviado', { messageId: info.messageId, to });
    return true;
  } catch (error) {
    logger.error('Error al enviar el correo de notificación', error);
    return false;
  }
}

// ─── ACTAS ────────────────────────────────────────────────────────────────────

interface ActaFirmaData {
  consecutivo: string;
  cliente: string;
  fecha: string;
  firmaToken: string;
  destinatario: string;
  pdfPath: string | null;
}

export async function enviarActaParaFirma(data: ActaFirmaData): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9091';
  const linkFirma = `${baseUrl}/firmar-acta/${data.firmaToken}`;

  const attachments = [];
  if (data.pdfPath && fs.existsSync(data.pdfPath)) {
    attachments.push({
      filename: `Acta_${data.consecutivo}.pdf`,
      path: data.pdfPath,
      contentType: 'application/pdf',
    });
  }

  try {
    const mailOptions = {
      from: `"Sistema de Requisiciones" <${process.env.EMAIL_FROM || 'no-reply@empresa.com'}>`,
      to: data.destinatario,
      subject: `Acta de entrega #${data.consecutivo} — Confirmación de recepción`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1f2937;">
          <div style="background-color: #1d4ed8; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: #fff; font-size: 18px;">Acta de Entrega de Artículos</h2>
          </div>
          <div style="background-color: #f9fafb; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Se ha generado un acta de entrega de artículos para tu área.</p>
            <div style="background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:16px 20px; margin:16px 0;">
              <p style="margin:4px 0"><strong>Consecutivo:</strong> ${data.consecutivo}</p>
              <p style="margin:4px 0"><strong>Cliente:</strong> ${data.cliente}</p>
              <p style="margin:4px 0"><strong>Fecha:</strong> ${data.fecha}</p>
            </div>
            <p>Para confirmar la recepción de los artículos, haz clic en el siguiente enlace y firma digitalmente:</p>
            <div style="text-align:center; margin:24px 0;">
              <a href="${linkFirma}"
                 style="background-color:#1d4ed8; color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">
                Firmar y confirmar recepción
              </a>
            </div>
            <p style="color:#6b7280; font-size:12px;">
              Este enlace es de un solo uso. Si ya firmaste el acta, ignora este correo.
            </p>
          </div>
        </div>`,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Correo de acta enviado', { messageId: info.messageId, to: data.destinatario });
    return true;
  } catch (error) {
    logger.error('Error al enviar correo de acta', error);
    return false;
  }
}

interface ConfirmacionReciboData {
  consecutivo: string;
  recibidoPorNombre: string;
  recibidoPorCargo: string;
  fechaRecibido: string;
  destinatario: string;
  pdfPath: string | null;
}

export async function enviarConfirmacionRecibo(data: ConfirmacionReciboData): Promise<boolean> {
  const attachments = [];
  if (data.pdfPath && fs.existsSync(data.pdfPath)) {
    attachments.push({
      filename: `Acta_${data.consecutivo}_firmada.pdf`,
      path: data.pdfPath,
      contentType: 'application/pdf',
    });
  }

  try {
    const mailOptions = {
      from: `"Sistema de Requisiciones" <${process.env.EMAIL_FROM || 'no-reply@empresa.com'}>`,
      to: data.destinatario,
      subject: `✅ Acta #${data.consecutivo} firmada y recibida`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1f2937;">
          <div style="background-color: #16a34a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: #fff; font-size: 18px;">✅ Acta Firmada y Recibida</h2>
          </div>
          <div style="background-color: #f9fafb; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>El acta de entrega <strong>#${data.consecutivo}</strong> ha sido firmada.</p>
            <div style="background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:16px 20px; margin:16px 0;">
              <p style="margin:4px 0"><strong>Recibido por:</strong> ${data.recibidoPorNombre}</p>
              <p style="margin:4px 0"><strong>Cargo:</strong> ${data.recibidoPorCargo}</p>
              <p style="margin:4px 0"><strong>Fecha de recepción:</strong> ${data.fechaRecibido}</p>
            </div>
            <p>Se adjunta el PDF del acta con ambas firmas.</p>
            <p style="color:#6b7280; font-size:12px;">
              Este es un correo automático generado por el Sistema de Requisiciones.
            </p>
          </div>
        </div>`,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Correo de confirmación de recibo enviado', { messageId: info.messageId, to: data.destinatario });
    return true;
  } catch (error) {
    logger.error('Error al enviar confirmación de recibo', error);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────

export async function enviarNotificacionAprobacion(
  to: string,
  data: AprobacionData
): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"Sistema de Requisiciones" <${process.env.EMAIL_FROM || 'no-reply@empresa.com'}>`,
      to,
      subject: `✅ Requisición #${data.consecutivo} aprobada`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1f2937;">
          <div style="background-color: #16a34a; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: #ffffff; font-size: 20px;">✅ Requisición Aprobada</h2>
          </div>

          <div style="background-color: #f9fafb; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0;">Hola <strong>${data.nombre_solicitante}</strong>,</p>
            <p>Tu requisición ha sido <strong style="color: #16a34a;">aprobada</strong> por el equipo de Compras.</p>

            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; width: 40%;">Consecutivo</td>
                  <td style="padding: 6px 0; font-weight: 600;">${data.consecutivo}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 6px 0; color: #6b7280;">Empresa</td>
                  <td style="padding: 6px 0;">${data.empresa}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Proceso</td>
                  <td style="padding: 6px 0;">${data.proceso}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 6px 0; color: #6b7280;">Descripción</td>
                  <td style="padding: 6px 0;">${data.descripcion}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Cantidad</td>
                  <td style="padding: 6px 0;">${data.cantidad}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 6px 0; color: #6b7280;">Aprobado por</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #16a34a;">${data.aprobado_por}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Fecha de aprobación</td>
                  <td style="padding: 6px 0;">${data.fecha_aprobacion}</td>
                </tr>
              </table>
            </div>

            <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">
              Este es un correo automático generado por el Sistema de Requisiciones. Por favor no respondas directamente a este mensaje.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Correo de aprobación enviado', { messageId: info.messageId, to });
    return true;
  } catch (error) {
    logger.error('Error al enviar el correo de aprobación', error);
    return false;
  }
}
