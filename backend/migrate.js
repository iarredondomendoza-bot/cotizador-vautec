const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? {
    rejectUnauthorized: false
  } : false
});

const migrate = async () => {
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    
    // Verificar si las columnas existen
    const checkContactos = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='contactos'
    `);
    
    const checkEmails = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='clientes' AND column_name='emails'
    `);
    
    // Agregar columna contactos si no existe
    if (checkContactos.rows.length === 0) {
      console.log('📝 Agregando columna "contactos"...');
      await pool.query(`
        ALTER TABLE clientes 
        ADD COLUMN contactos JSONB DEFAULT '[]'
      `);
      console.log('✅ Columna "contactos" agregada correctamente');
    } else {
      console.log('ℹ️ Columna "contactos" ya existe');
    }
    
    // Agregar columna emails si no existe
    if (checkEmails.rows.length === 0) {
      console.log('📝 Agregando columna "emails"...');
      await pool.query(`
        ALTER TABLE clientes 
        ADD COLUMN emails JSONB DEFAULT '[]'
      `);
      console.log('✅ Columna "emails" agregada correctamente');
    } else {
      console.log('ℹ️ Columna "emails" ya existe');
    }
    
    // Actualizar registros existentes que tengan NULL
    console.log('📝 Actualizando registros con valores NULL...');
    await pool.query(`
      UPDATE clientes 
      SET contactos = '[]' 
      WHERE contactos IS NULL
    `);
    
    await pool.query(`
      UPDATE clientes 
      SET emails = '[]' 
      WHERE emails IS NULL
    `);
    
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

migrate();
