const express = require('express');
const jwt = require('jsonwebtoken');

const store = require('../db/store');
const { authenticate, authorizeRoles, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// HU-00: Inicio de sesion por rol
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contrasena requeridos" });
  }

  const user = store.findOne('usuarios', u => u.email === email);
  if (!user || user.contrasena !== password) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  if (user.estado === 'pendiente') {
    return res.status(403).json({ error: "Su cuenta esta pendiente de aprobacion por la Dependencia" });
  }

  // Deduce role from db user record
  const token = jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  return res.json({
    message: "Inicio de sesion exitoso",
    user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }
  });
});

// Registro de usuario (nuevo solicitante)
router.post('/auth/register', (req, res) => {
  const { email, password, nombre, rol } = req.body;
  if (!email || !password || !nombre || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const exists = store.findOne('usuarios', u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "El correo ya esta registrado" });
  }

  const newUser = store.insert('usuarios', {
    email,
    contrasena: password,
    nombre,
    rol, // Rol solicitado
    estado: "pendiente"
  });

  return res.status(201).json({
    message: "Solicitud registrada con exito. Pendiente de aprobacion.",
    user: { id: newUser.id, email: newUser.email, nombre: newUser.nombre, rol: newUser.rol, estado: newUser.estado }
  });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: "Sesion cerrada correctamente" });
});

router.get('/auth/me', authenticate, (req, res) => {
  return res.json({ user: req.user });
});

router.get('/users', authenticate, (req, res) => {
  const users = store.getCollection('usuarios').map(u => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    estado: u.estado
  }));
  return res.json(users);
});

// Admin Aprobacion (Dependencia)
router.get('/admin/requests', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const pending = store.find('usuarios', u => u.estado === 'pendiente');
  return res.json(pending);
});

router.post('/admin/approve', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const { userId, approve, role } = req.body; // approve: true/false, role: final assigned role
  if (!userId) {
    return res.status(400).json({ error: "ID de usuario requerido" });
  }

  const user = store.findOne('usuarios', u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  if (approve) {
    store.update('usuarios', userId, {
      estado: 'aprobado',
      rol: role || user.rol, // Can override role during approval
      aprobado_por: req.user.nombre,
      aprobado_en: new Date().toISOString()
    });
    return res.json({ message: "Usuario aprobado con exito" });
  } else {
    store.update('usuarios', userId, { estado: 'rechazado' });
    return res.json({ message: "Usuario rechazado" });
  }
});

module.exports = router;
