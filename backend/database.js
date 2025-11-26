const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Crear tablas si no existen
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id BIGINT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        direccion TEXT,
        atencion VARCHAR(255),
        telefono VARCHAR(50),
        email VARCHAR(255),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id BIGINT PRIMARY KEY,
        numero VARCHAR(50) NOT NULL UNIQUE,
        revision VARCHAR(20),
        fecha VARCHAR(20),
        cliente_id BIGINT REFERENCES clientes(id),
        cliente_nombre VARCHAR(255),
        cliente_direccion TEXT,
        cliente_atencion VARCHAR(255),
        cliente_telefono VARCHAR(50),
        cliente_email VARCHAR(255),
        proyecto_titulo TEXT,
        proyecto_subtitulo TEXT,
        descripcion_parrafo1 TEXT,
        justificacion TEXT,
        alcances JSONB,
        conceptos JSONB,
        tiempo_entrega TEXT,
        garantia_meses VARCHAR(10),
        incluye JSONB,
        no_incluye JSONB,
        anticipo VARCHAR(10),
        pago_final VARCHAR(10),
        pago_final_condicion TEXT,
        terminos_condiciones TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion TIMESTAMP
      );
    `);

    console.log('✅ Tablas creadas correctamente');
  } catch (error) {
    console.error('❌ Error al crear tablas:', error);
  }
};

module.exports = { pool, initDB };
