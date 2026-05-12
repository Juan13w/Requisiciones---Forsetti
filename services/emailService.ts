import nodemailer from 'nodemailer';
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

// Interfaz para los datos de la requisición
interface RequisicionData {
  titulo: string;
  descripcion: string;
  fecha_creacion: string;
  creado_por: string;
  // Agrega más campos según sea necesario
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
