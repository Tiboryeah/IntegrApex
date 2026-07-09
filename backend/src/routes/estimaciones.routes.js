const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { buildWorkbookBuffer, sendXlsx } = require('../utils/xlsxExport');
const { buildTablePdfBuffer, sendPdf } = require('../utils/pdfExport');
const { calcularPlazoLegal } = require('../utils/plazosLegales');
const { parseJsonField } = require('../utils/validators');
const { checkAlertasConcepto } = require('../jobs/alertasScheduler');

const router = express.Router();

// HU-12: Integracion de estimacion. La estimacion se integra como una sola
// entidad: caratula (calculada), generadores (avances), registro fotografico
// y soportes (cargados aqui mismo, no hasta el envio de HU-13) y notas de
// bitacora seleccionadas desde el buscador de HU-10.
router.post('/contratos/:id/estimaciones/integrar', authenticate, authorizeRoles('contratista'), upload.fields([
  { name: 'fotos', maxCount: 10 },
  { name: 'soportes', maxCount: 10 }
]), (req, res) => {
  const contrato_id = req.params.id;
  const { periodo_numero, fecha_inicio, fecha_fin, penalizaciones } = req.body;
  let { avances, notas_vinculadas_ids } = req.body;

  if (!periodo_numero || !fecha_inicio || !fecha_fin || !avances) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    avances = parseJsonField(avances, {}, 'Avances');
    notas_vinculadas_ids = parseJsonField(notas_vinculadas_ids, [], 'Notas vinculadas');
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  if (Array.isArray(notas_vinculadas_ids) && notas_vinculadas_ids.length) {
    const notasValidas = store.find('notas', n => n.contrato_id === contrato_id).map(n => n.id);
    const idsInvalidos = notas_vinculadas_ids.filter(id => !notasValidas.includes(id));
    if (idsInvalidos.length) {
      return res.status(400).json({ error: `Las siguientes notas no pertenecen a este contrato: ${idsInvalidos.join(', ')}` });
    }
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

  const fotos = (req.files && req.files.fotos) ? req.files.fotos.map(f => ({ path: `/uploads/${f.filename}`, nombre: f.originalname })) : [];
  const soportes = (req.files && req.files.soportes) ? req.files.soportes.map(f => ({ path: `/uploads/${f.filename}`, nombre: f.originalname })) : [];

  const newEst = store.insert('estimaciones', {
    contrato_id,
    periodo_numero: parseInt(periodo_numero),
    fecha_inicio,
    fecha_fin,
    fecha_creacion: new Date().toISOString(),
    avances,
    notas_vinculadas_ids: notas_vinculadas_ids || [],
    fotos,
    soportes,
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

  // HU-07: el avance real del contrato cambio, reevaluar si alguna alerta de concepto debe dispararse
  checkAlertasConcepto(contrato_id);

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

  const contract = store.findOne('contratos', c => c.id === est.contrato_id);
  const mensaje = `Estimacion Periodo #${est.periodo_numero} del contrato ${contract ? contract.folio : est.contrato_id} fue presentada y espera revision. Plazo de revision: 15 dias naturales (Art. 54 LOPSRM).`;
  ['supervision', 'residente'].forEach(rol => {
    store.insert('notificaciones', {
      contrato_id: est.contrato_id,
      tipo: 'estimacion_presentada',
      canal: 'sistema',
      mensaje,
      leida: false,
      creado_para_rol: rol,
      creado_en: now.toISOString()
    });
  });

  return res.json({ message: "Estimacion enviada formalmente a revision.", fecha_presentacion: now.toISOString() });
});

// HU-14: Historial de estimaciones con filtros por periodo y estado (AND)
// HU-13/HU-15: incluye el semaforo de 15 dias de revision (Art. 54 LOPSRM)
// HU-20: incluye el semaforo de 20 dias de pago (Art. 54 LOPSRM)
router.get('/contratos/:id/estimaciones', authenticate, (req, res) => {
  const { periodo, estado } = req.query;
  let list = store.find('estimaciones', e => e.contrato_id === req.params.id);
  if (periodo) list = list.filter(e => String(e.periodo_numero) === String(periodo));
  if (estado) list = list.filter(e => e.estado === estado);

  const withPlazos = list.map(e => ({
    ...e,
    plazo_revision: ['presentada', 'en_revision'].includes(e.estado) && e.fecha_presentacion
      ? calcularPlazoLegal(e.fecha_presentacion, 15)
      : null,
    plazo_pago: ['autorizada', 'en_pago'].includes(e.estado) && e.fecha_autorizacion_residencia
      ? calcularPlazoLegal(e.fecha_autorizacion_residencia, 20)
      : null
  }));

  return res.json(withPlazos.sort((a, b) => a.periodo_numero - b.periodo_numero));
});

// HU-15: Revision tecnica (Supervision), seccion por seccion. Cada observacion
// trae seccion (caratula/generadores/fotos/soportes/notas), tipo, severidad y,
// cuando aplica, el concepto del catalogo al que se refiere.
const SECCIONES_REVISION = ['caratula', 'generadores', 'fotos', 'soportes', 'notas'];

router.post('/estimaciones/:id/revisar', authenticate, authorizeRoles('supervision'), (req, res) => {
  const { observaciones } = req.body;
  const est = store.findOne('estimaciones', e => e.id === req.params.id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  if (est.estado !== 'presentada') {
    return res.status(400).json({ error: "La estimacion no se encuentra en estado 'presentada'." });
  }

  const observacionesLista = Array.isArray(observaciones) ? observaciones : [];
  for (const obs of observacionesLista) {
    if (!obs.seccion || !SECCIONES_REVISION.includes(obs.seccion)) {
      return res.status(400).json({ error: `Cada observacion debe indicar una seccion valida: ${SECCIONES_REVISION.join(', ')}` });
    }
    if (!obs.comentario) {
      return res.status(400).json({ error: "Cada observacion debe incluir un comentario" });
    }
  }

  store.update('estimaciones', est.id, {
    estado: "en_revision",
    observaciones: observacionesLista.map(o => ({
      seccion: o.seccion,
      concepto: o.concepto || null,
      tipo: o.tipo || 'General',
      severidad: o.severidad || 'Media',
      comentario: o.comentario
    })),
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

// HU-16: Descargar las observaciones de una estimacion (tipicamente la version rechazada)
router.get('/estimaciones/:id/observaciones/export', authenticate, async (req, res, next) => {
  try {
    const est = store.findOne('estimaciones', e => e.id === req.params.id);
    if (!est) return res.status(404).json({ error: "Estimacion no encontrada" });

    const contract = store.findOne('contratos', c => c.id === est.contrato_id);
    const observaciones = est.observaciones || [];

    const columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Seccion', key: 'seccion', width: 16 },
      { header: 'Concepto', key: 'concepto', width: 14 },
      { header: 'Tipo', key: 'tipo', width: 16 },
      { header: 'Severidad', key: 'severidad', width: 14 },
      { header: 'Observacion', key: 'comentario', width: 60 }
    ];
    const rows = observaciones.map((o, idx) => ({
      num: idx + 1,
      seccion: o.seccion || '',
      concepto: o.concepto || '',
      tipo: o.tipo || '',
      severidad: o.severidad || '',
      comentario: o.comentario || ''
    }));

    const title = `Observaciones - Periodo #${est.periodo_numero} (${est.estado})`;
    const subtitle = [
      contract ? `Contrato: ${contract.folio}` : null,
      est.fecha_revision_supervision ? `Revisado: ${new Date(est.fecha_revision_supervision).toLocaleString('es-MX')}` : null,
      est.comentario_residencia ? `Resolucion de residencia: ${est.comentario_residencia}` : null
    ].filter(Boolean).join(' | ');

    const { formato } = req.query;
    if (formato === 'pdf') {
      const buffer = await buildTablePdfBuffer(title, subtitle, columns, rows);
      return sendPdf(res, `observaciones_${est.id}.pdf`, buffer);
    }

    const buffer = await buildWorkbookBuffer('Observaciones', columns, rows);
    return sendXlsx(res, `observaciones_${est.id}.xlsx`, buffer);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
