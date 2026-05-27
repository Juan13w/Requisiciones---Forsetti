import { type NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

// Función para formatear la fecha al formato de la base de datos (YYYY-MM-DDTHH:mm:ss.SSSZ)
function formatDate(dateString: string): string {
  try {
    // Si ya está en formato ISO, devolver directamente
    if (dateString.includes('T') && dateString.endsWith('Z')) {
      return dateString;
    }
    
    // Si ya está en formato YYYY-MM-DD, agregar hora media noche UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return new Date(dateString + 'T00:00:00.000Z').toISOString();
    }
    
    // Intentar con el constructor de Date
    let date = new Date(dateString);
    
    // Si falla, intentar con formato DD/MM/YYYY
    if (isNaN(date.getTime()) && dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      throw new Error('Fecha inválida');
    }
    
    return date.toISOString();
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    throw new Error(`Formato de fecha inválido: ${dateString}. Use DD/MM/YYYY o YYYY-MM-DD`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      empleado_email,
      fecha,
      hora_entrada,
      hora_salida,
      break1_salida,
      break1_entrada,
      almuerzo_salida,
      almuerzo_entrada,
      break2_salida,
      break2_entrada
    } = await request.json();

    if (!empleado_email || !fecha) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // Validar y formatear la fecha
    const fechaFormateada = formatDate(fecha);
    
    const result = await pool.execute(
      `INSERT INTO historial_turnos (
        empleado_email, fecha, hora_entrada, hora_salida,
        break1_salida, break1_entrada, almuerzo_salida, almuerzo_entrada,
        break2_salida, break2_entrada
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empleado_email,
        fechaFormateada,
        hora_entrada || null,
        hora_salida || null,
        break1_salida || null,
        break1_entrada || null,
        almuerzo_salida || null,
        almuerzo_entrada || null,
        break2_salida || null,
        break2_entrada || null
      ]
    );
    
    return NextResponse.json({
      success: true, 
      message: 'Nuevo registro creado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al insertar nuevo registro:', error);
    return NextResponse.json({ 
      error: 'Error al crear nuevo registro de horario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
