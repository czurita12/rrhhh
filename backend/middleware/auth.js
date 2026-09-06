// middleware/auth.js
// Funciones que protegen las rutas: verifican que el usuario haya iniciado sesión
// y, en algunos casos, que tenga rol de administrador.

function requiereLogin(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ error: 'Debes iniciar sesión.' });
  }
  next();
}

function requiereAdmin(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ error: 'Debes iniciar sesión.' });
  }
  if (req.session.rol !== 'admin') {
    return res.status(403).json({ error: 'No tienes permisos de administrador.' });
  }
  next();
}

module.exports = { requiereLogin, requiereAdmin };
