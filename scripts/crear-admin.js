// scripts/crear-admin.js
// Uso: node scripts/crear-admin.js correo@ejemplo.com
// Convierte a un usuario ya registrado en administrador (para uso LOCAL en tu Mac).
// En un servidor sin acceso SSH, usa en su lugar la página /configurar-admin.html.

const bcrypt = require('bcryptjs');
const db = require('../backend/database');

const email = process.argv[2];
const passwordSiEsNuevo = process.argv[3];

if (!email) {
  console.log('Uso: node scripts/crear-admin.js correo@ejemplo.com [password-si-es-nuevo]');
  process.exit(1);
}

const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

if (usuario) {
  db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run('admin', usuario.id);
  console.log(`✔ ${email} ahora es administrador.`);
} else {
  if (!passwordSiEsNuevo) {
    console.log('Ese usuario no existe. Debes indicar una contraseña para crearlo: node scripts/crear-admin.js correo@ejemplo.com miPassword123');
    process.exit(1);
  }
  const password_hash = bcrypt.hashSync(passwordSiEsNuevo, 10);
  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, fecha_ingreso)
    VALUES (?, ?, ?, 'admin', date('now'))
  `).run('Administrador', email, password_hash);
  console.log(`✔ Se creó el administrador ${email}.`);
}
