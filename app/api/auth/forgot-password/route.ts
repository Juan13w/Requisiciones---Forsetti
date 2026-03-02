import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';

// Configuración del transporte de correo (reutilizando la configuración existente)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Tabla para almacenar tokens de recuperación (crear si no existe)
const RESET_TOKENS_TABLE = `
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
  )
`;

// Generar token seguro
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Limpiar tokens expirados
async function cleanupExpiredTokens() {
  try {
    await pool.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW()');
  } catch (error) {
    console.error('Error limpiando tokens expirados:', error);
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de correo electrónico inválido' },
        { status: 400 }
      );
    }

    // Crear tabla de tokens si no existe
    await pool.query(RESET_TOKENS_TABLE);

    // Limpiar tokens expirados
    await cleanupExpiredTokens();

    // Buscar usuario en las tres tablas
    let userFound = false;
    let userRole = '';
    let userName = '';

    // 1. Buscar en administrador
    const [admins] = await pool.query<RowDataPacket[]>(
      'SELECT administrador_id as id, correo as email, "admin" as rol FROM administrador WHERE correo = ?',
      [email]
    );

    if (admins.length > 0) {
      userFound = true;
      userRole = 'administrador';
      userName = 'Administrador';
    }

    // 2. Buscar en coordinador
    if (!userFound) {
      const [coordinadores] = await pool.query<RowDataPacket[]>(
        'SELECT correo, empresa FROM coordinador WHERE correo = ?',
        [email]
      );

      if (coordinadores.length > 0) {
        userFound = true;;
        userRole = 'coordinador'
        userName = `Coordinador - ${coordinadores[0].empresa}`;
      }
    }

    // 3. Buscar en compras
    if (!userFound) {
      const [compras] = await pool.query<RowDataPacket[]>(
        'SELECT correo FROM compras WHERE correo = ?',
        [email]
      );

      if (compras.length > 0) {
        userFound = true;
        userRole = 'compras';
        userName = 'Personal de Compras';
      }
    }

    // Si no se encuentra el usuario, retornar éxito para no revelar si el email existe
    if (!userFound) {
      return NextResponse.json({
        success: true,
        message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Generar token y fecha de expiración (1 hora)
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en la base de datos
    await pool.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email, resetToken, expiresAt]
    );

    // Generar URL de restablecimiento
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Enviar correo electrónico
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@tuapp.com',
      to: email,
      subject: 'Recuperación de Contraseña - Sistema de Requisiciones',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Recuperación de Contraseña</h1>
          </div>
          <div style="padding: 20px; background-color: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hola, <strong>${userName}</strong></p>
            <p>Has solicitado restablecer tu contraseña para el Sistema de Requisiciones.</p>
            <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">
              Este enlace expirará en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
            </p>
            <p style="font-size: 14px; color: #666;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <span style="word-break: break-all; color: #2563eb;">${resetUrl}</span>
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>© ${new Date().getFullYear()} Sistema de Requisiciones. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña'
    });

  } catch (error) {
    console.error('Error en solicitud de recuperación:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
