const mysql = require('mysql2/promise');

async function verificarAprobador() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'requisiciones_db'
  });

  try {
    console.log('=== VERIFICACIÓN DE CAMPO APROBADOR ===\n');

    // 1. Verificar si hay campos de aprobador en la tabla requisicion
    console.log('1. CAMPOS EN TABLA REQUISICION:');
    const [requisicionFields] = await connection.execute('DESCRIBE requisicion');
    console.table(requisicionFields);

    // 2. Verificar si hay campos de aprobador en la tabla historial
    console.log('\n2. CAMPOS EN TABLA HISTORIAL:');
    const [historialFields] = await connection.execute('DESCRIBE requisicion_historial');
    console.table(historialFields);

    // 3. Buscar requisiciones aprobadas recientes
    console.log('\n3. REQUISICIONES APROBADAS RECIENTES:');
    try {
      const [aprobadas] = await connection.execute(`
        SELECT 
          requisicion_id,
          consecutivo,
          estado,
          aprobado_por,
          fecha_solicitud
        FROM requisicion 
        WHERE estado = 'aprobada' 
        ORDER BY fecha_solicitud DESC 
        LIMIT 5
      `);
      console.table(aprobadas);
    } catch (err) {
      console.log('Error al consultar requisiciones aprobadas:', err.message);
    }

    // 4. Buscar historial de aprobaciones recientes
    console.log('\n4. HISTORIAL DE APROBACIONES RECIENTES:');
    try {
      const [historialAprobaciones] = await connection.execute(`
        SELECT 
          id,
          requisicion_id,
          estado,
          aprobador_nombre,
          comentario,
          creado_en
        FROM requisicion_historial 
        WHERE estado = 'aprobada' 
        ORDER BY creado_en DESC 
        LIMIT 5
      `);
      console.table(historialAprobaciones);
    } catch (err) {
      console.log('Error al consultar historial:', err.message);
    }

    // 5. Verificar todas las requisiciones para ver el estado del campo aprobado_por
    console.log('\n5. ESTADO DEL CAMPO APROBADO_POR EN TODAS LAS REQUISICIONES:');
    try {
      const [todas] = await connection.execute(`
        SELECT 
          requisicion_id,
          consecutivo,
          estado,
          aprobado_por,
          CASE 
            WHEN aprobado_por IS NULL THEN 'NULL'
            WHEN aprobado_por = '' THEN 'VACÍO'
            ELSE aprobado_por
          END as estado_aprobado_por
        FROM requisicion 
        ORDER BY requisicion_id DESC 
        LIMIT 10
      `);
      console.table(todas);
    } catch (err) {
      console.log('Error al consultar todas las requisiciones:', err.message);
    }

  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await connection.end();
  }
}

verificarAprobador();
