const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// HU-20: Transito a pago - suficiencia presupuestal (Art. 24 LOPSRM), contra el
// techo contractual real del contrato (monto menos lo ya comprometido/pagado en
// otras estimaciones), no un techo global compartido entre todos los contratos.
router.post('/estimaciones/:id/presupuesto', authenticate, authorizeRoles('contratista', 'finanzas'), (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) return res.status(404).json({ error: "Estimacion no encontrada" });

  const contract = store.findOne('contratos', c => c.id === est.contrato_id);
  if (!contract) return res.status(404).json({ error: "Contrato no encontrado" });

  const comprometidoEnOtras = store.find('estimaciones', e =>
    e.contrato_id === est.contrato_id &&
    e.id !== est.id &&
    ['autorizada', 'en_pago', 'pagada'].includes(e.estado)
  ).reduce((sum, e) => sum + (e.liquido_a_pagar || 0), 0);

  const techoDisponible = contract.monto - comprometidoEnOtras;

  if (est.liquido_a_pagar > techoDisponible) {
    return res.status(400).json({
      error: `Restriccin del Art. 24 LOPSRM: Insuficiencia presupuestal. El liquido de la estimacion ($${est.liquido_a_pagar.toFixed(2)}) excede el presupuesto contractual disponible del contrato ${contract.folio} ($${techoDisponible.toFixed(2)}).`
    });
  }

  return res.json({
    message: "Verificacion de suficiencia presupuestal exitosa (Art. 24 LOPSRM).",
    disponible: techoDisponible,
    solicitado: est.liquido_a_pagar
  });
});

// HU-20: Cargar soportes y generar instruccion. Exige factura, CFDI y, cuando el
// contrato tiene registrada una fianza de cumplimiento, que siga vigente.
router.post('/estimaciones/:id/instruccion-pago', authenticate, authorizeRoles('contratista', 'finanzas'), upload.fields([
  { name: 'factura', maxCount: 1 },
  { name: 'cfdi', maxCount: 1 }
]), (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) return res.status(404).json({ error: "Estimacion no encontrada" });

  if (est.estado !== 'autorizada') {
    return res.status(400).json({ error: "La estimacion debe estar en estado 'autorizada'." });
  }

  if (!req.files || !req.files['factura'] || !req.files['cfdi']) {
    return res.status(400).json({ error: "Debe cargar la Factura y el XML de CFDI correspondientes" });
  }

  const fianzaCumplimiento = store.findOne('fianzas', f => f.contrato_id === est.contrato_id && f.tipo === 'cumplimiento');
  if (fianzaCumplimiento) {
    if (fianzaCumplimiento.vigencia && new Date(fianzaCumplimiento.vigencia) < new Date()) {
      return res.status(400).json({ error: "La fianza de cumplimiento del contrato esta vencida. Debe renovarse/endosarse antes de generar la instruccion de pago." });
    }
  }

  const now = new Date().toISOString();
  store.update('estimaciones', est_id, {
    estado: 'en_pago',
    pdf_factura: `/uploads/${req.files['factura'][0].filename}`,
    pdf_cfdi: `/uploads/${req.files['cfdi'][0].filename}`,
    fecha_instruccion_pago: now
  });

  const contract = store.findOne('contratos', c => c.id === est.contrato_id);
  store.insert('notificaciones', {
    contrato_id: est.contrato_id,
    tipo: 'instruccion_pago',
    canal: 'sistema',
    mensaje: `Instruccion de pago generada para la estimacion Periodo #${est.periodo_numero} del contrato ${contract ? contract.folio : est.contrato_id}. Plazo de pago: 20 dias naturales (Art. 54 LOPSRM).`,
    leida: false,
    creado_para_rol: 'finanzas',
    creado_en: now
  });

  return res.json({ message: "Instruccin de pago generada. Estatus actualizado a 'en_pago'." });
});

// HU-21: Registrar el pago efectuado
router.post('/estimaciones/:id/registrar-pago', authenticate, authorizeRoles('finanzas'), (req, res) => {
  const est_id = req.params.id;
  const { banco_referencia, notas_pago } = req.body;

  if (!banco_referencia) {
    return res.status(400).json({ error: "La referencia de transferencia bancaria es requerida" });
  }

  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est || est.estado !== 'en_pago') {
    return res.status(400).json({ error: "La estimacion debe estar en transito de pago." });
  }

  store.update('estimaciones', est_id, {
    estado: 'pagada',
    fecha_pago_efectuado: new Date().toISOString(),
    pago_referencia: banco_referencia,
    pago_notas: notas_pago || "",
    pago_usuario_id: req.user.id
  });

  store.insert('pagos', {
    estimacion_id: est_id,
    contrato_id: est.contrato_id,
    periodo: est.periodo_numero,
    monto: est.liquido_a_pagar,
    fecha: new Date().toISOString(),
    referencia: banco_referencia,
    registrado_por: req.user.nombre
  });

  return res.json({ message: "Pago registrado y conciliado con exito." });
});

module.exports = router;
