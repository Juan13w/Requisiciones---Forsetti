const mysql = require('mysql2/promise');

async function probarAprobacion() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'requisiciones_db'
  });

  try {
    console.log('=== PROBANDO ACTUALIZACIÓN DE APROBADOR ===\n');

    // 1. Buscar una requisición pendiente para probar
    const [pendientes] = await connection.execute(`
      SELECT requisicion_id, consecutivo, estado 
      FROM requisicion 
      WHERE estado = 'pendiente' 
      LIMIT 1
    `);

    if (pendientes.length === 0) {
      console.log('No hay requisiciones pendientes para probar');
      return;
    }

    const req = pendientes[0];
    console.log(`Probando con requisición: ${req.consecutivo} (ID: ${req.requisicion_id})`);

    // 2. Simular aprobación con usuario de prueba
    const usuarioPrueba = 'usuario.prueba@solucionescorp.com.co';
    
    console.log(`Actualizando estado a 'aprobada' con usuario: ${usuarioPrueba}`);
    
    const [result] = await connection.execute(`
      UPDATE requisicion 
      SET estado = 'aprobada', aprobado_por = ? 
      WHERE requisicion_id = ?
    `, [usuarioPrueba, req.requisicion_id]);

    console.log(`Filas afectadas: ${result.affectedRows}`);

    // 3. Agregar al historial
    await connection.execute(`
      INSERT INTO requisicion_historial (requisicion_id, estado, comentario, aprobador_nombre) 
      VALUES (?, 'aprobada', 'Prueba de actualización de aprobador', ?)
    `, [req.requisicion_id, usuarioPrueba]);

    console.log('Historial actualizado');

    // 4. Verificar resultado
    const [verificacion] = await connection.execute(`
      SELECT requisicion_id, consecutivo, estado, aprobado_por 
      FROM requisicion 
      WHERE requisicion_id = ?
    `, [req.requisicion_id]);

    console.log('\n=== RESULTADO ===');
    console.table(verificacion);

    // 5. Verificar historial
    const [historial] = await connection.execute(`
      SELECT id, requisicion_id, estado, aprobador_nombre, creado_en 
      FROM requisicion_historial 
      WHERE requisicion_id = ? 
      ORDER BY creado_en DESC 
      LIMIT 3
    `, [req.requisicion_id]);

    console.log('\n=== HISTORIAL ===');
    console.table(historial);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

probarAprobacion();
