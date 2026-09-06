// routes/auth.js
// Registro, inicio de sesión y cierre de sesión.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');

const router = express.Router();

// POST /api/auth/registro
// Crea un nuevo usuario. Por simplicidad, cualquiera que se registre entra como "empleado".
// (En un sistema real, el admin crearía las cuentas, pero para practicar así es más simple.)
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

  // Iniciamos sesión automáticamente tras registrarse
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
// Devuelve quién es el usuario actual (útil para que el frontend sepa si hay sesión activa)
router.get('/me', (req, res) => {
  if (!req.session.usuarioId) {
    return res.status(401).json({ error: 'No hay sesión activa.' });
  }
  res.json({
    id: req.session.usuarioId,
    nombre: req.session.nombre,
    rol: req.session.rol
  });
});

module.exports = router;
