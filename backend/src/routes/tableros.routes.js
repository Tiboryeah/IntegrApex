const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// HU-17: Tablero de estimaciones aceptadas y en proceso
router.get('/tableros/estimaciones-activas', authenticate, (req, res) => {
  const user = req.user;
  const allEstimations = store.getCollection('estimaciones');
  const contracts = store.getCollection('contratos');

  const activeEstimations = [];
  allEstimations.forEach(e => {
    if (e.estado === 'rechazada' || e.estado === 'borrador') return;

    const contract = contracts.find(c => c.id === e.contrato_id);
    if (!contract) return;

    if (user.rol !== 'dependencia' && user.rol !== 'finanzas') {
      if (contract.residente_id !== user.id && contract.superintendente_id !== user.id && contract.supervision_id !== user.id) {
        return;
      }
    }

    let requiereMiAccion = false;
    if (user.rol === 'supervision' && e.estado === 'presentada') requiereMiAccion = true;
    if (user.rol === 'residente' && e.estado === 'en_revision') requiereMiAccion = true;
    if (user.rol === 'finanzas' && e.estado === 'en_pago') requiereMiAccion = true;

    const startTime = e.fecha_presentacion ? new Date(e.fecha_presentacion) : new Date(e.fecha_creacion);
    const elapsedDays = Math.ceil((new Date() - startTime) / (1000 * 60 * 60 * 24));

    activeEstimations.push({
      id: e.id,
      contrato_id: e.contrato_id,
      folio_contrato: contract.folio,
      periodo: e.periodo_numero,
      estado: e.estado,
      monto: e.liquido_a_pagar,
      dias_transcurridos: elapsedDays,
      requiere_mi_accion: requiereMiAccion
    });
  });

  return res.json(activeEstimations);
});

// HU-18: Vista ejecutiva del portafolio con semaforos
router.get('/tableros/portafolio', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const contracts = store.getCollection('contratos');
  const allEstimations = store.getCollection('estimaciones');
  const allNotes = store.getCollection('notas');

  const portafolio = contracts.map(c => {
    const estimations = allEstimations.filter(e => e.contrato_id === c.id && e.estado === 'pagada');
    const totalSubtotalPagado = estimations.reduce((sum, e) => sum + e.subtotal, 0);

    const percentFisico = (totalSubtotalPagado / c.monto) * 100;
    const percentProgramado = 60.0;

    let color = "verde";
    const diff = percentProgramado - percentFisico;
    if (diff > 15) {
      color = "rojo";
    } else if (diff > 5) {
      color = "ambar";
    }

    const pendingNotes = allNotes.filter(n => n.contrato_id === c.id).length;

    return {
      id: c.id,
      folio: c.folio,
      objeto: c.objeto,
      monto: c.monto,
      avance_fisico: percentFisico,
      avance_programado: percentProgramado,
      avance_financiero: percentFisico,
      semaforo: color,
      pendientes: pendingNotes
    };
  });

  return res.json(portafolio);
});

// HU-19: Exportacion de reportes (entrega datos)
router.get('/contratos/:id/reporte-data', authenticate, (req, res) => {
  const contractId = req.params.id;
  const contract = store.findOne('contratos', c => c.id === contractId);
  if (!contract) return res.status(404).json({ error: "Contrato no encontrado" });

  const notes = store.find('notas', n => n.contrato_id === contractId);
  const estimations = store.find('estimaciones', e => e.contrato_id === contractId);
  const convenios = store.find('convenios', c => c.contrato_id === contractId);
  const fianzas = store.find('fianzas', f => f.contrato_id === contractId);

  const reportes = {
    fisico: {
      avance_fisico_real: estimations.filter(e => e.estado === 'pagada' || e.estado === 'autorizada').reduce((sum, e) => sum + e.subtotal, 0),
      programado: contract.monto,
      conceptos: contract.catalogo
    },
    financiero: {
      total_pagado: estimations.filter(e => e.estado === 'pagada').reduce((sum, e) => sum + e.liquido_a_pagar, 0),
      techo: contract.monto,
      anticipo_amortizado: estimations.reduce((sum, e) => sum + e.anticipo_amortizado, 0)
    },
    estimaciones: estimations.map(e => ({ periodo: e.periodo_numero, estado: e.estado, total: e.total, liquido: e.liquido_a_pagar })),
    observaciones: estimations.flatMap(e => e.observaciones.map(o => ({ periodo: e.periodo_numero, ...o }))),
    bitacora: notes.map(n => ({ folio: n.folio, tipo: n.tipo, autor: n.creado_por_nombre, fecha: n.fecha })),
    modificatorios: convenios,
    penalizaciones: estimations.map(e => ({ periodo: e.periodo_numero, monto: e.penalizaciones })).filter(p => p.monto > 0)
  };

  return res.json(reportes);
});

module.exports = router;
