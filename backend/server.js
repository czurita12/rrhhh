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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cambia-esto-en-produccion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true
  }
}));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PUERTO, () => {
  console.log(`Servidor RRHH corriendo en http://localhost:${PUERTO}`);
});
