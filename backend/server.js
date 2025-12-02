const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./database');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar OpenAI si hay API key
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// Middleware to disable compression
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Content-Encoding', 'identity');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.disable('x-powered-by');

// Disable compression - let Railway/Caddy handle it properly
app.set('etag', false);
app.set('json spaces', 0);

// Inicializar base de datos
initDB();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando correctamente' });
});

// ========== CLIENTES ==========

// Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY fecha_creacion DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Crear cliente
app.post('/api/clientes', async (req, res) => {
  const { id, nombre, direccion, atencion, telefono, email, contactos, emails } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO clientes (id, nombre, direccion, atencion, telefono, email, contactos, emails, fecha_modificacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [id, nombre, direccion, atencion, telefono, email, JSON.stringify(contactos || []), JSON.stringify(emails || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// Actualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, atencion, telefono, email, contactos, emails } = req.body;
  try {
    const result = await pool.query(
      `UPDATE clientes 
       SET nombre = $2, direccion = $3, atencion = $4, telefono = $5, email = $6, contactos = $7, emails = $8, fecha_modificacion = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, nombre, direccion, atencion, telefono, email, JSON.stringify(contactos || []), JSON.stringify(emails || [])]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Eliminar cliente
app.delete('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// ========== COTIZACIONES ==========

// Endpoint de migración (solo para desarrollo/mantenimiento)
app.post('/api/migrate', async (req, res) => {
  try {
    console.log('🔄 Ejecutando migración de base de datos...');
    
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
    
    const results = [];
    
    // Agregar columna contactos si no existe
    if (checkContactos.rows.length === 0) {
      await pool.query(`
        ALTER TABLE clientes 
        ADD COLUMN contactos JSONB DEFAULT '[]'
      `);
      results.push('✅ Columna "contactos" agregada');
    } else {
      results.push('ℹ️ Columna "contactos" ya existe');
    }
    
    // Agregar columna emails si no existe
    if (checkEmails.rows.length === 0) {
      await pool.query(`
        ALTER TABLE clientes 
        ADD COLUMN emails JSONB DEFAULT '[]'
      `);
      results.push('✅ Columna "emails" agregada');
    } else {
      results.push('ℹ️ Columna "emails" ya existe');
    }
    
    // Actualizar registros NULL
    await pool.query(`UPDATE clientes SET contactos = '[]' WHERE contactos IS NULL`);
    await pool.query(`UPDATE clientes SET emails = '[]' WHERE emails IS NULL`);
    results.push('✅ Registros actualizados');
    
    console.log('✅ Migración completada');
    res.json({ success: true, results });
  } catch (error) {
    console.error('❌ Error en migración:', error);
    res.status(500).json({ error: 'Error en migración', details: error.message });
  }
});

// Obtener todas las cotizaciones
app.get('/api/cotizaciones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cotizaciones ORDER BY fecha_creacion DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

// Crear cotización
app.post('/api/cotizaciones', async (req, res) => {
  console.log('=== POST /api/cotizaciones ===');
  console.log('Body completo:', JSON.stringify(req.body, null, 2));
  
  const {
    id, numero, revision, fecha, clienteId, clienteNombre, clienteDireccion,
    clienteAtencion, clienteTelefono, clienteEmail, proyectoTitulo, proyectoSubtitulo,
    descripcionParrafo1, justificacion, alcances, conceptos, tiempoEntrega,
    garantiaMeses, incluye, noIncluye, anticipo, pagoFinal, pagoFinalCondicion,
    terminosCondiciones
  } = req.body;

  console.log('Campos clave:');
  console.log('- id:', id, typeof id);
  console.log('- numero:', numero);
  console.log('- alcances:', Array.isArray(alcances) ? `Array(${alcances.length})` : typeof alcances);
  console.log('- conceptos:', Array.isArray(conceptos) ? `Array(${conceptos.length})` : typeof conceptos);

  try {
    // Verificar si el número ya existe
    const existente = await pool.query(
      'SELECT id FROM cotizaciones WHERE numero = $1',
      [numero]
    );

    if (existente.rows.length > 0) {
      console.log('⚠️ Número de cotización duplicado:', numero);
      return res.status(409).json({ 
        error: 'Número de cotización duplicado',
        message: `El número ${numero} ya existe. Por favor genera un nuevo número.`,
        code: 'DUPLICATE_NUMERO'
      });
    }

    const result = await pool.query(
      `INSERT INTO cotizaciones (
        id, numero, revision, fecha, cliente_id, cliente_nombre, cliente_direccion,
        cliente_atencion, cliente_telefono, cliente_email, proyecto_titulo, proyecto_subtitulo,
        descripcion_parrafo1, justificacion, alcances, conceptos, tiempo_entrega,
        garantia_meses, incluye, no_incluye, anticipo, pago_final, pago_final_condicion,
        terminos_condiciones, fecha_creacion, fecha_modificacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW())
      RETURNING *`,
      [
        id, numero, revision, fecha, clienteId, clienteNombre, clienteDireccion,
        clienteAtencion, clienteTelefono, clienteEmail, proyectoTitulo, proyectoSubtitulo,
        descripcionParrafo1, justificacion, JSON.stringify(alcances), JSON.stringify(conceptos),
        tiempoEntrega, garantiaMeses, JSON.stringify(incluye), JSON.stringify(noIncluye),
        anticipo, pagoFinal, pagoFinalCondicion, terminosCondiciones
      ]
    );
    console.log('✅ Cotización creada exitosamente, ID:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error al crear cotización');
    console.error('Mensaje:', error.message);
    console.error('Detail:', error.detail);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al crear cotización',
      message: error.message,
      detail: error.detail,
      code: error.code
    });
  }
});

// Actualizar cotización
app.put('/api/cotizaciones/:id', async (req, res) => {
  const { id } = req.params;
  const {
    numero, revision, fecha, clienteId, clienteNombre, clienteDireccion,
    clienteAtencion, clienteTelefono, clienteEmail, proyectoTitulo, proyectoSubtitulo,
    descripcionParrafo1, justificacion, alcances, conceptos, tiempoEntrega,
    garantiaMeses, incluye, noIncluye, anticipo, pagoFinal, pagoFinalCondicion,
    terminosCondiciones
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE cotizaciones SET
        numero = $2, revision = $3, fecha = $4, cliente_id = $5, cliente_nombre = $6,
        cliente_direccion = $7, cliente_atencion = $8, cliente_telefono = $9,
        cliente_email = $10, proyecto_titulo = $11, proyecto_subtitulo = $12,
        descripcion_parrafo1 = $13, justificacion = $14, alcances = $15, conceptos = $16,
        tiempo_entrega = $17, garantia_meses = $18, incluye = $19, no_incluye = $20,
        anticipo = $21, pago_final = $22, pago_final_condicion = $23,
        terminos_condiciones = $24, fecha_modificacion = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id, numero, revision, fecha, clienteId, clienteNombre, clienteDireccion,
        clienteAtencion, clienteTelefono, clienteEmail, proyectoTitulo, proyectoSubtitulo,
        descripcionParrafo1, justificacion, JSON.stringify(alcances), JSON.stringify(conceptos),
        tiempoEntrega, garantiaMeses, JSON.stringify(incluye), JSON.stringify(noIncluye),
        anticipo, pagoFinal, pagoFinalCondicion, terminosCondiciones
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// Eliminar cotización
app.delete('/api/cotizaciones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cotizaciones WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    res.json({ message: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

// ========== MIGRACIÓN ==========

// Endpoint para migrar datos desde localStorage
app.post('/api/migrate', async (req, res) => {
  const { clientes, cotizaciones } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Migrar clientes
    for (const cliente of clientes) {
      await client.query(
        `INSERT INTO clientes (id, nombre, direccion, atencion, telefono, email, fecha_modificacion)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [cliente.id, cliente.nombre, cliente.direccion, cliente.atencion, cliente.telefono, cliente.email]
      );
    }

    // Migrar cotizaciones
    for (const cot of cotizaciones) {
      await client.query(
        `INSERT INTO cotizaciones (
          id, numero, revision, fecha, cliente_id, cliente_nombre, cliente_direccion,
          cliente_atencion, cliente_telefono, cliente_email, proyecto_titulo, proyecto_subtitulo,
          descripcion_parrafo1, justificacion, alcances, conceptos, tiempo_entrega,
          garantia_meses, incluye, no_incluye, anticipo, pago_final, pago_final_condicion,
          terminos_condiciones, fecha_modificacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW())
        ON CONFLICT (numero) DO NOTHING`,
        [
          cot.id, cot.numero, cot.revision, cot.fecha, cot.clienteId, cot.clienteNombre,
          cot.clienteDireccion, cot.clienteAtencion, cot.clienteTelefono, cot.clienteEmail,
          cot.proyectoTitulo, cot.proyectoSubtitulo, cot.descripcionParrafo1, cot.justificacion,
          JSON.stringify(cot.alcances || []), JSON.stringify(cot.conceptos || []),
          cot.tiempoEntrega, cot.garantiaMeses, JSON.stringify(cot.incluye || []),
          JSON.stringify(cot.noIncluye || []), cot.anticipo, cot.pagoFinal,
          cot.pagoFinalCondicion, cot.terminosCondiciones
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Migración completada exitosamente', clientesMigrados: clientes.length, cotizacionesMigradas: cotizaciones.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al migrar datos:', error);
    res.status(500).json({ error: 'Error al migrar datos' });
  } finally {
    client.release();
  }
});

// ========== IA ==========

app.post('/api/generar-proyecto-completo', async (req, res) => {
  const { descripcion } = req.body;
  
  if (!openai) {
    return res.status(503).json({ 
      error: 'OpenAI no configurado' 
    });
  }
  
  try {
    const prompt = `${descripcion}

Responde SOLO con un JSON válido con esta estructura:
{
  "titulo": "TÍTULO EN MAYÚSCULAS",
  "subtitulo": "Subtítulo descriptivo",
  "descripcion": "Descripción técnica detallada del proyecto",
  "justificacion": "Justificación técnica y económica del proyecto",
  "alcances": [
    {"item": "Descripción del alcance", "incluido": true},
    {"item": "Otro alcance", "incluido": false}
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un experto en automatización industrial. Respondes SOLO en formato JSON válido." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    let respuesta = completion.choices[0].message.content.trim();
    
    // Limpiar markdown
    if (respuesta.startsWith('```json')) {
      respuesta = respuesta.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (respuesta.startsWith('```')) {
      respuesta = respuesta.replace(/```\n?/g, '');
    }
    
    const resultado = JSON.parse(respuesta);
    res.json(resultado);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
