const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// HU-11: Minutas y visitas
router.post('/contratos/:id/minutas', authenticate, authorizeRoles('residente'), upload.single('pdf_minuta'), (req, res) => {
  const contrato_id = req.params.id;
  const { descripcion, fecha_reunion } = req.body;

  const newMinuta = store.insert('minutas', {
    contrato_id,
    descripcion,
    fecha_reunion,
    pdf_path: req.file ? `/uploads/${req.file.filename}` : null,
    creado_en: new Date().toISOString()
  });
  return res.status(201).json({ message: "Minuta guardada con éxito", minuta: newMinuta });
});

router.post('/contratos/:id/visitas', authenticate, authorizeRoles('residente'), (req, res) => {
  const newVisita = store.insert('visitas', {
    contrato_id: req.params.id,
    descripcion: req.body.descripcion,
    fecha_visita: req.body.fecha_visita,
    asistentes: req.body.asistentes,
    creado_en: new Date().toISOString()
  });
  return res.status(201).json({ message: "Visita de obra agendada con éxito", visita: newVisita });
});

module.exports = router;
