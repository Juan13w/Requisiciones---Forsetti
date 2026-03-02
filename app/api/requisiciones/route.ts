import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { enviarNotificacionRequisicion } from '@/services/emailService';

export async function POST(request: Request) {
  let connection = null;
  
  try {
    const formData = await request.json();

    // Validar datos requeridos
    if (
      !formData.consecutivo || !formData.empresa || !formData.nombreSolicitante ||
      !formData.proceso || !formData.justificacion || !formData.descripcion ||
      typeof formData.cantidad === 'undefined'
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Procesar múltiples archivos PDF si existen
    const archivos = [];
    
    if (formData.imagenes && Array.isArray(formData.imagenes)) {
      for (const imagen of formData.imagenes) {
        if (typeof imagen === 'string' && imagen.includes('base64,')) {
          const base64Data = imagen.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const nombreArchivo = `requisicion_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
          
          archivos.push({
            buffer,
            nombreArchivo,
            tipoMime: 'application/pdf',
            tamano: buffer.length
          });
        }
      }
    }

    // Asegurar que el consecutivo sea texto
    const consecutivo = formData.consecutivo?.toString() || '';

    // Datos del usuario que crea la requisición
    let usuarioData = null;
    let coordinadorId = null;
    let nombreSolicitante = '';

    if (formData.usuarioData) {
      usuarioData = typeof formData.usuarioData === 'string'
        ? JSON.parse(formData.usuarioData)
        : formData.usuarioData;

      coordinadorId = usuarioData.coordinador_id || usuarioData.id;
      nombreSolicitante = usuarioData.email || '';
    }

    if (!coordinadorId) {
      return NextResponse.json(
        { error: 'No se pudo identificar al coordinador' },
        { status: 400 }
      );
    }

    console.log('📦 Creando requisición para coordinador ID:', coordinadorId);

    // Iniciar transacción
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insertar la requisición sin el campo PDF
      const [result] = await connection.execute(
        `INSERT INTO requisicion 
         (consecutivo, empresa, fecha_solicitud, nombre_solicitante, proceso, justificacion, justificacion_ti, descripcion, cantidad, coordinador_id)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
          consecutivo,
          formData.empresa || '',
          formData.nombreSolicitante || '',
          formData.proceso || '',
          formData.justificacion || '',
          formData.justificacion_ti || '',
          formData.descripcion || '',
          Number(formData.cantidad) || 1,
          coordinadorId
        ]
      ) as any;

      // Obtener ID insertado
      let insertId: number | null = result?.insertId || null;
      if (!insertId) {
        const [rows] = await connection.query('SELECT LAST_INSERT_ID() as id');
        insertId = Array.isArray(rows) && rows[0] ? (rows[0] as any).id : null;
      }

      // Guardar todos los archivos en la tabla requisicion_archivos
      if (archivos.length > 0 && insertId) {
        for (const archivo of archivos) {
          await connection.execute(
            `INSERT INTO requisicion_archivos 
             (requisicion_id, nombre_archivo, ruta_archivo, tipo_mime, tamano)
             VALUES (?, ?, ?, ?, ?)`,
            [
              insertId,
              archivo.nombreArchivo,
              archivo.buffer,
              archivo.tipoMime,
              archivo.tamano
            ]
          );
        }
      }

      // Registrar historial
      try {
        const estadoInicial = formData.estado || 'pendiente';
        const comentarioInicial = 'Requisición creada';
        await connection.execute(
          'INSERT INTO requisicion_historial (requisicion_id, estado, comentario, usuario) VALUES (?, ?, ?, ?)',
          [insertId, estadoInicial, comentarioInicial, nombreSolicitante || null]
        );
      } catch (histErr) {
        console.warn('⚠️ No se pudo registrar historial:', histErr);
        throw histErr;
      }

      // Confirmar la transacción
      await connection.commit();

      // Enviar notificación asíncronamente (no bloquea la respuesta)
      if (process.env.NOTIFICATION_EMAIL && insertId) {
        // Liberar la conexión antes de enviar el correo
        connection.release();
        connection = null;

        // Enviar correo en background sin bloquear la respuesta
        enviarNotificacionRequisicionAsync(process.env.NOTIFICATION_EMAIL, insertId);
      } else if (connection) {
        connection.release();
        connection = null;
      }

      return NextResponse.json({ success: true, id: insertId });
    } catch (error) {
      // Revertir la transacción en caso de error
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      
      console.error('❌ Error al guardar requisición:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor al guardar la requisición' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error en la función POST:', error);
    
    // Asegurar liberar la conexión si existe
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (releaseError) {
        console.error('❌ Error liberando conexión:', releaseError);
      }
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función asíncrona para enviar notificación sin bloquear
async function enviarNotificacionRequisicionAsync(email: string, requisicionId: number) {
  try {
    // Obtener datos de la requisición para el correo
    const tempConnection = await pool.getConnection();
    
    try {
      const [requisicion] = await tempConnection.query(
        'SELECT * FROM requisicion WHERE requisicion_id = ?',
        [requisicionId]
      ) as any[];

      if (requisicion && requisicion.length > 0) {
        const reqData = requisicion[0];

        await enviarNotificacionRequisicion(email, {
          titulo: `Requisición ${reqData.consecutivo}`,
          descripcion: reqData.descripcion || 'Sin descripción adicional',
          fecha_creacion: reqData.fecha_solicitud,
          creado_por: reqData.nombre_solicitante || 'Usuario desconocido'
        });
        
        console.log('📧 Correo de notificación enviado');
      }
    } finally {
      tempConnection.release();
    }
  } catch (emailError) {
    console.error('❌ Error al enviar correo en background:', emailError);
    // No relanzamos el error para no afectar la respuesta principal
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coordinadorId = searchParams.get('coordinadorId');

    let query = `
      SELECT 
        r.requisicion_id, r.consecutivo, r.empresa, r.fecha_solicitud, 
        r.nombre_solicitante, r.proceso, r.justificacion, r.justificacion_ti,
        r.descripcion, r.cantidad, r.estado,
        r.comentario_rechazo as comentarioRechazo,
        r.comentario_rechazo_f as comentarioRechazoFinal,
        r.intentos_revision, r.fecha_ultimo_rechazo, r.coordinador_id, 
        c.correo as coordinador_email, c.empresa as coordinador_empresa
      FROM requisicion r
      LEFT JOIN coordinador c ON r.coordinador_id = c.coordinador_id
    `;
    const params: any[] = [];

    if (coordinadorId) {
      query += ' WHERE r.coordinador_id = ?';
      params.push(coordinadorId);
    }

    query += ' ORDER BY requisicion_id DESC';

    const [rows] = await pool.query(query, params);

    // Obtener los archivos adjuntos para cada requisición
    const requisitionIds = (rows as any[]).map(r => r.requisicion_id);
    
    const archivosPorRequisicion: Record<number, Array<{
      archivo_id: number;
      requisicion_id: number;
      nombre_archivo: string;
      ruta_archivo: Buffer;
      tipo_mime: string;
      tamano: number;
      fecha_subida: Date;
    }>> = {};
    
    if (requisitionIds.length > 0) {
      const [archivos] = await pool.query(
        'SELECT * FROM requisicion_archivos WHERE requisicion_id IN (?)',
        [requisitionIds]
      ) as [any[], any];
      
      // Organizar archivos por requisición
      (archivos as Array<{
        archivo_id: number;
        requisicion_id: number;
        nombre_archivo: string;
        ruta_archivo: Buffer;
        tipo_mime: string;
        tamano: number;
        fecha_subida: Date;
      }>).forEach(archivo => {
        if (!archivosPorRequisicion[archivo.requisicion_id]) {
          archivosPorRequisicion[archivo.requisicion_id] = [];
        }
        archivosPorRequisicion[archivo.requisicion_id].push(archivo);
      });
    }

    const requisitions = (rows as any[]).map(row => {
      const fechaSolicitud = row.fecha_solicitud
        ? new Date(row.fecha_solicitud).toISOString()
        : new Date().toISOString();

      // No incluir imágenes en Base64 para evitar errores de hidratación
      // Los archivos se obtendrán bajo demanda
      const archivos = archivosPorRequisicion[row.requisicion_id]?.map(archivo => ({
        archivo_id: archivo.archivo_id,
        nombre_archivo: archivo.nombre_archivo,
        tipo_mime: archivo.tipo_mime,
        tamano: archivo.tamano,
        fecha_creacion: archivo.fecha_subida, // Mapear fecha_subida -> fecha_creacion
        url: `/api/archivos/${archivo.archivo_id}`
      })) || [];

      return {
        id: row.requisicion_id.toString(),
        requisicion_id: row.requisicion_id,
        consecutivo: row.consecutivo?.toString() || '',
        empresa: row.empresa || '',
        fechaSolicitud: fechaSolicitud,
        nombreSolicitante: row.nombre_solicitante || '',
        proceso: row.proceso || '',
        justificacion: row.justificacion || '',
        justificacion_ti: row.justificacion_ti || '',
        descripcion: row.descripcion || '',
        cantidad: Number(row.cantidad) || 1,
        // No incluir imágenes para reducir tamaño de respuesta
        imagenes: [],
        estado: row.estado || 'pendiente',
        comentarioRechazo: row.comentarioRechazo || row.comentario_rechazo || '',
        comentarioRechazoFinal: row.comentarioRechazoFinal || row.comentario_rechazo_f || '',
        fechaCreacion: row.fecha_solicitud
          ? new Date(row.fecha_solicitud).getTime()
          : Date.now(),
        archivos: archivos
      };
    });

    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('❌ Error al obtener requisiciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener las requisiciones' },
      { status: 500 }
    );
  }
}
