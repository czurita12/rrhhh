// utils/asistencias.js
// Lógica para verificar si una petición viene de la IP de la oficina,
// y para calcular las horas trabajadas en un día a partir de entrada y salida.

const db = require('../database');

// La IP (o IPs) de oficina se guarda en la tabla "configuracion" para poder
// editarla desde el panel de admin sin tocar variables de entorno ni
// redesplegar. Si nunca se ha configurado desde ahí, usamos como valor
// inicial la variable de entorno OFICINA_IP (si existe).
function obtenerIpsAutorizadas() {
  const fila = db.prepare(`SELECT valor FROM configuracion WHERE clave = 'oficina_ip'`).get();
  const valor = fila ? fila.valor : (process.env.OFICINA_IP || '');
  return valor.split(',').map(ip => ip.trim()).filter(Boolean);
}

// Devuelve el valor crudo guardado (para mostrarlo tal cual en el panel de admin).
function obtenerIpsAutorizadasTexto() {
  const fila = db.prepare(`SELECT valor FROM configuracion WHERE clave = 'oficina_ip'`).get();
  return fila ? fila.valor : (process.env.OFICINA_IP || '');
}

// Guarda una nueva IP (o lista de IPs separadas por coma) de oficina.
function guardarIpsAutorizadas(valor) {
  db.prepare(`
    INSERT INTO configuracion (clave, valor) VALUES ('oficina_ip', ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `).run(valor);
}

// Obtiene la IP real del visitante. Como el servidor está detrás de un proxy
// (Hostinger), la IP real viene en la cabecera "x-forwarded-for" y no en
// req.socket directamente — por eso server.js configura "trust proxy".
function obtenerIpDeSolicitud(req) {
  return req.ip || req.connection.remoteAddress || '';
}

// Compara la IP del visitante contra la lista de IPs autorizadas de oficina.
function estaDentroDeOficina(req) {
  const autorizadas = obtenerIpsAutorizadas();
  if (autorizadas.length === 0) {
    // Si no se configuró ninguna IP de oficina, no podemos validar nada —
    // por defecto dejamos marcar sin restricción (en vez de bloquear a todos).
    return true;
  }
  const ip = obtenerIpDeSolicitud(req);
  return autorizadas.includes(ip);
}

// Calcula las horas trabajadas (en formato decimal, ej: 8.5) a partir de
// una hora de entrada y salida en formato "HH:MM".
function calcularHorasTrabajadas(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return null;

  const [hE, mE] = horaEntrada.split(':').map(Number);
  const [hS, mS] = horaSalida.split(':').map(Number);

  const minutosEntrada = hE * 60 + mE;
  const minutosSalida = hS * 60 + mS;

  const diffMinutos = minutosSalida - minutosEntrada;
  if (diffMinutos <= 0) return null; // salida antes que entrada, dato inválido

  return Math.round((diffMinutos / 60) * 100) / 100; // redondeado a 2 decimales
}

module.exports = {
  estaDentroDeOficina,
  obtenerIpDeSolicitud,
  calcularHorasTrabajadas,
  obtenerIpsAutorizadasTexto,
  guardarIpsAutorizadas
};
