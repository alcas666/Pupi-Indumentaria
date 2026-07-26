const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const verificarToken = require('../middleware/auth');
const { upload, subirImagen, borrarImagen } = require('../middleware/upload');
const { generarCodigo } = require('../utils/codigo');

async function obtenerProductoCompleto(id) {
  const producto = await queryOne('SELECT * FROM productos WHERE id = ?', [id]);
  if (!producto) return null;
  const imagenes = await query('SELECT id, archivo, public_id FROM producto_imagenes WHERE producto_id = ? ORDER BY orden', [id]);
  return {
    ...producto,
    imagenes: imagenes.map(i => ({ id: i.id, url: i.archivo }))
  };
}

// GET /api/productos -> catálogo público (solo activos)
router.get('/', async (req, res, next) => {
  try {
    const { categoria, subcategoria } = req.query;
    let sql = 'SELECT * FROM productos WHERE activo = 1';
    const params = [];
    if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
    if (subcategoria) { sql += ' AND subcategoria = ?'; params.push(subcategoria); }
    sql += ' ORDER BY creado_en DESC';

    const productos = await query(sql, params);
    const completos = await Promise.all(productos.map(p => obtenerProductoCompleto(p.id)));
    res.json(completos);
  } catch (err) { next(err); }
});

// GET /api/productos/admin/todos -> admin ve activos e inactivos
router.get('/admin/todos', verificarToken, async (req, res, next) => {
  try {
    const productos = await query('SELECT * FROM productos ORDER BY creado_en DESC');
    const completos = await Promise.all(productos.map(p => obtenerProductoCompleto(p.id)));
    res.json(completos);
  } catch (err) { next(err); }
});

// GET /api/productos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const producto = await obtenerProductoCompleto(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) { next(err); }
});

// POST /api/productos -> crear producto (admin), hasta 6 fotos
router.post('/', verificarToken, upload.array('imagenes', 6), async (req, res, next) => {
  try {
    const { nombre, categoria, subcategoria, descripcion, precio, descuento, destacado, activo } = req.body;

    if (!nombre || !categoria || precio === undefined) {
      return res.status(400).json({ error: 'Nombre, categoría y precio son obligatorios' });
    }

    let codigo;
    do {
      codigo = generarCodigo();
    } while (await queryOne('SELECT id FROM productos WHERE codigo = ?', [codigo]));

    const info = await run(`
      INSERT INTO productos (codigo, nombre, categoria, subcategoria, descripcion, precio, descuento, destacado, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      codigo,
      nombre,
      categoria,
      subcategoria || '',
      descripcion || '',
      parseFloat(precio) || 0,
      parseInt(descuento) || 0,
      (destacado === 'true' || destacado === '1') ? 1 : 0,
      (activo === 'false' || activo === '0') ? 0 : 1
    ]);

    const productoId = info.lastInsertRowid;

    if (req.files && req.files.length) {
      const subidas = await Promise.all(req.files.map(file => subirImagen(file.buffer)));
      for (let i = 0; i < subidas.length; i++) {
        await run('INSERT INTO producto_imagenes (producto_id, archivo, public_id, orden) VALUES (?, ?, ?, ?)',
          [productoId, subidas[i].url, subidas[i].public_id, i]);
      }
    }

    res.status(201).json(await obtenerProductoCompleto(productoId));
  } catch (err) { next(err); }
});

// PUT /api/productos/:id -> editar producto, puede sumar más fotos y borrar puntuales
router.put('/:id', verificarToken, upload.array('imagenes', 6), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = await queryOne('SELECT * FROM productos WHERE id = ?', [id]);
    if (!existente) return res.status(404).json({ error: 'Producto no encontrado' });

    const { nombre, categoria, subcategoria, descripcion, precio, descuento, destacado, activo, eliminarImagenes } = req.body;

    await run(`
      UPDATE productos SET nombre=?, categoria=?, subcategoria=?, descripcion=?, precio=?, descuento=?, destacado=?, activo=?
      WHERE id=?
    `, [
      nombre ?? existente.nombre,
      categoria ?? existente.categoria,
      subcategoria ?? existente.subcategoria,
      descripcion ?? existente.descripcion,
      precio !== undefined ? parseFloat(precio) : existente.precio,
      descuento !== undefined ? parseInt(descuento) : existente.descuento,
      destacado !== undefined ? ((destacado === 'true' || destacado === '1') ? 1 : 0) : existente.destacado,
      activo !== undefined ? ((activo === 'false' || activo === '0') ? 0 : 1) : existente.activo,
      id
    ]);

    // Borrar imágenes puntuales: eliminarImagenes = "3,5,7" (ids de producto_imagenes)
    if (eliminarImagenes) {
      const ids = String(eliminarImagenes).split(',').map(s => s.trim()).filter(Boolean);
      for (const imgId of ids) {
        const img = await queryOne('SELECT * FROM producto_imagenes WHERE id = ? AND producto_id = ?', [imgId, id]);
        if (img) {
          await run('DELETE FROM producto_imagenes WHERE id = ?', [imgId]);
          borrarImagen(img.public_id); // no bloqueamos la respuesta esperando esto
        }
      }
    }

    // Sumar nuevas fotos al final
    if (req.files && req.files.length) {
      const maxOrdenFila = await queryOne('SELECT COALESCE(MAX(orden), -1) as m FROM producto_imagenes WHERE producto_id = ?', [id]);
      const maxOrden = maxOrdenFila.m;
      const subidas = await Promise.all(req.files.map(file => subirImagen(file.buffer)));
      for (let i = 0; i < subidas.length; i++) {
        await run('INSERT INTO producto_imagenes (producto_id, archivo, public_id, orden) VALUES (?, ?, ?, ?)',
          [id, subidas[i].url, subidas[i].public_id, maxOrden + 1 + i]);
      }
    }

    res.json(await obtenerProductoCompleto(id));
  } catch (err) { next(err); }
});

// DELETE /api/productos/:id
router.delete('/:id', verificarToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = await queryOne('SELECT * FROM productos WHERE id = ?', [id]);
    if (!existente) return res.status(404).json({ error: 'Producto no encontrado' });

    const imagenes = await query('SELECT public_id FROM producto_imagenes WHERE producto_id = ?', [id]);
    await run('DELETE FROM producto_imagenes WHERE producto_id = ?', [id]);
    await run('DELETE FROM productos WHERE id = ?', [id]);

    imagenes.forEach(img => borrarImagen(img.public_id)); // best-effort, no bloqueante

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
