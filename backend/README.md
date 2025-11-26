# Backend API - Generador de Cotizaciones VAUTEC

Backend API en Node.js + Express + PostgreSQL para el sistema de cotizaciones VAUTEC.

## Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Railway PostgreSQL

1. Ve a [Railway.app](https://railway.app) e inicia sesión
2. Crea un nuevo proyecto
3. Añade PostgreSQL desde la galería de servicios
4. Copia la **DATABASE_URL** de las variables de entorno

### 3. Crear archivo .env

Crea un archivo `.env` en la raíz del backend con:

```
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/basedatos
PORT=3000
```

### 4. Ejecutar servidor

**Desarrollo (con auto-reload):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

## Endpoints de la API

### Health Check
- `GET /health` - Verifica que el servidor esté funcionando

### Clientes
- `GET /api/clientes` - Obtener todos los clientes
- `POST /api/clientes` - Crear nuevo cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente

### Cotizaciones
- `GET /api/cotizaciones` - Obtener todas las cotizaciones
- `POST /api/cotizaciones` - Crear nueva cotización
- `PUT /api/cotizaciones/:id` - Actualizar cotización
- `DELETE /api/cotizaciones/:id` - Eliminar cotización

### Migración
- `POST /api/migrate` - Migrar datos desde localStorage

## Estructura de Base de Datos

### Tabla: clientes
```sql
id BIGINT PRIMARY KEY
nombre VARCHAR(255)
direccion TEXT
atencion VARCHAR(255)
telefono VARCHAR(50)
email VARCHAR(255)
fecha_creacion TIMESTAMP
fecha_modificacion TIMESTAMP
```

### Tabla: cotizaciones
```sql
id BIGINT PRIMARY KEY
numero VARCHAR(50) UNIQUE
revision VARCHAR(20)
fecha VARCHAR(20)
cliente_id BIGINT (FK → clientes)
cliente_nombre VARCHAR(255)
cliente_direccion TEXT
cliente_atencion VARCHAR(255)
cliente_telefono VARCHAR(50)
cliente_email VARCHAR(255)
proyecto_titulo TEXT
proyecto_subtitulo TEXT
descripcion_parrafo1 TEXT
justificacion TEXT
alcances JSONB
conceptos JSONB
tiempo_entrega TEXT
garantia_meses VARCHAR(10)
incluye JSONB
no_incluye JSONB
anticipo VARCHAR(10)
pago_final VARCHAR(10)
pago_final_condicion TEXT
terminos_condiciones TEXT
fecha_creacion TIMESTAMP
fecha_modificacion TIMESTAMP
```

## Despliegue en Railway

1. Desde el dashboard de Railway, crea un nuevo servicio desde GitHub
2. Selecciona el repositorio `cotizador-vautec`
3. Configura las variables de entorno:
   - `DATABASE_URL` (automática si usas PostgreSQL de Railway)
   - `PORT` (Railway lo asigna automáticamente)
4. Railway detectará automáticamente que es una app Node.js
5. El servicio se desplegará y estará disponible en una URL pública

## Migración de Datos

Para migrar datos existentes desde localStorage:

```javascript
// Desde la consola del navegador en el frontend
const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
const cotizaciones = JSON.parse(localStorage.getItem('cotizaciones') || '[]');

fetch('https://tu-api.railway.app/api/migrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientes, cotizaciones })
})
.then(res => res.json())
.then(data => console.log(data));
```

## CORS

El servidor tiene CORS habilitado para permitir peticiones desde cualquier origen. En producción, puedes restringirlo modificando la configuración de CORS en `server.js`.
