// server.js
// Punto de entrada de la aplicación. Levanta el servidor Express,
// configura sesiones y conecta las rutas.

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const solicitudesRoutes = require('./routes/solicitudes');

const app = express();
const PUERTO = process.env.PORT || 3000;

// Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones (guardan quién está logueado). En producción usa una SESSION_SECRET
// distinta y secreta, vía variable de entorno.
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambia-esto-en-produccion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    httpOnly: true
  }
}));

// Archivos estáticos del frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

// Manejo simple de errores no capturados
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PUERTO, () => {
  console.log(`Servidor RRHH corriendo en http://localhost:${PUERTO}`);
});
