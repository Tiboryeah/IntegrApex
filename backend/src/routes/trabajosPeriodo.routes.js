const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { parseJsonField, normalizeMoney } = require('../utils/validators');
const { checkAlertasConcepto } = require('../jobs/alertasScheduler');

const router = express.Router();

// HU-06: Trabajos terminados por periodo
router.get('/contratos/:id/trabajos-periodo', authenticate, (req, res) => {
  const list = store.find('trabajos_periodo', t => t.contrato_id === req.params.id);
  return res.json(list.sort((a, b) => a.periodo_numero - b.periodo_numero));
});

router.post('/contratos/:id/trabajos-periodo', authenticate, authorizeRoles('contratista'), (req, res) => {
  const contrato_id = req.params.id;
  const { periodo_numero, fecha_inicio, fecha_fin, nota_bitacora_id, observaciones } = req.body;
  let { cantidades } = req.body;
  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) return res.status(404).json({ error: "Contrato no encontrado" });
  if (!periodo_numero || !fecha_inicio || !fecha_fin || !cantidades || !nota_bitacora_id) {
    return res.status(400).json({ error: "Periodo, fechas, cantidades y nota de bitacora son obligatorios" });
  }
  try {
    cantidades = parseJsonField(cantidades, {}, 'Cantidades ejecutadas');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const nota = store.findOne('notas', n => n.id === nota_bitacora_id && n.contrato_id === contrato_id);
  if (!nota) {
    return res.status(400).json({ error: "La nota de bitacora vinculada no existe para este contrato" });
  }

  const prevTrabajos = store.find('trabajos_periodo', t => t.contrato_id === contrato_id && t.estado !== 'cancelado');
  const prevEstimaciones = store.find('estimaciones', e => e.contrato_id === contrato_id && e.estado !== 'rechazada');
  const acumulado = {};
  contract.catalogo.forEach(c => { acumulado[c.clave] = 0; });
  prevTrabajos.forEach(t => Object.entries(t.cantidades || {}).forEach(([clave, qty]) => {
    acumulado[clave] = (acumulado[clave] || 0) + normalizeMoney(qty);
  }));
  prevEstimaciones.forEach(e => Object.entries(e.avances || {}).forEach(([clave, qty]) => {
    acumulado[clave] = (acumulado[clave] || 0) + normalizeMoney(qty);
  }));

  for (const [clave, qty] of Object.entries(cantidades || {})) {
    const concept = contract.catalogo.find(c => c.clave === clave);
    if (!concept) {
      return res.status(400).json({ error: `Concepto ${clave} no pertenece al catalogo` });
    }
    const total = (acumulado[clave] || 0) + normalizeMoney(qty);
    if (total - normalizeMoney(concept.cantidad) > 0.01) {
      return res.status(400).json({ error: `Restriccion Art. 118 RLOPSRM: ${clave} excede cantidad contratada` });
    }
  }

  try {
    const trabajo = store.insert('trabajos_periodo', {
      contrato_id,
      periodo_numero: parseInt(periodo_numero, 10),
      fecha_inicio,
      fecha_fin,
      cantidades,
      nota_bitacora_id,
      observaciones: observaciones || "",
      estado: 'registrado',
      creado_por_id: req.user.id,
      creado_por_nombre: req.user.nombre,
      creado_en: new Date().toISOString()
    });

    // HU-07: el avance real del contrato cambió; se reevalúan alertas por concepto.
    checkAlertasConcepto(contrato_id);

    return res.status(201).json({ message: "Trabajos terminados registrados con éxito", trabajo });
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }
});

module.exports = router;
