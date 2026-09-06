// routes/auth.js
// Registro, inicio de sesión, cierre de sesión, y un endpoint especial y
// protegido para crear/promover al primer administrador sin necesitar SSH.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

// POST /api/auth/registro
router.post('/registro', (req, res) => {
  const { nombre, email, password, fecha_ingreso } = req.body;

  if (!nombre || !email || !password || !fecha_ingreso) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existente) {
    return res.status(409).json({ error: 'Ese email ya está registrado.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const resultado = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, fecha_ingreso)
    VALUES (?, ?, ?, 'empleado', ?)
  `).run(nombre, email, password_hash, fecha_ingreso);

  req.session.usuarioId = resultado.lastInsertRowid;
  req.session.rol = 'empleado';
  req.session.nombre = nombre;

  res.status(201).json({
    mensaje: 'Usuario registrado correctamente.',
    usuario: { id: resultado.lastInsertRowid, nombre, email, rol: 'empleado' }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const passwordValida = bcrypt.compareSync(password, usuario.password_hash);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  req.session.usuarioId = usuario.id;
  req.session.rol = usuario.rol;
  req.session.nombre = usuario.nombre;

  res.json({
    mensaje: 'Sesión iniciada.',
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ mensaje: 'Sesión cerrada.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.usuarioId) {
    return res.status(401).json({ error: 'No hay sesión activa.' });
  }
  res.json({ id: req.session.usuarioId, nombre: req.session.nombre, rol: req.session.rol });
});

// POST /api/auth/configurar-admin
// Endpoint especial para crear o promover un administrador SIN necesitar acceso
// SSH/terminal al servidor. Está protegido por una clave secreta que se
// configura como variable de entorno (ADMIN_SETUP_KEY) — solo quien conozca esa
// clave puede usar este endpoint. Útil para el primer admin en un hosting donde
// no quieres habilitar SSH por seguridad.
router.post('/configurar-admin', (req, res) => {
  const { clave, email, password, nombre } = req.body;

  const claveEsperada = process.env.ADMIN_SETUP_KEY;

  // Si no se configuró la variable de entorno, este endpoint queda desactivado
  // por completo (evita dejarlo abierto por accidente).
  if (!claveEsperada) {
    return res.status(403).json({ error: 'Esta función no está habilitada en este servidor.' });
  }

  if (!clave || clave !== claveEsperada) {
    return res.status(401).json({ error: 'Clave incorrecta.' });
  }

  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio.' });
  }

  const existente = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  if (existente) {
    // Ya existe: solo lo promovemos a admin
    db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run('admin', existente.id);
    return res.json({ mensaje: `${email} ahora es administrador.` });
  }

  // No existe: lo creamos directamente como admin
  if (!password || !nombre) {
    return res.status(400).json({
      error: 'Ese usuario no existe todavía. Para crearlo, incluye también nombre y password.'
    });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, fecha_ingreso)
    VALUES (?, ?, ?, 'admin', date('now'))
  `).run(nombre, email, password_hash);

  res.json({ mensaje: `Administrador ${email} creado correctamente.` });
});

module.exports = router;
