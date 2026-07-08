const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// HU-12: Integracion de estimacion
router.post('/contratos/:id/estimaciones/integrar', authenticate, authorizeRoles('contratista'), (req, res) => {
  const contrato_id = req.params.id;
  const { periodo_numero, fecha_inicio, fecha_fin, avances, notas_vinculadas_ids, penalizaciones } = req.body;

  if (!periodo_numero || !fecha_inicio || !fecha_fin || !avances) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const prevEstimations = store.find('estimaciones', e => e.contrato_id === contrato_id && e.estado !== 'rechazada');

  const cumulative = {};
  contract.catalogo.forEach(item => {
    cumulative[item.clave] = 0;
  });

  prevEstimations.forEach(e => {
    Object.keys(e.avances).forEach(k => {
      cumulative[k] = (cumulative[k] || 0) + parseFloat(e.avances[k]);
    });
  });

  for (const [clave, qty] of Object.entries(avances)) {
    const concept = contract.catalogo.find(item => item.clave === clave);
    if (!concept) {
      return res.status(400).json({ error: `Concepto ${clave} no pertenece al catalogo` });
    }
    const currentQty = parseFloat(qty || 0);
    const prevQty = cumulative[clave] || 0;
    if (prevQty + currentQty > concept.cantidad) {
      return res.status(400).json({
        error: `Restriccin del Art. 118 RLOPSRM: El avance acumulado para el concepto ${clave} (${(prevQty + currentQty).toFixed(2)}) excede la cantidad contratada (${concept.cantidad.toFixed(2)}) por ${(prevQty + currentQty - concept.cantidad).toFixed(2)}`
      });
    }
  }

  let subtotalEstimado = 0;
  Object.entries(avances).forEach(([clave, qty]) => {
    const concept = contract.catalogo.find(item => item.clave === clave);
    subtotalEstimado += parseFloat(qty) * concept.precio_unitario;
  });

  const iva = subtotalEstimado * 0.16;
  const totalEstimado = subtotalEstimado + iva;

  const anticipo_porcentaje = contract.anticipo_porcentaje || 30;
  const amortizacionAnticipo = subtotalEstimado * (anticipo_porcentaje / 100);

  const retencion5Millar = subtotalEstimado * 0.005;

  const penalizacionesMonto = parseFloat(penalizaciones || 0);
  const liquidoAPagar = totalEstimado - amortizacionAnticipo - retencion5Millar - penalizacionesMonto;

  const newEst = store.insert('estimaciones', {
    contrato_id,
    periodo_numero: parseInt(periodo_numero),
    fecha_inicio,
    fecha_fin,
    fecha_creacion: new Date().toISOString(),
    avances,
    notas_vinculadas_ids: notas_vinculadas_ids || [],
    subtotal: subtotalEstimado,
    iva,
    total: totalEstimado,
    anticipo_amortizado: amortizacionAnticipo,
    retencion_5_millar: retencion5Millar,
    penalizaciones: penalizacionesMonto,
    liquido_a_pagar: liquidoAPagar,
    estado: "borrador",
    observaciones: [],
    version_numero: 1
  });

  return res.status(201).json({ message: "Estimacion integrada en borrador", estimacion: newEst });
});

// HU-13: Envio de la estimacion
router.post('/estimaciones/:id/enviar', authenticate, authorizeRoles('contratista'), upload.single('pdf_soporte'), (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  const endDate = new Date(est.fecha_fin);
  const now = new Date();
  const diffTime = Math.abs(now - endDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 6 && now > endDate) {
    return res.status(400).json({ error: `Limite del Art. 54 LOPSRM: El plazo de presentacin (6 dias naturales) ha vencido.` });
  }

  store.update('estimaciones', est_id, {
    estado: "presentada",
    fecha_presentacion: now.toISOString(),
    pdf_soporte: req.file ? `/uploads/${req.file.filename}` : est.pdf_soporte
  });

  return res.json({ message: "Estimacion enviada formalmente a revision.", fecha_presentacion: now.toISOString() });
});

