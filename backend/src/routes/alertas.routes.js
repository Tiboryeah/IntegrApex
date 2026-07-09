const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { notificar } = require('../utils/notificar');
const { checkAlertasConcepto } = require('../jobs/alertasScheduler');

const router = express.Router();

// HU-07: Alertas de atraso por concepto
router.get('/contratos/:id/alertas', authenticate, (req, res) => {
  const list = store.find('alertas', a => a.contrato_id === req.params.id);
  return res.json(list);
});

router.post('/contratos/:id/alertas', authenticate, authorizeRoles('residente'), (req, res) => {
  const contrato_id = req.params.id;
  const { concept_key, limite_desviacion, canal } = req.body;
  if (!concept_key || limite_desviacion === undefined) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const existing = store.findOne('alertas', a => a.contrato_id === contrato_id && a.concept_key === concept_key);
  if (existing) {
    const updated = store.update('alertas', existing.id, {
      limite_desviacion: parseFloat(limite_desviacion),
      canal: canal || 'sistema',
      estado: existing.estado || 'activa',
      actualizado_en: new Date().toISOString()
    });
    notificar({
      contrato_id,
      tipo: 'alerta_concepto',
      canal: canal || 'sistema',
      mensaje: `Alerta actualizada para el concepto ${concept_key}`,
      creado_para_rol: 'residente',
      relacionado_tipo: 'alerta',
      relacionado_id: existing.id
    });
    checkAlertasConcepto(contrato_id);
    return res.json({ message: "Alerta de concepto actualizada con exito", alerta: updated });
  } else {
    const newAlert = store.insert('alertas', {
      contrato_id,
      concept_key,
      limite_desviacion: parseFloat(limite_desviacion),
      canal: canal || 'sistema',
      estado: 'activa',
      disparada: false,
      creado_en: new Date().toISOString()
    });
    notificar({
      contrato_id,
      tipo: 'alerta_concepto',
      canal: canal || 'sistema',
      mensaje: `Alerta creada para el concepto ${concept_key}`,
      creado_para_rol: 'residente',
      relacionado_tipo: 'alerta',
      relacionado_id: newAlert.id
    });
    checkAlertasConcepto(contrato_id);
    return res.status(201).json({ message: "Alerta de concepto configurada con exito", alerta: newAlert });
  }
});

router.patch('/alertas/:id', authenticate, authorizeRoles('residente'), (req, res) => {
  const alerta = store.findOne('alertas', a => a.id === req.params.id);
  if (!alerta) return res.status(404).json({ error: "Alerta no encontrada" });
  const estado = req.body.estado;
  if (!['activa', 'pausada'].includes(estado)) {
    return res.status(400).json({ error: "Estado de alerta invalido" });
  }
  const updated = store.update('alertas', alerta.id, {
    estado,
    actualizado_en: new Date().toISOString()
  });
  return res.json({ message: estado === 'pausada' ? "Alerta pausada" : "Alerta reactivada", alerta: updated });
});

router.delete('/alertas/:id', authenticate, authorizeRoles('residente'), (req, res) => {
  store.delete('alertas', req.params.id);
  return res.json({ message: "Alerta de concepto eliminada con exito" });
});

module.exports = router;
