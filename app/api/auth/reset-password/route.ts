import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';
import { RowDataPacket } from 'mysql2';

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
    rejectUnauthorized: false,
  },
});

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'El token y la nueva contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Validar que la contraseña tenga al menos 6 caracteres
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar el token en la base de datos
    const [tokenRows] = await pool.query<RowDataPacket[]>(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (tokenRows.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    const { email } = tokenRows[0];

    // Buscar y actualizar la contraseña en las tres tablas
    let updated = false;
    let userRole = '';
    let userName = '';

    // 1. Intentar actualizar en administrador
    const [adminResult] = await pool.query<RowDataPacket[]>(
      'SELECT administrador_id as id FROM administrador WHERE correo = ?',
      [email]
    );

    if (adminResult.length > 0) {
      await pool.query(
        'UPDATE administrador SET clave = ? WHERE correo = ?',
        [newPassword, email]
      );
      updated = true;
      userRole = 'administrador';
      userName = 'Administrador';
    }

    // 2. Intentar actualizar en coordinador
    if (!updated) {
      const [coordinatorResult] = await pool.query<RowDataPacket[]>(
        'SELECT empresa FROM coordinador WHERE correo = ?',
        [email]
      );

      if (coordinatorResult.length > 0) {
        await pool.query(
          'UPDATE coordinador SET clave = ? WHERE correo = ?',
          [newPassword, email]
        );
        updated = true;
        userRole = 'coordinador';
        userName = `Coordinador - ${coordinatorResult[0].empresa}`;
      }
    }

    // 3. Intentar actualizar en compras
    if (!updated) {
      const [comprasResult] = await pool.query<RowDataPacket[]>(
        'SELECT correo FROM compras WHERE correo = ?',
        [email]
      );

      if (comprasResult.length > 0) {
        await pool.query(
          'UPDATE compras SET clave = ? WHERE correo = ?',
          [newPassword, email]
        );
        updated = true;
        userRole = 'compras';
        userName = 'Personal de Compras';
      }
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'No se encontró el usuario asociado a este token' },
        { status: 404 }
      );
    }

    // Eliminar el token usado
    await pool.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

    // Enviar correo de confirmación
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'no-reply@tuapp.com',
        to: email,
        subject: 'Contraseña Actualizada - Sistema de Requisiciones',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #10b981; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Contraseña Actualizada</h1>
            </div>
            <div style="padding: 20px; background-color: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Hola, <strong>${userName}</strong></p>
              <p>Tu contraseña ha sido actualizada exitosamente para el Sistema de Requisiciones.</p>
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>Información de seguridad:</strong><br>
                  Si no realizaste este cambio, por favor contacta inmediatamente al administrador del sistema.
                </p>
              </div>
              <p>Ya puedes iniciar sesión con tu nueva contraseña:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Iniciar Sesión
                </a>
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p>© ${new Date().getFullYear()} Sistema de Requisiciones. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error enviando correo de confirmación:', emailError);
      // No fallamos la petición si el correo no se envía
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en restablecimiento de contraseña:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    // Verificar si el token es válido y no ha expirado
    const [tokenRows] = await pool.query<RowDataPacket[]>(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (tokenRows.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: tokenRows[0].email,
      expiresAt: tokenRows[0].expires_at
    });

  } catch (error) {
    console.error('Error validando token:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
