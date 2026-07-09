// HU-07: avance real por concepto (ejecutado / contratado), usado para decidir
// si una alerta de atraso debe dispararse. Misma fuente de datos (trabajos_periodo
// + estimaciones no rechazadas) que ya usa el bloqueo Art. 118 de HU-06.
const store = require('../db/store');
const { normalizeMoney } = require('./validators');

function calcularAvanceConceptos(contract) {
  const trabajos = store.find('trabajos_periodo', t => t.contrato_id === contract.id && t.estado !== 'cancelado');
  const estimaciones = store.find('estimaciones', e => e.contrato_id === contract.id && e.estado !== 'rechazada');

  const resultado = {};
  contract.catalogo.forEach(c => {
    resultado[c.clave] = { ejecutado: 0, contratado: normalizeMoney(c.cantidad), pct: 0 };
  });

  trabajos.forEach(t => Object.entries(t.cantidades || {}).forEach(([clave, qty]) => {
    if (resultado[clave]) resultado[clave].ejecutado += normalizeMoney(qty);
  }));
  estimaciones.forEach(e => Object.entries(e.avances || {}).forEach(([clave, qty]) => {
    if (resultado[clave]) resultado[clave].ejecutado += normalizeMoney(qty);
  }));

  Object.values(resultado).forEach(r => {
    r.pct = r.contratado > 0 ? (r.ejecutado / r.contratado) * 100 : 0;
  });

  return resultado;
}

module.exports = { calcularAvanceConceptos };
