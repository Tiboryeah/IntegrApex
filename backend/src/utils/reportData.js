// Filtros de periodo y definiciones de los 7 reportes de HU-19.
// Se comparten entre la consulta JSON y la exportación XLSX/PDF para mantener consistencia.

function isWithinPeriod(dateStr, periodoTipo, periodoValor) {
  if (!periodoTipo || periodoTipo === 'acumulado' || !periodoValor) return true;
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  if (periodoTipo === 'mensual') {
    // periodoValor: "YYYY-MM"
    const [y, m] = periodoValor.split('-').map(Number);
    return date.getFullYear() === y && (date.getMonth() + 1) === m;
  }

  if (periodoTipo === 'trimestral') {
    // periodoValor: "YYYY-Q" (Q = 1..4)
    const [y, q] = periodoValor.split('-').map(Number);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return date.getFullYear() === y && quarter === q;
  }

  return true;
}

function buildReporteData(contract, notes, estimations, convenios, filters = {}) {
  const { periodo_tipo, periodo_valor } = filters;
  const matches = dateStr => isWithinPeriod(dateStr, periodo_tipo, periodo_valor);

  const estimationsInPeriod = estimations.filter(e => matches(e.fecha_creacion));
  const notesInPeriod = notes.filter(n => matches(n.fecha));
  const conveniosInPeriod = convenios.filter(c => matches(c.creado_en));

  return {
    fisico: {
      avance_fisico_real: estimationsInPeriod.filter(e => e.estado === 'pagada' || e.estado === 'autorizada').reduce((sum, e) => sum + e.subtotal, 0),
      programado: contract.monto,
      conceptos: contract.catalogo
    },
    financiero: {
      total_pagado: estimationsInPeriod.filter(e => e.estado === 'pagada').reduce((sum, e) => sum + e.liquido_a_pagar, 0),
      techo: contract.monto,
      anticipo_amortizado: estimationsInPeriod.reduce((sum, e) => sum + e.anticipo_amortizado, 0)
    },
    estimaciones: estimationsInPeriod.map(e => ({ periodo: e.periodo_numero, estado: e.estado, total: e.total, liquido: e.liquido_a_pagar })),
    observaciones: estimationsInPeriod.flatMap(e => (e.observaciones || []).map(o => ({ periodo: e.periodo_numero, ...o }))),
    bitacora: notesInPeriod.map(n => ({ folio: n.folio, tipo: n.tipo, autor: n.creado_por_nombre, fecha: n.fecha })),
    modificatorios: conveniosInPeriod,
    penalizaciones: estimationsInPeriod.map(e => ({ periodo: e.periodo_numero, monto: e.penalizaciones })).filter(p => p.monto > 0)
  };
}

const money = v => `$${(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

// Una entrada por reporte. `rows` y `subtitle` reciben datos ya filtrados por periodo.
const REPORT_DEFINITIONS = {
  fisico: {
    label: 'Avance Fisico de Obra',
    columns: [
      { header: 'Clave', key: 'clave' },
      { header: 'Concepto', key: 'descripcion' },
      { header: 'Unidad', key: 'unidad' },
      { header: 'Cantidad Contratada', key: 'cantidad' },
      { header: 'Precio Unitario', key: 'precio_unitario' },
      { header: 'Importe Contratado', key: 'importe' }
    ],
    rows: data => data.fisico.conceptos.map(c => ({
      clave: c.clave, descripcion: c.descripcion, unidad: c.unidad,
      cantidad: c.cantidad, precio_unitario: money(c.precio_unitario), importe: money(c.precio_unitario * c.cantidad)
    })),
    subtitle: data => `Avance físico real: ${money(data.fisico.avance_fisico_real)} de ${money(data.fisico.programado)} programado`
  },
  financiero: {
    label: 'Avance Financiero',
    columns: [
      { header: 'Concepto Financiero', key: 'concepto' },
      { header: 'Monto Contractual', key: 'contractual' },
      { header: 'Monto Pagado', key: 'pagado' },
      { header: 'Avance Financiero', key: 'avance' }
    ],
    rows: data => {
      const pct = data.financiero.techo > 0 ? (data.financiero.total_pagado / data.financiero.techo) * 100 : 0;
      return [
        { concepto: 'Techo Presupuestal Contractual', contractual: money(data.financiero.techo), pagado: money(data.financiero.total_pagado), avance: `${pct.toFixed(2)}%` },
        { concepto: 'Amortizacion Anticipo Acumulada', contractual: '-', pagado: money(data.financiero.anticipo_amortizado), avance: '-' }
      ];
    }
  },
  estimaciones: {
    label: 'Historial de estimaciones',
    columns: [
      { header: 'Periodo', key: 'periodo' },
      { header: 'Estado', key: 'estado' },
      { header: 'Importe Total', key: 'total' },
      { header: 'Liquido a Pagar', key: 'liquido' }
    ],
    rows: data => data.estimaciones.map(e => ({ periodo: e.periodo, estado: e.estado, total: money(e.total), liquido: money(e.liquido) }))
  },
  observaciones: {
    label: 'Observaciones de Revision',
    columns: [
      { header: 'Periodo', key: 'periodo' },
      { header: 'Seccion', key: 'seccion' },
      { header: 'Concepto', key: 'concepto' },
      { header: 'Tipo', key: 'tipo' },
      { header: 'Severidad', key: 'severidad' },
      { header: 'Observacion Tecnica', key: 'comentario' }
    ],
    rows: data => data.observaciones.map(o => ({
      periodo: o.periodo,
      seccion: o.seccion || '',
      concepto: o.concepto || '',
      tipo: o.tipo || '',
      severidad: o.severidad || '',
      comentario: o.comentario || ''
    }))
  },
  bitacora: {
    label: 'Bitácora de notas',
    columns: [
      { header: 'Folio', key: 'folio' },
      { header: 'Tipo', key: 'tipo' },
      { header: 'Autor', key: 'autor' },
      { header: 'Fecha', key: 'fecha' }
    ],
    rows: data => data.bitacora.map(n => ({ folio: n.folio, tipo: n.tipo, autor: n.autor, fecha: n.fecha ? new Date(n.fecha).toLocaleDateString('es-MX') : '' }))
  },
  modificatorios: {
    label: 'Convenios Modificatorios',
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Descripción', key: 'descripcion' },
      { header: 'Ajuste Monto', key: 'cambio_monto' },
      { header: 'Ajuste Plazo', key: 'cambio_plazo' },
      { header: 'Articulo LOPSRM', key: 'articulo' },
      { header: 'Fecha', key: 'fecha' }
    ],
    rows: data => data.modificatorios.map(m => ({
      id: m.id, descripcion: m.descripcion, cambio_monto: money(m.cambio_monto),
      cambio_plazo: `${m.cambio_plazo} días`, articulo: m.articulo_aplicado,
      fecha: m.creado_en ? new Date(m.creado_en).toLocaleDateString('es-MX') : ''
    }))
  },
  penalizaciones: {
    label: 'Registro de Penalizaciones',
    columns: [
      { header: 'Periodo', key: 'periodo' },
      { header: 'Monto Penalizacion / Deductiva', key: 'monto' }
    ],
    rows: data => data.penalizaciones.map(p => ({ periodo: p.periodo, monto: money(p.monto) }))
  }
};

module.exports = { buildReporteData, isWithinPeriod, REPORT_DEFINITIONS };
