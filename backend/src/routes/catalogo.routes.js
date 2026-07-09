const express = require('express');
const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// ─── DEPENDENCIAS ──────────────────────────────────────────────────────────────

// Listar todas las dependencias ordenadas A-Z por nombre.
router.get('/catalogo/dependencias', authenticate, (req, res) => {
  const all = store.getCollection('dependencias');
  const sorted = [...all].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );
  return res.json(sorted);
});

// Dar de alta una nueva dependencia.
router.post('/catalogo/dependencias', authenticate, authorizeRoles('residente', 'dependencia'), (req, res) => {
  const { nombre, siglas, rfc, direccion, telefono, email, nombre_contacto } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la dependencia es obligatorio' });
  }

  const existe = store.findOne('dependencias', d =>
    d.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
  );
  if (existe) {
    return res.status(400).json({ error: `Ya existe una dependencia con el nombre "${nombre}"` });
  }

  const nueva = store.insert('dependencias', {
    nombre: nombre.trim(),
    siglas: (siglas || '').trim(),
    rfc: (rfc || '').trim().toUpperCase(),
    direccion: (direccion || '').trim(),
    telefono: (telefono || '').trim(),
    email: (email || '').trim().toLowerCase(),
    nombre_contacto: (nombre_contacto || '').trim(),
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  return res.status(201).json({ dependencia: nueva });
});

// ─── EMPRESAS ──────────────────────────────────────────────────────────────────

// Listar todas las empresas ordenadas A-Z por nombre comercial.
router.get('/catalogo/empresas', authenticate, (req, res) => {
  const all = store.getCollection('empresas');
  const sorted = [...all].sort((a, b) =>
    a.nombre_comercial.localeCompare(b.nombre_comercial, 'es', { sensitivity: 'base' })
  );
  return res.json(sorted);
});

// Dar de alta una nueva empresa.
router.post('/catalogo/empresas', authenticate, authorizeRoles('residente', 'dependencia'), (req, res) => {
  const { nombre_comercial, razon_social, rfc, direccion, telefono, email, representante } = req.body;

  if (!nombre_comercial || !nombre_comercial.trim()) {
    return res.status(400).json({ error: 'El nombre comercial de la empresa es obligatorio' });
  }

  const existe = store.findOne('empresas', e =>
    e.nombre_comercial.trim().toLowerCase() === nombre_comercial.trim().toLowerCase()
  );
  if (existe) {
    return res.status(400).json({ error: `Ya existe una empresa con el nombre "${nombre_comercial}"` });
  }

  const nueva = store.insert('empresas', {
    nombre_comercial: nombre_comercial.trim(),
    razon_social: (razon_social || '').trim(),
    rfc: (rfc || '').trim().toUpperCase(),
    direccion: (direccion || '').trim(),
    telefono: (telefono || '').trim(),
    email: (email || '').trim().toLowerCase(),
    representante: (representante || '').trim(),
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  return res.status(201).json({ empresa: nueva });
});

module.exports = router;
