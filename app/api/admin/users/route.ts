import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Get all users with their roles
export async function GET() {
  try {
    // Obtener la conexión de la piscina
    const connection = await pool.getConnection();
    
    try {
      // Obtener coordinadores
      const [coordinators] = await connection.query<RowDataPacket[]>(
        'SELECT coordinador_id as id, correo, empresa FROM coordinador'
      );
      
      // Obtener personal de compras
      const [purchasers] = await connection.query<RowDataPacket[]>(
        'SELECT usuario_id as id, correo FROM compras'
      );
      
      // Liberar la conexión
      connection.release();
      
      return NextResponse.json({
        success: true,
        data: {
          coordinators,
          purchasers,
        },
      });
    } catch (error) {
      // Asegurarse de liberar la conexión en caso de error
      if (connection) connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al obtener los usuarios',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Create a new user (coordinator or purchaser)
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  
  try {
    const { email, role, empresa } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { success: false, message: 'Correo y rol son requeridos' },
        { status: 400 }
      );
    }

    if (role === 'coordinator' && !empresa) {
      return NextResponse.json(
        { success: false, message: 'La empresa es requerida para coordinadores' },
        { status: 400 }
      );
    }

    if (role === 'coordinator') {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO coordinador (correo, empresa) VALUES (?, ?)',
        [email, empresa]
      );
      
      const [newCoordinator] = await connection.query<RowDataPacket[]>(
        'SELECT coordinador_id as id, correo, empresa FROM coordinador WHERE coordinador_id = ?',
        [result.insertId]
      );
      
      return NextResponse.json({
        success: true,
        data: newCoordinator[0],
      });
      
    } else if (role === 'purchaser') {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO compras (correo) VALUES (?)',
        [email]
      );
      
      const [newPurchaser] = await connection.query<RowDataPacket[]>(
        'SELECT usuario_id as id, correo FROM compras WHERE usuario_id = ?',
        [result.insertId]
      );
      
      return NextResponse.json({
        success: true,
        data: newPurchaser[0],
      });
      
    } else {
      return NextResponse.json(
        { success: false, message: 'Rol no válido' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al crear el usuario',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  } finally {
    // Asegurarse de liberar la conexión
    if (connection) connection.release();
  }
}
