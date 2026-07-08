function parseJsonField(value, fallback, fieldName) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    const err = new Error(`${fieldName} en formato invalido`);
    err.statusCode = 400;
    throw err;
  }
}

function normalizeMoney(value) {
  const n = parseFloat(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizePositiveNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

function buildAmortizacionPlan(subtotal, anticipoPorcentaje, plazoDias) {
  const meses = Math.max(1, Math.ceil(parseInt(plazoDias, 10) / 30));
  const anticipoMonto = subtotal * (anticipoPorcentaje / 100);
  const mensual = anticipoMonto / meses;
  return Array.from({ length: meses }, (_, idx) => ({
    periodo: idx + 1,
    porcentaje: parseFloat((anticipoPorcentaje / meses).toFixed(4)),
    monto: parseFloat(mensual.toFixed(2))
  }));
}

function validatePrograma(programa, catalogo, plazoDias) {
  const maxMes = Math.max(1, Math.ceil(parseInt(plazoDias, 10) / 30));
  const conceptKeys = new Set(catalogo.map(item => item.clave));
  const totals = {};

  if (!Array.isArray(programa) || programa.length === 0) {
    throw Object.assign(new Error("El programa de obra es obligatorio"), { statusCode: 400 });
  }

  programa.forEach(row => {
    const mes = parseInt(row.mes, 10);
    if (!Number.isInteger(mes) || mes < 1 || mes > maxMes) {
      throw Object.assign(new Error(`El programa contiene actividades fuera del plazo contractual. Mes permitido: 1 a ${maxMes}`), { statusCode: 400 });
    }
    Object.entries(row.avances || {}).forEach(([clave, cantidad]) => {
      if (!conceptKeys.has(clave)) {
        throw Object.assign(new Error(`El programa contiene el concepto ${clave}, que no pertenece al catalogo`), { statusCode: 400 });
      }
      totals[clave] = (totals[clave] || 0) + normalizeMoney(cantidad);
    });
  });

  catalogo.forEach(item => {
    if ((totals[item.clave] || 0) - parseFloat(item.cantidad) > 0.01) {
      throw Object.assign(new Error(`El programa excede la cantidad contratada para ${item.clave}`), { statusCode: 400 });
    }
  });
}

module.exports = {
  parseJsonField,
  normalizeMoney,
  normalizePositiveNumber,
  buildAmortizacionPlan,
  validatePrograma
};
