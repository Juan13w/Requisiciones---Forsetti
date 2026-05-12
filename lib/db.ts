import mysql, { Pool, PoolOptions, RowDataPacket } from 'mysql2/promise';
import { logger } from '@/utils/logger';

// Configuración de la conexión a la base de datos
const dbConfig: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'requisiciones_db',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  
  // Configuración del pool de conexiones
  waitForConnections: true,
  connectionLimit: 50, // Aumentar el límite de conexiones
  queueLimit: 100,     // Aumentar el límite de la cola
  
  // Configuración de reconexión
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 segundos
  
  // Timeouts
  connectTimeout: 10000,    // 10 segundos para conectar
  
  // Configuración de conexión
  charset: 'utf8mb4',
  timezone: 'local',
  multipleStatements: false, // Desactivar múltiples statements por seguridad
  
  // Configuración de SSL
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined,
  
  // Manejo de errores
  // Desactivar logs internos muy verbosos de mysql2.
  // Si algún día quieres verlos, define DB_DEBUG=true en tu .env
  debug: process.env.DB_DEBUG === 'true'
};

// Crear el pool de conexiones
const pool: Pool = mysql.createPool(dbConfig);

// Verificar la conexión al iniciar
async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    logger.info('Conexión exitosa a la base de datos');
    
    // Verificar si la base de datos existe, si no, crearla
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    // Usar la base de datos
    await connection.query(`USE \`${dbConfig.database}\``);
    
    // Crear la tabla de requisiciones si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`requisicion\` (
        \`requisicion_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`consecutivo\` VARCHAR(100) NOT NULL,
        \`empresa\` VARCHAR(100) NOT NULL,
        \`fecha_solicitud\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`nombre_solicitante\` TEXT NOT NULL,
        \`proceso\` VARCHAR(100) NOT NULL,
        \`justificacion\` TEXT NOT NULL,
        \`descripcion\` TEXT NOT NULL,
        \`cantidad\` INT NOT NULL,
        \`estado\` ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
        \`img\` LONGBLOB,
        \`fecha_creacion\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`fecha_actualizacion\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    logger.info('Base de datos y tablas verificadas/creadas correctamente');
    
  } catch (error) {
    logger.error('Error al inicializar la base de datos', error);
    throw error;
  } finally {
    if (connection) await connection.release();
  }
}

// Inicializar la base de datos al cargar el módulo
initializeDatabase().catch(error => {
  logger.error('Error crítico al inicializar la base de datos', error);
  // Considerar terminar la aplicación si no se puede conectar a la base de datos
  // process.exit(1);
});

// Exportar tipos
export interface Usuario extends RowDataPacket {
  id: number;
  email: string;
  rol: string;
}

// Función para ejecutar consultas con manejo de conexión
export async function query<T = any>(sql: string, values?: any, connection?: any): Promise<T> {
  const shouldRelease = !connection;
  let conn = connection;
  let retries = 3;
  
  while (retries > 0) {
    try {
      if (!conn) {
        conn = await pool.getConnection();
      }
      
      const [rows] = await conn.query(sql, values);
      return rows as unknown as T;
      
    } catch (error: any) {
      logger.error('Error en la consulta', {
        intentosRestantes: retries - 1,
        sql,
        values,
        mensaje: error.message,
        codigo: error.code,
      });
      
      // Si es un error de conexión, esperar un momento antes de reintentar
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'ETIMEDOUT') {
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
          continue;
        }
      }
      
      throw error;
      
    } finally {
      if (shouldRelease && conn) {
        try {
          await conn.release();
        } catch (releaseError) {
          logger.error('Error al liberar la conexión', releaseError);
        }
      }
    }
  }
  
  throw new Error('No se pudo ejecutar la consulta después de varios intentos');
}

// Función para ejecutar transacción
export async function withTransaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Error en la transacción', error);
    throw error;
  } finally {
    await connection.release();
  }
}

export default pool;
