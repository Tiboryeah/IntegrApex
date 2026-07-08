const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// HU-17: Tablero de estimaciones aceptadas y en proceso
const ESTADOS_ACTIVOS = ['presentada', 'en_revision', 'autorizada', 'en_pago', 'pagada'];

function buildLineaTiempo(e) {
  const hitos = [
    { estado: 'borrador', fecha: e.fecha_creacion },
    { estado: 'presentada', fecha: e.fecha_presentacion },
    { estado: 'en_revision', fecha: e.fecha_revision_supervision },
    { estado: e.estado === 'rechazada' ? 'rechazada' : 'autorizada', fecha: e.fecha_autorizacion_residencia },
    { estado: 'en_pago', fecha: e.fecha_instruccion_pago },
    { estado: 'pagada', fecha: e.fecha_pago_efectuado }
  ];
  return hitos.filter(h => !!h.fecha).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

router.get('/tableros/estimaciones-activas', authenticate, (req, res) => {
  const user = req.user;
  const allEstimations = store.getCollection('estimaciones');
  const contracts = store.getCollection('contratos');

  const activeEstimations = [];
  allEstimations.forEach(e => {
    if (!ESTADOS_ACTIVOS.includes(e.estado)) return;

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
    if (user.rol === 'contratista' && e.estado === 'autorizada') requiereMiAccion = true;
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
      requiere_mi_accion: requiereMiAccion,
      linea_tiempo: buildLineaTiempo(e)
    });
  });

  const resumen = {
    total: activeEstimations.length,
    monto_total: activeEstimations.reduce((sum, e) => sum + (e.monto || 0), 0),
    requieren_mi_accion: activeEstimations.filter(e => e.requiere_mi_accion).length,
    por_estado: ESTADOS_ACTIVOS.reduce((acc, estado) => {
      const enEseEstado = activeEstimations.filter(e => e.estado === estado);
      acc[estado] = {
        count: enEseEstado.length,
        monto: enEseEstado.reduce((sum, e) => sum + (e.monto || 0), 0)
      };
      return acc;
    }, {})
  };

  return res.json({ resumen, estimaciones: activeEstimations });
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

module.exports = router;
