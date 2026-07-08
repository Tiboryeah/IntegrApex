const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { parseJsonField, normalizeMoney, validatePrograma } = require('../utils/validators');

const router = express.Router();

// HU-03: Convenios modificatorios
router.post('/contratos/:id/convenios', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const contrato_id = req.params.id;
  let { descripcion, motivo, cambio_monto, cambio_plazo, catalogo_nuevo, programa_nuevo } = req.body;

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  if (!descripcion) {
    return res.status(400).json({ error: "Descripcion del convenio requerida" });
  }

  try {
    catalogo_nuevo = parseJsonField(catalogo_nuevo, null, 'Catalogo nuevo');
    programa_nuevo = parseJsonField(programa_nuevo, null, 'Programa nuevo');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const c_monto = parseFloat(cambio_monto || 0);
  const c_plazo = parseInt(cambio_plazo || 0);

  const isExceeding = (Math.abs(c_monto) > contract.monto * 0.5) || (Math.abs(c_plazo) > contract.plazo_dias * 0.5);
  const lopsrm_articulo = isExceeding ? "Art. 59 Bis LOPSRM (modificacion excedente del 50%)" : "Art. 59 LOPSRM (modificacion ordinaria)";

  const originalMonto = contract.monto;
  const originalPlazo = contract.plazo_dias;
  const newMonto = originalMonto + c_monto;
  const newPlazo = originalPlazo + c_plazo;

  if (newMonto <= 0 || newPlazo <= 0) {
    return res.status(400).json({ error: "El convenio no puede dejar monto o plazo contractual en cero o negativo" });
  }

  const finalCatalogo = catalogo_nuevo || contract.catalogo;
  const finalPrograma = programa_nuevo || contract.programa;

  try {
    validatePrograma(finalPrograma, finalCatalogo, newPlazo);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }

  const startDate = new Date(contract.fecha_inicio);
  const endDate = new Date(startDate.getTime() + (newPlazo * 24 * 60 * 60 * 1000));
  const newFechaTermino = endDate.toISOString().split('T')[0];

  const snapshotPrevio = JSON.parse(JSON.stringify(contract));
  let versiones = store.find('contrato_versiones', v => v.contrato_id === contrato_id);
  if (versiones.length === 0) {
    store.insert('contrato_versiones', {
      contrato_id,
      version: 1,
      motivo: 'Version base previa a convenio',
      snapshot: snapshotPrevio,
      creado_por_id: req.user.id,
      creado_por_nombre: req.user.nombre,
      creado_en: new Date().toISOString()
    });
    versiones = store.find('contrato_versiones', v => v.contrato_id === contrato_id);
  }
  const nextVersion = versiones.reduce((max, v) => Math.max(max, parseInt(v.version || 0, 10)), 0) + 1;

  const updatedContract = store.update('contratos', contrato_id, {
    monto: newMonto,
    plazo_dias: newPlazo,
    fecha_termino: newFechaTermino,
    catalogo: finalCatalogo,
    programa: finalPrograma,
    actualizado_en: new Date().toISOString()
  });

  const convenio = store.insert('convenios', {
    contrato_id,
    descripcion,
    motivo: motivo || descripcion,
    cambio_monto: c_monto,
    cambio_plazo: c_plazo,
    monto_previo: originalMonto,
    monto_nuevo: newMonto,
    plazo_previo: originalPlazo,
    plazo_nuevo: newPlazo,
    version_previa: nextVersion - 1,
    version_nueva: nextVersion,
    catalogo_versionado: true,
    programa_versionado: true,
    articulo_aplicado: lopsrm_articulo,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  const fianzas = store.find('fianzas', f => f.contrato_id === contrato_id);
  const endosos = fianzas.map(f => store.insert('fianza_endosos', {
    fianza_id: f.id,
    contrato_id,
    convenio_id: convenio.id,
    descripcion: `Endoso generado por convenio ${convenio.id}`,
    cambio_monto: c_monto !== 0 ? normalizeMoney(f.monto) * (c_monto / originalMonto) : 0,
    monto_previo: normalizeMoney(f.monto),
    monto_nuevo: c_monto !== 0 ? normalizeMoney(f.monto) + (normalizeMoney(f.monto) * (c_monto / originalMonto)) : normalizeMoney(f.monto),
    vigencia_previa: f.vigencia,
    nueva_vigencia: newFechaTermino > f.vigencia ? newFechaTermino : f.vigencia,
    pdf_endoso: null,
    estado: 'pendiente_documento',
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  }));

  endosos.forEach(endoso => {
    store.update('fianzas', endoso.fianza_id, {
      monto: endoso.monto_nuevo,
      vigencia: endoso.nueva_vigencia,
      actualizado_en: new Date().toISOString()
    });
  });

  store.insert('contrato_versiones', {
    contrato_id,
    version: nextVersion,
    motivo: motivo || descripcion,
    convenio_id: convenio.id,
    snapshot_previo: snapshotPrevio,
    snapshot: updatedContract,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  return res.json({ message: "Convenio modificatorio aplicado con exito", convenio, lopsrm_articulo, endosos_generados: endosos.length });
});

module.exports = router;
