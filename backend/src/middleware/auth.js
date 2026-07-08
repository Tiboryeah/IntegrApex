const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'integrapex_secret_key_2026_xyz';

function authenticate(req, res, next) {
  let token = req.cookies && req.cookies.token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "No autorizado. Token no proporcionado." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token invlido o expirado." });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: "Acceso denegado. Permisos insuficientes." });
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles,
  JWT_SECRET
};
