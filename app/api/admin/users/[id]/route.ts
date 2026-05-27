import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Update a user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();

  try {
    const { email, role, empresa, clave } = await request.json();
    const { id } = await params;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'El correo es requerido' },
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
      if (clave) {
        await connection.query(
          'UPDATE coordinador SET correo = ?, empresa = ?, clave = ? WHERE coordinador_id = ?',
          [email, empresa, clave, id]
        );
      } else {
        await connection.query(
          'UPDATE coordinador SET correo = ?, empresa = ? WHERE coordinador_id = ?',
          [email, empresa, id]
        );
      }
      
      const [updatedUser] = await connection.query<RowDataPacket[]>(
        'SELECT coordinador_id as id, correo, empresa FROM coordinador WHERE coordinador_id = ?',
        [id]
      );
      
      return NextResponse.json({
        success: true,
        data: updatedUser[0],
      });
      
    } else if (role === 'purchaser') {
      if (clave) {
        await connection.query(
          'UPDATE compras SET correo = ?, clave = ? WHERE usuario_id = ?',
          [email, clave, id]
        );
      } else {
        await connection.query(
          'UPDATE compras SET correo = ? WHERE usuario_id = ?',
          [email, id]
        );
      }
      
      const [updatedUser] = await connection.query<RowDataPacket[]>(
        'SELECT usuario_id as id, correo FROM compras WHERE usuario_id = ?',
        [id]
      );
      
      return NextResponse.json({
        success: true,
        data: updatedUser[0],
      });
      
    } else {
      return NextResponse.json(
        { success: false, message: 'Rol no válido' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al actualizar el usuario',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const { id } = await params;

    if (!role) {
      return NextResponse.json(
        { success: false, message: 'El rol es requerido' },
        { status: 400 }
      );
    }

    if (role === 'coordinator') {
      await connection.query(
        'DELETE FROM coordinador WHERE coordinador_id = ?',
        [id]
      );
    } else if (role === 'purchaser') {
      await connection.query(
        'DELETE FROM compras WHERE usuario_id = ?',
        [id]
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Rol no válido' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado correctamente',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error al eliminar el usuario',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