// GET estimations
router.get('/contratos/:id/estimaciones', authenticate, (req, res) => {
  const list = store.find('estimaciones', e => e.contrato_id === req.params.id);
  return res.json(list.sort((a, b) => a.periodo_numero - b.periodo_numero));
});

// HU-15: Revision tecnica (Supervision)
router.post('/estimaciones/:id/revisar', authenticate, authorizeRoles('supervision'), (req, res) => {
  const { observaciones } = req.body;
  const est = store.findOne('estimaciones', e => e.id === req.params.id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  if (est.estado !== 'presentada') {
    return res.status(400).json({ error: "La estimacion no se encuentra en estado 'presentada'." });
  }

  store.update('estimaciones', est.id, {
    estado: "en_revision",
    observaciones: observaciones || [],
    fecha_revision_supervision: new Date().toISOString()
  });

  return res.json({ message: "Estimacion revisada y turnada a Residencia" });
});

// HU-15: Autorizacion o Rechazo (Residencia)
router.post('/estimaciones/:id/resolver', authenticate, authorizeRoles('residente'), (req, res) => {
  const { resolucion, comentarios } = req.body;
  const est = store.findOne('estimaciones', e => e.id === req.params.id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  if (est.estado !== 'en_revision') {
    return res.status(400).json({ error: "La estimacion debe ser turnada por supervision (HU-15) antes de que residencia pueda resolverla." });
  }

  const finalState = resolucion === 'autorizada' ? 'autorizada' : 'rechazada';

  store.update('estimaciones', est.id, {
    node_id: est.id,
    estado: finalState,
    fecha_autorizacion_residencia: new Date().toISOString(),
    comentario_residencia: comentarios || ""
  });

  return res.json({ message: `Estimacion resuelta como: ${finalState}` });
});

// HU-16: Reingreso de estimacion tras rechazo
router.post('/estimaciones/:id/reingresar', authenticate, authorizeRoles('contratista'), (req, res) => {
  const oldEstId = req.params.id;
  const oldEst = store.findOne('estimaciones', e => e.id === oldEstId);
  if (!oldEst || oldEst.estado !== 'rechazada') {
    return res.status(400).json({ error: "La estimacion no existe o no ha sido rechazada" });
  }

  const { avances, notas_vinculadas_ids, penalizaciones } = req.body;
  const nextVersion = (oldEst.version_numero || 1) + 1;

  const contract = store.findOne('contratos', c => c.id === oldEst.contrato_id);
  let subtotal = 0;
  Object.entries(avances).forEach(([clave, qty]) => {
    const concept = contract.catalogo.find(item => item.clave === clave);
    subtotal += parseFloat(qty) * concept.precio_unitario;
  });

  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const amort = subtotal * (contract.anticipo_porcentaje / 100);
  const ret5 = subtotal * 0.005;
  const pen = parseFloat(penalizaciones || 0);
  const liquido = total - amort - ret5 - pen;

  const newEst = store.insert('estimaciones', {
    contrato_id: oldEst.contrato_id,
    periodo_numero: oldEst.periodo_numero,
    fecha_inicio: oldEst.fecha_inicio,
    fecha_fin: oldEst.fecha_fin,
    fecha_creacion: new Date().toISOString(),
    avances,
    notas_vinculadas_ids: notas_vinculadas_ids || [],
    subtotal,
    iva,
    total,
    anticipo_amortizado: amort,
    retencion_5_millar: ret5,
    penalizaciones: pen,
    liquido_a_pagar: liquido,
    estado: "borrador",
    observaciones: [],
    version_numero: nextVersion,
    estimacion_vinculada_id: oldEstId
  });

  return res.status(201).json({ message: "Nueva versin de estimacion integrada (reingreso)", estimacion: newEst });
});

module.exports = router;
