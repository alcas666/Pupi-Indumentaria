const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne } = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan usuario o contraseña' });
    }

    const admin = await queryOne('SELECT * FROM admins WHERE username = ?', [username]);
    if (!admin) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const ok = bcrypt.compareSync(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'clave_secreta_cambiar',
      { expiresIn: '8h' }
    );

    res.json({ token, username: admin.username });
  } catch (err) { next(err); }
});

module.exports = router;
