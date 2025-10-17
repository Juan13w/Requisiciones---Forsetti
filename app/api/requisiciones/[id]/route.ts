import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

// Interfaz para el resultado de la actualización de la base de datos
interface UpdateResult {
  affectedRows: number;
}

/**
 * Maneja las solicitudes PUT para actualizar una requisición existente.
 * Acepta 'estado', 'comentarioRechazo', 'fechaUltimoRechazo', 'intentosRevision'.
 */

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const requisicionId = parseInt(params.id, 10);
  if (isNaN(requisicionId) || requisicionId <= 0) {
    return NextResponse.json({ success: false, error: 'ID de requisición no válido' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { 
      estado, 
      comentarioRechazo, 
      fechaUltimoRechazo, 
      intentosRevision,
      descripcion,
      cantidad,
      justificacion,
      justificacion_ti,
      proceso,
      imagenes
    } = body;

    if (!estado) {
      return NextResponse.json({ success: false, error: 'El campo estado es requerido' }, { status: 400 });
    }

    const validStates = ['pendiente', 'aprobada', 'rechazada', 'correccion', 'cerrada'];
    if (!validStates.includes(estado)) {
      return NextResponse.json({ success: false, error: `Estado no válido: ${estado}` }, { status: 400 });
    }

    // Construcción dinámica de la consulta SQL para evitar inyecciones y manejar campos opcionales
    const fieldsToUpdate: string[] = [];
    const values: (string | number | Buffer | null)[] = [];

    fieldsToUpdate.push('estado = ?');
    values.push(estado);

    // Mapear nombres del body (camelCase) a columnas reales (snake_case)
    if (comentarioRechazo !== undefined) {
      fieldsToUpdate.push('comentario_rechazo = ?');
      values.push(comentarioRechazo);
    }
    if (fechaUltimoRechazo !== undefined) {
      fieldsToUpdate.push('fecha_ultimo_rechazo = ?');
      values.push(fechaUltimoRechazo);
    }
    if (intentosRevision !== undefined) {
      fieldsToUpdate.push('intentos_revision = ?');
      values.push(intentosRevision);
    }

    // Campos editables al reenviar en corrección
    if (descripcion !== undefined) {
      fieldsToUpdate.push('descripcion = ?');
      values.push(descripcion);
    }
    if (cantidad !== undefined) {
      fieldsToUpdate.push('cantidad = ?');
      values.push(cantidad);
    }
    if (justificacion !== undefined) {
      fieldsToUpdate.push('justificacion = ?');
      values.push(justificacion);
    }
    if (justificacion_ti !== undefined) {
      fieldsToUpdate.push('justificacion_ti = ?');
      values.push(justificacion_ti);
    }
    if (proceso !== undefined) {
      fieldsToUpdate.push('proceso = ?');
      values.push(proceso);
    }

    // Actualizar los campos de la requisición
    values.push(requisicionId);
    const sql = `UPDATE requisicion SET ${fieldsToUpdate.join(', ')} WHERE requisicion_id = ?`;
    const result = await query<UpdateResult>(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'La requisición no fue encontrada o no se realizaron cambios' }, { status: 404 });
    }

    // Manejar múltiples archivos adjuntos si se proporcionan
    if (imagenes && Array.isArray(imagenes)) {
      try {
        // Procesar los archivos
        const archivos = [];
        
        for (const imagen of imagenes) {
          if (typeof imagen === 'string' && imagen.includes('base64,')) {
            const base64Part = imagen.split(',')[1];
            const buffer = Buffer.from(base64Part, 'base64');
            const nombreArchivo = `requisicion_${requisicionId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
            
            archivos.push({
              buffer,
              nombreArchivo,
              tipoMime: 'application/pdf',
              tamano: buffer.length
            });
          }
        }
        
        // Si hay archivos para guardar
        if (archivos.length > 0) {
          // Eliminar archivos existentes para esta requisición
          await query('DELETE FROM requisicion_archivos WHERE requisicion_id = ?', [requisicionId]);
          
          // Insertar los nuevos archivos
          for (const archivo of archivos) {
            await query(
              `INSERT INTO requisicion_archivos 
               (requisicion_id, nombre_archivo, ruta_archivo, tipo_mime, tamano)
               VALUES (?, ?, ?, ?, ?)`,
              [
                requisicionId,
                archivo.nombreArchivo,
                archivo.buffer,
                archivo.tipoMime,
                archivo.tamano
              ]
            );
          }
        }
      } catch (e) {
        console.warn('Error al procesar archivos adjuntos:', e);
        // Continuamos a pesar del error con los archivos
      }
    }

  

    // Registrar el cambio en el historial
    try {
      const comentarioParaHistorial = comentarioRechazo || 'Requisición actualizada';
      await query(
        'INSERT INTO requisicion_historial (requisicion_id, estado, comentario) VALUES (?, ?, ?)',
        [requisicionId, estado, comentarioParaHistorial]
      );
    } catch (histErr) {
      console.warn('No se pudo registrar historial de requisición:', histErr);
      // No interrumpimos el flujo por error de historial
    }

    // Obtener la requisición actualizada con los archivos adjuntos
    const updatedRows = await query(
      `SELECT r.*
       FROM requisicion r 
       WHERE r.requisicion_id = ?`,
      [requisicionId]
    ) as any[];
    
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No se pudo recuperar la requisición actualizada' }, { status: 404 });
    }
    // Obtener todos los archivos adjuntos
      const archivosResult = await query(
      'SELECT * FROM requisicion_archivos WHERE requisicion_id = ?',
      [requisicionId]
    );

const archivos = Array.isArray(archivosResult) ? archivosResult : [];

    
    // Procesar los archivos para incluir la URL de descarga
    const archivosProcesados = archivos.map((archivo: any) => {
      // Verificar si el archivo es un PDF
      const esPdf = archivo.ruta_archivo && archivo.ruta_archivo.length > 0 &&
                   archivo.ruta_archivo[0] === 0x25 && // %
                   archivo.ruta_archivo[1] === 0x50 && // P
                   archivo.ruta_archivo[2] === 0x44 && // D
                   archivo.ruta_archivo[3] === 0x46;   // F
      
      const tipoMime = esPdf ? 'application/pdf' : 'application/octet-stream';
      const base64Data = archivo.ruta_archivo.toString('base64');
      
      return {
        archivo_id: archivo.archivo_id,
        nombre_archivo: archivo.nombre_archivo,
        tipo_mime: tipoMime,
        tamano: archivo.tamano,
        fecha_creacion: archivo.fecha_creacion,
        url: `data:${tipoMime};base64,${base64Data}`,
        descargarUrl: `/api/requisiciones/${requisicionId}/archivos/${archivo.archivo_id}?download=true`
      };
    });
    
    // Crear la respuesta
    const respuesta = {
      ...updatedRows[0],
      archivos: archivosProcesados
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Requisición actualizada correctamente', 
      data: respuesta 
    });
  } catch (error) {
    console.error('❌ ERROR EN PUT /api/requisiciones/[id]');
    console.error('➡️ ID recibido:', requisicionId);
    
    // Verificar si es un error de parseo de JSON
    if (error instanceof SyntaxError) {
      console.error('➡️ Error de parseo JSON en el body');
      return NextResponse.json({ 
        success: false, 
        error: 'Cuerpo de la solicitud inválido (no es JSON válido)' 
      }, { status: 400 });
    }

    // Para otros tipos de errores, mostrar el mensaje de error
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el servidor';
    console.error('➡️ Error completo:', errorMessage);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor', 
      details: errorMessage 
    }, { status: 500 });
  }
}

/**
 * Maneja las solicitudes GET para obtener los detalles de una única requisición.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const requisicionId = parseInt(params.id, 10);
  if (isNaN(requisicionId) || requisicionId <= 0) {
    return NextResponse.json({ success: false, error: 'ID de requisición no válido' }, { status: 400 });
  }

  try {
    const [rows] = await query<any[]>(`
      SELECT 
        r.requisicion_id as id,
        r.consecutivo,
        r.empresa,
        r.fecha_solicitud as fechaSolicitud,
        r.nombre_solicitante as nombreSolicitante,
        r.proceso,
        r.justificacion,
        r.justificacion_ti,
        r.descripcion,
        r.cantidad,
        r.estado,
        r.fecha_creacion as fechaCreacion,
        r.intentos_revision as intentosRevision,
        COALESCE(r.comentario_rechazo, '') as comentarioRechazo,
        DATE_FORMAT(r.fecha_ultimo_rechazo, '%Y-%m-%d %H:%i:%s') as fechaUltimoRechazo,
        DATE_FORMAT(r.fecha_ultima_modificacion, '%Y-%m-%d %H:%i:%s') as fechaUltimaModificacion
      FROM requisicion r
      WHERE r.requisicion_id = ?
    `, [requisicionId]);
    
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Requisición no encontrada' }, { status: 404 });
    }
    
    // Crear un objeto con los datos de la requisición
    const requisicionData = {
      ...rows[0],
      // Aseguramos que estos campos siempre estén definidos
      comentarioRechazo: rows[0].comentarioRechazo || '',
      fechaUltimoRechazo: rows[0].fechaUltimoRechazo || null,
      justificacion_ti: rows[0].justificacion_ti || '' // Aseguramos que siempre tenga un valor
    };

    // Si hay archivos, los incluimos en la respuesta
    const [archivos] = await query<any[]>(
      'SELECT * FROM archivos_adjuntos WHERE requisicion_id = ?', 
      [requisicionId]
    );

    if (archivos && archivos.length > 0) {
      requisicionData.archivos = archivos;
    }

    return NextResponse.json({ 
      success: true, 
      data: requisicionData
    });
  } catch (error) {
    console.error('Error en GET /api/requisiciones/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor', 
      details: errorMessage 
    }, { status: 500 });
  }
}

/**
 * Maneja las solicitudes DELETE para eliminar una requisición.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  console.log('Solicitud DELETE recibida para la requisición ID:', params.id);
  const requisicionId = parseInt(params.id, 10);
  
  if (isNaN(requisicionId) || requisicionId <= 0) {
    console.error('ID de requisición no válido:', params.id);
    return NextResponse.json({ success: false, error: 'ID de requisición no válido' }, { status: 400 });
  }

  try {
    console.log('Verificando si la requisición existe...');
    // Verificar primero si la requisición existe
    const [existing] = await query<any[]>('SELECT 1 FROM requisicion WHERE requisicion_id = ?', [requisicionId]);
    
    if (existing.length === 0) {
      console.error('Requisición no encontrada con ID:', requisicionId);
      return NextResponse.json({ success: false, error: 'Requisición no encontrada' }, { status: 404 });
    }

    console.log('Eliminando historial de estados relacionado...');
    try {
      // Primero, eliminar el historial relacionado si existe
      await query('DELETE FROM historial_estados WHERE requisicion_id = ?', [requisicionId]);
      console.log('Historial de estados eliminado correctamente');
    } catch (historyError) {
      console.warn('No se pudo eliminar el historial de estados (puede que no exista):', historyError);
      // Continuamos aunque falle, ya que el historial podría no existir
    }
    
    console.log('Eliminando la requisición...');
    // Luego, eliminar la requisición
    const result = await query('DELETE FROM requisicion WHERE requisicion_id = ?', [requisicionId]) as unknown as { affectedRows: number };
    
    console.log('Resultado de la eliminación:', result);
    
    if (result.affectedRows === 0) {
      console.error('No se afectaron filas al intentar eliminar la requisición');
      return NextResponse.json({ success: false, error: 'No se pudo eliminar la requisición' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Requisición eliminada correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar la requisición:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar la requisición';
    return NextResponse.json({ 
      success: false, 
      error: 'Error al eliminar la requisición',
      details: errorMessage 
    }, { status: 500 });
  }
}

  