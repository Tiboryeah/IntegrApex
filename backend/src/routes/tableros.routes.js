const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { calcularPlazoLegal } = require('../utils/plazosLegales');

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

// HU-18: Vista ejecutiva del portafolio con semáforos.
//
// avance_programado ya no es un 60% fijo: se calcula acumulando, mes a mes,
// la parte del programa de obra (contract.programa) cuya fecha ya se cumplió,
// igual que la curva "programado" de HU-05 pero evaluada a la fecha de hoy.
function calcularAvanceProgramado(contract) {
  const inicio = new Date(contract.fecha_inicio);
  const hoy = new Date();
  if (hoy <= inicio) return 0;

  const scopeAmount = contract.catalogo.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0) || contract.monto;
  const mesesTranscurridos = Math.floor((hoy - inicio) / (30 * 24 * 60 * 60 * 1000)) + 1;

  let acumulado = 0;
  (contract.programa || []).forEach(mes => {
    if (mes.mes > mesesTranscurridos) return;
    Object.entries(mes.avances || {}).forEach(([clave, qty]) => {
      const concept = contract.catalogo.find(item => item.clave === clave);
      if (concept) acumulado += qty * concept.precio_unitario;
    });
  });

  return Math.min(100, (acumulado / scopeAmount) * 100);
}

// Avance físico real = subtotal de estimaciones pagadas hasta una fecha de corte,
// sobre el monto contractual. Se usa con "hoy" y con "fin del mes anterior" para
// poder comparar el periodo actual contra el anterior.
function calcularAvanceFisicoAFecha(contratoId, estimaciones, montoContrato, fechaCorte) {
  const pagadas = estimaciones.filter(e =>
    e.contrato_id === contratoId &&
    e.estado === 'pagada' &&
    e.fecha_pago_efectuado &&
    new Date(e.fecha_pago_efectuado) <= fechaCorte
  );
  const total = pagadas.reduce((sum, e) => sum + e.subtotal, 0);
  return montoContrato > 0 ? (total / montoContrato) * 100 : 0;
}

router.get('/tableros/portafolio', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const contracts = store.getCollection('contratos');
  const allEstimations = store.getCollection('estimaciones');
  const allFianzas = store.getCollection('fianzas');
  const allBitacoras = store.getCollection('bitacoras');
  const usuarios = store.getCollection('usuarios');

  const now = new Date();
  const inicioMesActual = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMesAnterior = new Date(inicioMesActual.getTime() - 1);

  const portafolio = contracts.map(c => {
    const estimacionesContrato = allEstimations.filter(e => e.contrato_id === c.id);
    const fianzasContrato = allFianzas.filter(f => f.contrato_id === c.id);
    const bitacoraContrato = allBitacoras.find(b => b.contrato_id === c.id);

    const avanceFisico = calcularAvanceFisicoAFecha(c.id, allEstimations, c.monto, now);
    const avanceFisicoMesAnterior = calcularAvanceFisicoAFecha(c.id, allEstimations, c.monto, finMesAnterior);
    const avanceProgramado = calcularAvanceProgramado(c);

    // Factor 2: atrasos en plazos legales (revisión de 15 días, pago de 20 días, fianzas vencidas).
    const estimacionesVencidas = estimacionesContrato.filter(e => {
      const plazoRevision = ['presentada', 'en_revision'].includes(e.estado) && e.fecha_presentacion
        ? calcularPlazoLegal(e.fecha_presentacion, 15) : null;
      const plazoPago = ['autorizada', 'en_pago'].includes(e.estado) && e.fecha_autorizacion_residencia
        ? calcularPlazoLegal(e.fecha_autorizacion_residencia, 20) : null;
      return (plazoRevision && plazoRevision.vencido) || (plazoPago && plazoPago.vencido);
    }).length;
    const fianzasVencidas = fianzasContrato.filter(f => f.vigencia && new Date(f.vigencia) < now).length;
    const atrasosLegales = estimacionesVencidas + fianzasVencidas;

    // Factor 3: pendientes sin atender reales (no "todas las notas" como antes)
    const estimacionesEnProceso = estimacionesContrato.filter(e => ['presentada', 'en_revision'].includes(e.estado)).length;
    const bitacoraSinFirmar = bitacoraContrato && !bitacoraContrato.completada ? 1 : 0;
    const pendientes = estimacionesEnProceso + bitacoraSinFirmar;

    let semaforo = 'verde';
    const brecha = avanceProgramado - avanceFisico;
    if (brecha > 15 || atrasosLegales > 0) {
      semaforo = 'rojo';
    } else if (brecha > 5 || pendientes >= 2) {
      semaforo = 'ambar';
    }

    const tendencia = avanceFisico > avanceFisicoMesAnterior ? 'subida' : avanceFisico < avanceFisicoMesAnterior ? 'bajada' : 'igual';
    const superintendente = usuarios.find(u => u.id === c.superintendente_id);

    return {
      id: c.id,
      folio: c.folio,
      objeto: c.objeto,
      monto: c.monto,
      contratista: superintendente ? superintendente.nombre : 'N/A',
      ejercicio_fiscal: new Date(c.fecha_inicio).getFullYear(),
      tipo_contratacion: c.modalidad_pago || 'N/A',
      avance_fisico: avanceFisico,
      avance_programado: avanceProgramado,
      avance_financiero: avanceFisico,
      avance_fisico_mes_anterior: avanceFisicoMesAnterior,
      tendencia,
      atrasos_legales: atrasosLegales,
      pendientes,
      semaforo
    };
  });

  const { agrupar_por } = req.query;
  if (['contratista', 'ejercicio_fiscal', 'tipo_contratacion'].includes(agrupar_por)) {
    const grupos = new Map();
    portafolio.forEach(p => {
      const clave = String(p[agrupar_por]);
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave).push(p);
    });
    return res.json({
      agrupado_por: agrupar_por,
      grupos: [...grupos.entries()].map(([clave, contratosGrupo]) => ({ clave, contratos: contratosGrupo }))
    });
  }

  return res.json(portafolio);
});

module.exports = router;
