// routes/solicitudes.js
// Crear solicitudes de vacaciones/permisos, verlas, y (para el admin) aprobarlas o rechazarlas.

const express = require('express');
const db = require('../database');
const { requiereLogin, requiereAdmin } = require('../middleware/auth');
const { calcularSaldo } = require('../utils/vacaciones');

const router = express.Router();

function contarDias(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffMs = fin - inicio;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// POST /api/solicitudes
router.post('/', requiereLogin, (req, res) => {
  const { tipo, fecha_inicio, fecha_fin, motivo } = req.body;

  if (!tipo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Tipo, fecha de inicio y fecha de fin son obligatorios.' });
  }
  if (!['vacaciones', 'permiso'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser "vacaciones" o "permiso".' });
  }

  const dias = contarDias(fecha_inicio, fecha_fin);
  if (dias <= 0) {
    return res.status(400).json({ error: 'La fecha de fin debe ser igual o posterior a la fecha de inicio.' });
  }

  if (tipo === 'vacaciones') {
    const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.session.usuarioId);
    const saldo = calcularSaldo(usuario);
    if (dias > saldo.dias_disponibles) {
      return res.status(400).json({
        error: `Solo tienes ${saldo.dias_disponibles} día(s) de vacaciones disponibles y estás solicitando ${dias}.`
      });
    }
  }

  const resultado = db.prepare(`
    INSERT INTO solicitudes (usuario_id, tipo, fecha_inicio, fecha_fin, dias, motivo, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(req.session.usuarioId, tipo, fecha_inicio, fecha_fin, dias, motivo || null);

  res.status(201).json({ mensaje: 'Solicitud creada correctamente.', id: resultado.lastInsertRowid, dias });
});

// GET /api/solicitudes/mias
router.get('/mias', requiereLogin, (req, res) => {
  const solicitudes = db.prepare(`
    SELECT * FROM solicitudes WHERE usuario_id = ? ORDER BY creado_en DESC
  `).all(req.session.usuarioId);
  res.json(solicitudes);
});

// GET /api/solicitudes (solo admin)
router.get('/', requiereAdmin, (req, res) => {
  const { estado } = req.query;
  let sql = `
    SELECT s.*, u.nombre AS empleado_nombre, u.email AS empleado_email
    FROM solicitudes s
    JOIN usuarios u ON u.id = s.usuario_id
  `;
  const params = [];
  if (estado) {
    sql += ' WHERE s.estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY s.creado_en DESC';

  const solicitudes = db.prepare(sql).all(...params);
  res.json(solicitudes);
});

// PUT /api/solicitudes/:id/estado (solo admin)
router.put('/:id/estado', requiereAdmin, (req, res) => {
  const { id } = req.params;
  const { estado, comentario_admin } = req.body;

  if (!['aprobada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser "aprobada" o "rechazada".' });
  }

  const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(id);
  if (!solicitud) {
    return res.status(404).json({ error: 'Solicitud no encontrada.' });
  }

  db.prepare(`
    UPDATE solicitudes SET estado = ?, comentario_admin = ? WHERE id = ?
  `).run(estado, comentario_admin || null, id);

  res.json({ mensaje: `Solicitud ${estado}.` });
});

module.exports = router;
