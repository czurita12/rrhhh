// utils/vacaciones.js
// Lógica compartida para calcular cuántos días de vacaciones tiene acumulados
// un empleado, según su antigüedad (no por año calendario, sino por año cumplido
// desde su fecha de ingreso).

const db = require('../database');

// Calcula cuántos años completos ha cumplido un empleado desde su fecha de ingreso.
// Ej: si ingresó el 2024-03-10 y hoy es 2026-09-06, ha cumplido 2 años completos
// (el tercer año todavía no se cumple, así que no cuenta hasta el 2027-03-10).
function aniosCumplidos(fechaIngreso) {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();

  let anios = hoy.getFullYear() - ingreso.getFullYear();

  // Si todavía no ha llegado el mes/día de aniversario este año, restamos 1
  const aunNoLlegaAniversario =
    hoy.getMonth() < ingreso.getMonth() ||
    (hoy.getMonth() === ingreso.getMonth() && hoy.getDate() < ingreso.getDate());

  if (aunNoLlegaAniversario) {
    anios -= 1;
  }

  return Math.max(0, anios);
}

// Cuenta todos los días de vacaciones ya aprobados de un usuario, en toda su
// historia (no solo el año calendario actual), porque ahora el saldo se acumula
// por antigüedad y no se "reinicia" cada enero.
function diasUsadosTotal(usuarioId) {
  const fila = db.prepare(`
    SELECT COALESCE(SUM(dias), 0) AS total
    FROM solicitudes
    WHERE usuario_id = ? AND tipo = 'vacaciones' AND estado = 'aprobada'
  `).get(usuarioId);
  return fila.total;
}

// Calcula el saldo completo de un usuario: cuántos días ha acumulado por
// antigüedad, cuántos ha usado, y cuántos le quedan disponibles.
function calcularSaldo(usuario) {
  const anios = aniosCumplidos(usuario.fecha_ingreso);
  const diasAcumulados = anios * usuario.dias_por_anio;
  const diasUsados = diasUsadosTotal(usuario.id);
  const diasDisponibles = diasAcumulados - diasUsados;

  return {
    anios_cumplidos: anios,
    dias_acumulados: diasAcumulados,
    dias_usados: diasUsados,
    dias_disponibles: diasDisponibles
  };
}

module.exports = { aniosCumplidos, diasUsadosTotal, calcularSaldo };
