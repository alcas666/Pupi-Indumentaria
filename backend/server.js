require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDb } = require('./src/db');

const authRoutes = require('./src/routes/auth');
const productosRoutes = require('./src/routes/productos');
const configRoutes = require('./src/routes/config');

async function main() {
  await initDb(); // crea tablas y el admin/config por defecto (async: Turso o archivo local)

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // API
  app.use('/api/auth', authRoutes);
  app.use('/api/productos', productosRoutes);
  app.use('/api/config', configRoutes);

  // Manejo de errores (ej: Multer con imagen muy pesada, o cualquier ruta que llame a next(err))
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  });

  // Frontend público (carpeta hermana de backend/)
  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));

  // Panel de administración: vive FUERA de frontend/, así nunca se sirve
  // por accidente en una ruta pública. Solo se puede acceder por la ruta
  // secreta definida en ADMIN_PATH (.env). Nadie que navegue la tienda
  // se va a topar con un link ni con la carpeta.
  const rutaAdminCruda = process.env.ADMIN_PATH || 'panel-83fk2';
  const ADMIN_PATH = '/' + rutaAdminCruda.replace(/^\/+/, '');
  const panelAdminPath = path.join(__dirname, '..', 'panel-admin');
  app.use(ADMIN_PATH, express.static(panelAdminPath));

  app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

  app.listen(PORT, () => {
    console.log(`🛍️  Pupi Indumentaria corriendo en http://localhost:${PORT}`);
    console.log(`🔐 Panel admin en http://localhost:${PORT}${ADMIN_PATH}`);
  });
}

main().catch(err => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
