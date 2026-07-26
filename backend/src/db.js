const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Si hay credenciales de Turso en el .env, se conecta a la base en la nube.
// Si no, usa un archivo SQLite local (comodo para probar en tu PC).
let client;
if (process.env.TURSO_DATABASE_URL) {
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
} else {
  const dbDir = path.join(__dirname, '..', 'database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  client = createClient({ url: `file:${path.join(dbDir, 'pupi.db')}` });
}

// --- Helpers para no repetir la conversión de resultados en cada ruta ---
async function query(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows.map(fila => ({ ...fila }));
}

async function queryOne(sql, args = []) {
  const filas = await query(sql, args);
  return filas[0] || null;
}

async function run(sql, args = []) {
  const res = await client.execute({ sql, args });
  return {
    changes: Number(res.rowsAffected),
    lastInsertRowid: Number(res.lastInsertRowid)
  };
}

// --- Creación de tablas + datos iniciales (admin y configuración) ---
async function initDb() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      descripcion TEXT,
      precio REAL NOT NULL DEFAULT 0,
      descuento INTEGER NOT NULL DEFAULT 0,
      destacado INTEGER NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1,
      creado_en TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS producto_imagenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      archivo TEXT NOT NULL,
      public_id TEXT,
      orden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    );
  `);

  // Admin por defecto (solo si la tabla está vacía)
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'CambiarPass123';
  const adminExistente = await queryOne('SELECT * FROM admins WHERE username = ?', [adminUser]);
  if (!adminExistente) {
    const hash = bcrypt.hashSync(adminPass, 10);
    await run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
    console.log(`✔ Admin creado -> usuario: "${adminUser}" / clave: "${adminPass}" (cambiala luego desde .env)`);
  }

  // Configuración inicial (WhatsApp, nombre de tienda, mensaje)
  const configPorDefecto = {
    whatsapp_numero: process.env.WHATSAPP_NUMERO || '5493515646612',
    nombre_tienda: 'PUPI INDUMENTARIA',
    mensaje_saludo: 'Hola Pupi! Estuve visitando la página, me interesa comprar estos productos:'
  };
  for (const [clave, valor] of Object.entries(configPorDefecto)) {
    const existe = await queryOne('SELECT * FROM configuracion WHERE clave = ?', [clave]);
    if (!existe) await run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', [clave, valor]);
  }
}

module.exports = { client, query, queryOne, run, initDb };

