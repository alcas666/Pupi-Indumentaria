const express = require('express');
const router = express.Router();
const { query, run } = require('../db');
const verificarToken = require('../middleware/auth');

// GET /api/config -> pública, la usa el frontend para armar el link de WhatsApp
router.get('/', async (req, res, next) => {
  try {
    const filas = await query('SELECT * FROM configuracion');
    const config = {};
    filas.forEach(f => { config[f.clave] = f.valor; });
    res.json(config);
  } catch (err) { next(err); }
});

// PUT /api/config -> el admin puede cambiar el número de WhatsApp, nombre, mensaje
router.put('/', verificarToken, async (req, res, next) => {
  try {
    const cambios = req.body;
    for (const [clave, valor] of Object.entries(cambios)) {
      await run(`
        INSERT INTO configuracion (clave, valor) VALUES (?, ?)
        ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
      `, [clave, String(valor)]);
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
