const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// HU-20: Transito a pago - suficiencia presupuestal
router.post('/estimaciones/:id/presupuesto', authenticate, authorizeRoles('contratista', 'finanzas'), (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) return res.status(404).json({ error: "Estimacion no encontrada" });

  const techoAnualDisponible = 15000000.00;

  if (est.liquido_a_pagar > techoAnualDisponible) {
    return res.status(400).json({
      error: `Restriccin del Art. 24 LOPSRM: Insuficiencia presupuestal. El total de la estimacion ($${est.liquido_a_pagar.toFixed(2)}) excede el presupuesto disponible ($${techoAnualDisponible.toFixed(2)}).`
    });
  }

  return res.json({
    message: "Verificacion de suficiencia presupuestal exitosa (Art. 24 LOPSRM).",
    disponible: techoAnualDisponible,
    solicitado: est.liquido_a_pagar
  });
});

// HU-20: Cargar soportes y generar instruccion
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

  store.update('estimaciones', est_id, {
    estado: 'en_pago',
    pdf_factura: `/uploads/${req.files['factura'][0].filename}`,
    pdf_cfdi: `/uploads/${req.files['cfdi'][0].filename}`,
    fecha_instruccion_pago: new Date().toISOString()
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
