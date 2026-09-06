// routes/usuarios.js
// Perfil del usuario (con su saldo de vacaciones) y listado de empleados para el admin.

const express = require('express');
const db = require('../database');
const { requiereLogin, requiereAdmin } = require('../middleware/auth');

const router = express.Router();

// Calcula cuántos días de vacaciones ha usado un usuario en el año actual
// (sumando solo solicitudes de tipo "vacaciones" ya aprobadas)
function diasUsadosEsteAnio(usuarioId) {
  const anioActual = new Date().getFullYear().toString();
  const fila = db.prepare(`
    SELECT COALESCE(SUM(dias), 0) AS total
    FROM solicitudes
    WHERE usuario_id = ?
      AND tipo = 'vacaciones'
      AND estado = 'aprobada'
      AND strftime('%Y', fecha_inicio) = ?
  `).get(usuarioId, anioActual);
  return fila.total;
}

// GET /api/usuarios/perfil
// Devuelve los datos del usuario logueado + su saldo de vacaciones
router.get('/perfil', requiereLogin, (req, res) => {
  const usuario = db.prepare(`
    SELECT id, nombre, email, rol, fecha_ingreso, dias_totales
    FROM usuarios WHERE id = ?
  `).get(req.session.usuarioId);

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const usados = diasUsadosEsteAnio(usuario.id);

  res.json({
    ...usuario,
    dias_usados: usados,
    dias_disponibles: usuario.dias_totales - usados
  });
});

// GET /api/usuarios (solo admin)
// Lista todos los empleados con su saldo de vacaciones
router.get('/', requiereAdmin, (req, res) => {
  const usuarios = db.prepare(`
    SELECT id, nombre, email, rol, fecha_ingreso, dias_totales
    FROM usuarios ORDER BY nombre
  `).all();

  const conSaldo = usuarios.map(u => {
    const usados = diasUsadosEsteAnio(u.id);
    return { ...u, dias_usados: usados, dias_disponibles: u.dias_totales - usados };
  });

  res.json(conSaldo);
});

module.exports = router;
