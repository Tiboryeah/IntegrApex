const express = require('express');
const jwt = require('jsonwebtoken');

const store = require('../db/store');
const { authenticate, authorizeRoles, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// HU-00: Inicio de sesión por rol
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
    return res.status(403).json({ error: "Su cuenta está pendiente de aprobación por la dependencia" });
  }

  if (user.estado === 'rechazado') {
    return res.status(401).json({ error: "Su solicitud de acceso no fue aprobada" });
  }

  // El rol se toma del registro persistido; no se solicita al usuario en el login.
  const token = jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 día
  });

  return res.json({
    message: "Inicio de sesión exitoso",
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
    message: "Solicitud registrada con éxito. Pendiente de aprobación.",
    user: { id: newUser.id, email: newUser.email, nombre: newUser.nombre, rol: newUser.rol, estado: newUser.estado }
  });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: "Sesión cerrada correctamente" });
});

router.get('/auth/me', (req, res) => {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.json({ user: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ user: decoded });
  } catch (e) {
    res.clearCookie('token');
    return res.json({ user: null });
  }
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

// Aprobación administrativa de solicitudes (Dependencia)
router.get('/admin/requests', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const pending = store.find('usuarios', u => u.estado === 'pendiente');
  return res.json(pending);
});

router.post('/admin/approve', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const { userId, approve, role } = req.body; // approve: true/false, role: rol final asignado.
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
      rol: role || user.rol, // La dependencia puede ajustar el rol durante la aprobación.
      aprobado_por: req.user.nombre,
      aprobado_en: new Date().toISOString()
    });
    return res.json({ message: "Usuario aprobado con éxito" });
  } else {
    store.update('usuarios', userId, { estado: 'rechazado' });
    return res.json({ message: "Usuario rechazado" });
  }
});

// Listar todos los usuarios (Dependencia)
router.get('/admin/usuarios', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const todos = store.getCollection('usuarios').map(u => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    estado: u.estado,
    telefono: u.telefono || null,
    cargo: u.cargo || null,
    titulo: u.titulo || null,
    especialidad: u.especialidad || null,
    cedula: u.cedula || null,
    nss: u.nss || null,
    empresa_id: u.empresa_id || null,
    dependencia_id: u.dependencia_id || null,
    notas: u.notas || null,
    foto_url: u.foto_url || null,
    creado_en: u.creado_en || null
  }));
  return res.json(todos);
});

// Crear usuario directamente (Dependencia, o Residente para su equipo de contrato) — queda aprobado de inmediato
router.post('/admin/usuarios', authenticate, authorizeRoles('dependencia', 'residente'), (req, res) => {
  const { email, password, nombre, rol, telefono, cargo, titulo, especialidad, cedula, nss, empresa_id, dependencia_id, notas } = req.body;

  if (!email || !password || !nombre || !rol) {
    return res.status(400).json({ error: 'Nombre, correo, contraseña y rol son obligatorios' });
  }

  const existe = store.findOne('usuarios', u => u.email === email.trim().toLowerCase());
  if (existe) {
    return res.status(400).json({ error: `El correo ${email} ya está registrado` });
  }

  const rolesValidos = ['residente', 'contratista', 'supervision', 'dependencia', 'finanzas'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido' });
  }

  // A pedido del cliente, un residente puede dar de alta cualquier rol desde el alta de contrato,
  // igual que lo hace una dependencia desde Gestión de Usuarios.
  const nuevo = store.insert('usuarios', {
    email: email.trim().toLowerCase(),
    contrasena: password,
    nombre: nombre.trim(),
    rol,
    estado: 'aprobado',
    telefono: (telefono || '').trim(),
    cargo: (cargo || '').trim(),
    titulo: (titulo || '').trim(),
    especialidad: (especialidad || '').trim(),
    cedula: (cedula || '').trim(),
    nss: (nss || '').trim(),
    empresa_id: empresa_id || null,
    dependencia_id: dependencia_id || null,
    notas: (notas || '').trim(),
    aprobado_por: req.user.nombre,
    aprobado_en: new Date().toISOString(),
    creado_en: new Date().toISOString()
  });

  return res.status(201).json({
    message: 'Usuario creado con éxito',
    user: { id: nuevo.id, email: nuevo.email, nombre: nuevo.nombre, rol: nuevo.rol, estado: nuevo.estado }
  });
});

module.exports = router;
