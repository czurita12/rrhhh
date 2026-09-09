// routes/asistencias.js
// Marcar entrada/salida, ver el historial propio, y (para el admin) un
// dashboard con filtros por empleado y rango de fechas.

const express = require('express');
const db = require('../database');
const { requiereLogin, requiereAdmin } = require('../middleware/auth');
const {
  estaDentroDeOficina,
  obtenerIpDeSolicitud,
  calcularHorasTrabajadas,
  obtenerIpsAutorizadasTexto,
  guardarIpsAutorizadas
} = require('../utils/asistencias');

const router = express.Router();

// Fecha y hora actuales en formato local simple (no usamos zona horaria del
// servidor de forma compleja; para un proyecto de práctica esto es suficiente).
function fechaHoy() {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0]; // YYYY-MM-DD
}
function horaAhora() {
  const ahora = new Date();
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// POST /api/asistencias/marcar-entrada
router.post('/marcar-entrada', requiereLogin, (req, res) => {
  const hoy = fechaHoy();
  const existente = db.prepare(`
    SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?
  `).get(req.session.usuarioId, hoy);

  if (existente && existente.hora_entrada) {
    return res.status(409).json({ error: `Ya marcaste tu entrada hoy a las ${existente.hora_entrada}.` });
  }

  const dentro = estaDentroDeOficina(req) ? 1 : 0;
  const ip = obtenerIpDeSolicitud(req);
  const hora = horaAhora();

  if (existente) {
    db.prepare(`
      UPDATE asistencias SET hora_entrada = ?, ip_entrada = ?, dentro_oficina_entrada = ? WHERE id = ?
    `).run(hora, ip, dentro, existente.id);
  } else {
    db.prepare(`
      INSERT INTO asistencias (usuario_id, fecha, hora_entrada, ip_entrada, dentro_oficina_entrada)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.session.usuarioId, hoy, hora, ip, dentro);
  }

  res.status(201).json({
    mensaje: dentro
      ? `Entrada marcada a las ${hora}.`
      : `Entrada marcada a las ${hora}, pero desde fuera de la red de oficina (quedará para revisión).`,
    dentro_oficina: !!dentro
  });
});

// POST /api/asistencias/marcar-salida
router.post('/marcar-salida', requiereLogin, (req, res) => {
  const hoy = fechaHoy();
  const existente = db.prepare(`
    SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?
  `).get(req.session.usuarioId, hoy);

  if (!existente || !existente.hora_entrada) {
    return res.status(400).json({ error: 'Primero debes marcar tu entrada de hoy.' });
  }
  if (existente.hora_salida) {
    return res.status(409).json({ error: `Ya marcaste tu salida hoy a las ${existente.hora_salida}.` });
  }

  const dentro = estaDentroDeOficina(req) ? 1 : 0;
  const ip = obtenerIpDeSolicitud(req);
  const hora = horaAhora();

  db.prepare(`
    UPDATE asistencias SET hora_salida = ?, ip_salida = ?, dentro_oficina_salida = ? WHERE id = ?
  `).run(hora, ip, dentro, existente.id);

  const horas = calcularHorasTrabajadas(existente.hora_entrada, hora);

  res.json({
    mensaje: dentro
      ? `Salida marcada a las ${hora}.`
      : `Salida marcada a las ${hora}, pero desde fuera de la red de oficina (quedará para revisión).`,
    dentro_oficina: !!dentro,
    horas_trabajadas: horas
  });
});

// GET /api/asistencias/hoy
// Devuelve el estado de asistencia del día actual para el usuario logueado
// (para saber si el dashboard debe mostrar "Marcar entrada" o "Marcar salida").
router.get('/hoy', requiereLogin, (req, res) => {
  const hoy = fechaHoy();
  const registro = db.prepare(`
    SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?
  `).get(req.session.usuarioId, hoy);

  if (!registro) {
    return res.json({ hora_entrada: null, hora_salida: null, horas_trabajadas: null });
  }

  res.json({
    hora_entrada: registro.hora_entrada,
    hora_salida: registro.hora_salida,
    horas_trabajadas: calcularHorasTrabajadas(registro.hora_entrada, registro.hora_salida)
  });
});

// GET /api/asistencias/mias
// Historial propio del empleado, más recientes primero.
router.get('/mias', requiereLogin, (req, res) => {
  const registros = db.prepare(`
    SELECT * FROM asistencias WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 60
  `).all(req.session.usuarioId);

  const conHoras = registros.map(r => ({
    ...r,
    horas_trabajadas: calcularHorasTrabajadas(r.hora_entrada, r.hora_salida)
  }));

  res.json(conHoras);
});

// GET /api/asistencias (solo admin)
// Dashboard con filtros opcionales: ?usuario_id=&desde=&hasta=
router.get('/', requiereAdmin, (req, res) => {
  const { usuario_id, desde, hasta } = req.query;

  let sql = `
    SELECT a.*, u.nombre AS empleado_nombre, u.email AS empleado_email
    FROM asistencias a
    JOIN usuarios u ON u.id = a.usuario_id
    WHERE 1 = 1
  `;
  const params = [];

  if (usuario_id) {
    sql += ' AND a.usuario_id = ?';
    params.push(usuario_id);
  }
  if (desde) {
    sql += ' AND a.fecha >= ?';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND a.fecha <= ?';
    params.push(hasta);
  }

  sql += ' ORDER BY a.fecha DESC, u.nombre ASC';

  const registros = db.prepare(sql).all(...params);
  const conHoras = registros.map(r => ({
    ...r,
    horas_trabajadas: calcularHorasTrabajadas(r.hora_entrada, r.hora_salida)
  }));

  res.json(conHoras);
});

// GET /api/asistencias/configuracion (solo admin)
// Devuelve la IP (o IPs) de oficina configurada actualmente, más la IP desde
// la que el propio admin está entrando ahora mismo (útil para que pueda
// copiarla con un clic si está en la oficina en ese momento).
router.get('/configuracion', requiereAdmin, (req, res) => {
  res.json({
    oficina_ip: obtenerIpsAutorizadasTexto(),
    tu_ip_actual: obtenerIpDeSolicitud(req)
  });
});

// PUT /api/asistencias/configuracion (solo admin)
// Actualiza la IP (o IPs separadas por coma) autorizadas de oficina.
router.put('/configuracion', requiereAdmin, (req, res) => {
  const { oficina_ip } = req.body;
  guardarIpsAutorizadas((oficina_ip || '').trim());
  res.json({ mensaje: 'IP de oficina actualizada correctamente.' });
});

module.exports = router;
