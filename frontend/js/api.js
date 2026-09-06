// api.js — pequeño helper para llamar a nuestra API desde el frontend.

async function api(metodo, ruta, datos) {
  const opciones = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (datos !== undefined) {
    opciones.body = JSON.stringify(datos);
  }

  const respuesta = await fetch(ruta, opciones);
  const cuerpo = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(cuerpo.error || 'Ocurrió un error inesperado.');
  }
  return cuerpo;
}

function formatearFecha(fechaISO) {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [anio, mes, dia] = fechaISO.split('-');
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]} ${anio}`;
}
