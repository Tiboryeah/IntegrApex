// HU-02: alerta real de vencimiento de fianzas a 30/15/5 días (configurable vía umbrales_alerta).
// HU-07: disparo real de la alerta de atraso por concepto cuando el avance real cae bajo el umbral.
// Sin infraestructura de cron externa, este job corre dentro del propio proceso Node
// (arranca con el servidor y se repite por intervalo) además de evaluarse al vuelo
// justo después de los eventos que pueden cruzar un umbral (nueva fianza, endoso,
// trabajos por periodo, integración de estimación, alta/edición de alerta).
const store = require('../db/store');
const { notificar } = require('../utils/notificar');
const { calcularAvanceConceptos } = require('../utils/avanceConceptos');

const MS_POR_DIA = 1000 * 60 * 60 * 24;

function diasRestantes(vigencia) {
  if (!vigencia) return null;
  const fecha = new Date(vigencia);
  if (Number.isNaN(fecha.getTime())) return null;
  return Math.ceil((fecha.getTime() - Date.now()) / MS_POR_DIA);
}

// HU-02
function checkFianzasVigencia() {
  const fianzas = store.getCollection('fianzas');
  const contratos = store.getCollection('contratos');

  fianzas.forEach(f => {
    const restantes = diasRestantes(f.vigencia);
    if (restantes === null) return;

    const umbrales = Array.isArray(f.umbrales_alerta) && f.umbrales_alerta.length ? f.umbrales_alerta : [30, 15, 5];
    const emitidas = new Set(f.alertas_emitidas || []);
    let cambiado = false;

    umbrales.forEach(umbral => {
      if (restantes <= umbral && !emitidas.has(umbral)) {
        const contract = contratos.find(c => c.id === f.contrato_id);
        notificar({
          contrato_id: f.contrato_id,
          tipo: 'fianza_vencimiento',
          canal: 'sistema',
          mensaje: `La fianza de ${(f.tipo || '').replace('_', ' ')} (${f.afianzadora}) del contrato ${contract ? contract.folio : f.contrato_id} ${restantes >= 0 ? `vence en ${restantes} día(s)` : `venció hace ${Math.abs(restantes)} día(s)`} (vigencia ${f.vigencia}). Umbral configurado: ${umbral} días.`,
          creado_para_rol: 'dependencia',
          relacionado_tipo: 'fianza',
          relacionado_id: f.id
        });
        emitidas.add(umbral);
        cambiado = true;
      }
    });

    if (cambiado) {
      store.update('fianzas', f.id, { alertas_emitidas: [...emitidas] });
    }
  });
}

// HU-07: se llama tras cualquier evento que modifique el avance real de un contrato
// (trabajos por periodo, integración de estimación) o tras crear/editar una alerta.
function checkAlertasConcepto(contratoId) {
  const contract = store.findOne('contratos', c => c.id === contratoId);
  if (!contract) return;

  const alertas = store.find('alertas', a => a.contrato_id === contratoId && a.estado === 'activa');
  if (!alertas.length) return;

  const avance = calcularAvanceConceptos(contract);

  alertas.forEach(a => {
    const info = avance[a.concept_key];
    if (!info) return;
    const pct = info.pct;

    if (pct < a.limite_desviacion) {
      if (!a.disparada) {
        notificar({
          contrato_id: contratoId,
          tipo: 'alerta_concepto_disparo',
          canal: a.canal || 'sistema',
          mensaje: `Atraso detectado en ${contract.folio}: el concepto ${a.concept_key} tiene ${pct.toFixed(1)}% de avance real, por debajo del umbral configurado de ${a.limite_desviacion}%.`,
          creado_para_rol: 'residente',
          relacionado_tipo: 'alerta',
          relacionado_id: a.id
        });
        store.update('alertas', a.id, { disparada: true, disparada_en: new Date().toISOString(), ultimo_avance_pct: pct });
      } else {
        store.update('alertas', a.id, { ultimo_avance_pct: pct });
      }
    } else if (a.disparada) {
      store.update('alertas', a.id, { disparada: false, ultimo_avance_pct: pct });
    } else {
      store.update('alertas', a.id, { ultimo_avance_pct: pct });
    }
  });
}

let intervalHandle = null;

function startScheduler(intervalMs = 60 * 60 * 1000) {
  checkFianzasVigencia();
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(checkFianzasVigencia, intervalMs);
  return intervalHandle;
}

module.exports = { checkFianzasVigencia, checkAlertasConcepto, startScheduler };
