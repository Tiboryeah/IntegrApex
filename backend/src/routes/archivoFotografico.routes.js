const express = require('express');
const fs = require('fs');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

function userCanAccessContract(user, contract) {
  if (user.rol === 'dependencia' || user.rol === 'finanzas') return true;
  return contract.residente_id === user.id ||
    contract.superintendente_id === user.id ||
    contract.supervision_id === user.id ||
    contract.creado_por_id === user.id ||
    (Array.isArray(contract.equipo) && contract.equipo.some(m => m.usuario_id === user.id));
}

function cleanupUploadedFiles(files) {
  (files || []).forEach(file => {
    if (file && file.path) {
      fs.unlink(file.path, () => {});
    }
  });
}

// Archivo Fotografico: evidencias de avance de obra independientes de una estimacion especifica.
router.post('/contratos/:id/archivo-fotografico', authenticate, authorizeRoles('residente', 'contratista', 'supervision'), upload.array('fotos', 20), (req, res) => {
  const contrato_id = req.params.id;
  const { descripcion, fecha_evidencia } = req.body;

  if (!descripcion) {
    cleanupUploadedFiles(req.files);
    return res.status(400).json({ error: 'La descripcion del avance es obligatoria' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Debe adjuntar al menos una fotografia' });
  }

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    cleanupUploadedFiles(req.files);
    return res.status(404).json({ error: 'Contrato no encontrado' });
  }

  if (!userCanAccessContract(req.user, contract)) {
    cleanupUploadedFiles(req.files);
    return res.status(403).json({ error: 'No tienes acceso a este contrato' });
  }

  const fotos = req.files.map(f => ({ path: `/uploads/${f.filename}`, nombre: f.originalname }));

  const nuevo = store.insert('archivo_fotografico', {
    contrato_id,
    descripcion: descripcion.trim(),
    fecha_evidencia: fecha_evidencia || new Date().toISOString().split('T')[0],
    fotos,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  return res.status(201).json({ message: 'Evidencia fotografica guardada con exito', evidencia: nuevo });
});

module.exports = router;
