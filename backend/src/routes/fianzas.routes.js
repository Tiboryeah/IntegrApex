const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { parseJsonField, normalizeMoney } = require('../utils/validators');
const { checkFianzasVigencia } = require('../jobs/alertasScheduler');

const router = express.Router();

// HU-02: Fianzas y garantias
router.post('/contratos/:id/fianzas', authenticate, authorizeRoles('dependencia'), upload.single('pdf_poliza'), (req, res) => {
  const contrato_id = req.params.id;
  const { afianzadora, vigencia, monto, tipo } = req.body;
  let { umbrales_alerta } = req.body;

  if (!afianzadora || !vigencia || !monto || !tipo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  try {
    umbrales_alerta = parseJsonField(umbrales_alerta, [30, 15, 5], 'Umbrales de alerta');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const thresholds = (Array.isArray(umbrales_alerta) ? umbrales_alerta : [30, 15, 5])
    .map(n => parseInt(n, 10))
    .filter(n => Number.isInteger(n) && n > 0)
    .sort((a, b) => b - a);

  const newBond = store.insert('fianzas', {
    contrato_id,
    tipo,
    afianzadora,
    vigencia,
    monto: parseFloat(monto),
    umbrales_alerta: thresholds.length ? thresholds : [30, 15, 5],
    alertas_emitidas: [],
    pdf_poliza: req.file ? `/uploads/${req.file.filename}` : null,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  // HU-02: si la vigencia ya nace dentro de una ventana de alerta (30/15/5 dias), notificar de inmediato
  checkFianzasVigencia();

  return res.status(201).json({ message: "Garantia registrada con exito", fianza: newBond });
});

router.post('/fianzas/:id/endosos', authenticate, authorizeRoles('dependencia'), upload.single('pdf_endoso'), (req, res) => {
  const fianza = store.findOne('fianzas', f => f.id === req.params.id);
  if (!fianza) {
    return res.status(404).json({ error: "Fianza no encontrada" });
  }

  const { descripcion, cambio_monto, nueva_vigencia, convenio_id } = req.body;
  if (!descripcion) {
    return res.status(400).json({ error: "Descripcion del endoso requerida" });
  }

  const endoso = store.insert('fianza_endosos', {
    fianza_id: fianza.id,
    contrato_id: fianza.contrato_id,
    convenio_id: convenio_id || null,
    descripcion,
    cambio_monto: normalizeMoney(cambio_monto),
    monto_previo: normalizeMoney(fianza.monto),
    monto_nuevo: normalizeMoney(fianza.monto) + normalizeMoney(cambio_monto),
    vigencia_previa: fianza.vigencia,
    nueva_vigencia: nueva_vigencia || fianza.vigencia,
    pdf_endoso: req.file ? `/uploads/${req.file.filename}` : null,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  store.update('fianzas', fianza.id, {
    monto: endoso.monto_nuevo,
    vigencia: endoso.nueva_vigencia,
    // HU-02: nueva vigencia = nueva cuenta regresiva; se reinician los umbrales ya notificados
    alertas_emitidas: endoso.nueva_vigencia !== fianza.vigencia ? [] : (fianza.alertas_emitidas || []),
    actualizado_en: new Date().toISOString()
  });

  checkFianzasVigencia();

  return res.status(201).json({ message: "Endoso registrado con exito", endoso });
});

module.exports = router;
