// database.js
// Aquí configuramos la conexión a SQLite y creamos las tablas si no existen.
// SQLite guarda todo en un solo archivo (data/rrhh.db), no necesita servidor aparte.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');

// Si la carpeta "data" no existe (por ejemplo, en un servidor recién desplegado
// donde Git no sube carpetas vacías), la creamos antes de abrir la base de datos.
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'rrhh.db');
const db = new Database(dbPath);

// Buenas prácticas de SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tabla de usuarios (empleados y administradores)
// dias_por_anio: cuántos días de vacaciones acumula el empleado por cada año
// completo de antigüedad (por defecto 15, se puede ajustar por persona).
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'empleado' CHECK(rol IN ('empleado', 'admin')),
    fecha_ingreso TEXT NOT NULL,
    dias_por_anio INTEGER NOT NULL DEFAULT 15,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Tabla de solicitudes (vacaciones o permisos)
db.exec(`
  CREATE TABLE IF NOT EXISTS solicitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('vacaciones', 'permiso')),
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    dias INTEGER NOT NULL,
    motivo TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aprobada', 'rechazada')),
    comentario_admin TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  )
`);

module.exports = db;
