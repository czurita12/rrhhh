// routes/usuarios.js
// Perfil del usuario (con su saldo de vacaciones por antigüedad) y listado
// de empleados para el admin.

const express = require('express');
const db = require('../database');
const { requiereLogin, requiereAdmin } = require('../middleware/auth');
const { calcularSaldo } = require('../utils/vacaciones');

const router = express.Router();

// GET /api/usuarios/perfil
router.get('/perfil', requiereLogin, (req, res) => {
  const usuario = db.prepare(`
    SELECT id, nombre, email, rol, fecha_ingreso, dias_por_anio
    FROM usuarios WHERE id = ?
  `).get(req.session.usuarioId);

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const saldo = calcularSaldo(usuario);

  res.json({ ...usuario, ...saldo });
});

// GET /api/usuarios (solo admin)
router.get('/', requiereAdmin, (req, res) => {
  const usuarios = db.prepare(`
    SELECT id, nombre, email, rol, fecha_ingreso, dias_por_anio
    FROM usuarios ORDER BY nombre
  `).all();

  const conSaldo = usuarios.map(u => ({ ...u, ...calcularSaldo(u) }));

  res.json(conSaldo);
});

module.exports = router;
