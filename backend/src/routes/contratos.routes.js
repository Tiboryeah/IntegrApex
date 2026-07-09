const express = require('express');

const store = require('../db/store');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  parseJsonField,
  normalizeMoney,
  normalizePositiveNumber,
  buildAmortizacionPlan,
  validatePrograma
} = require('../utils/validators');

const router = express.Router();

function userCanAccessContract(user, contract) {
  if (user.rol === 'dependencia' || user.rol === 'finanzas') return true;
  return contract.residente_id === user.id ||
    contract.superintendente_id === user.id ||
    contract.supervision_id === user.id ||
    contract.creado_por_id === user.id;
}

// Alta de contratos (HU-01)
router.post('/contratos', authenticate, authorizeRoles('residente'), upload.fields([
  { name: 'pdf_contrato', maxCount: 1 },
  { name: 'jur_dep_file', maxCount: 1 },
  { name: 'jur_cont_file', maxCount: 1 }
]), (req, res) => {
  let {
    folio,
    objeto,
    monto,
    anticipo_porcentaje,
    plazo_dias,
    fecha_inicio,
    modalidad_pago,
    residente_id,
    superintendente_id,
    supervision_id,
    catalogo,
    programa,
    juridicos,
    garantias,
    amortizacion_plan,
    penalizaciones
  } = req.body;

  if (!folio || !objeto || !monto || !plazo_dias || !fecha_inicio || !residente_id || !superintendente_id) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const exists = store.findOne('contratos', c => c.folio === folio);
  if (exists) {
    return res.status(400).json({ error: `El folio de contrato ${folio} ya existe` });
  }

  try {
    catalogo = parseJsonField(catalogo, [], 'Catálogo');
    programa = parseJsonField(programa, [], 'Programa de obra');
    juridicos = parseJsonField(juridicos, {}, 'Elementos juridicos');
    garantias = parseJsonField(garantias, [], 'Garantías');
    amortizacion_plan = parseJsonField(amortizacion_plan, [], 'Plan de amortizacion');
    penalizaciones = parseJsonField(penalizaciones, [], 'Penalizaciones');
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }

  // Validaciones de consistencia contractual.
  const subtotal = parseFloat(monto);
  if (!Array.isArray(catalogo) || catalogo.length === 0) {
    return res.status(400).json({ error: "El catalogo de conceptos es obligatorio" });
  }

  const sumCat = catalogo.reduce((sum, item) => sum + (parseFloat(item.precio_unitario) * parseFloat(item.cantidad)), 0);
  if (Math.abs(sumCat - subtotal) > 0.01) {
    return res.status(400).json({ error: `La suma de conceptos del catalogo (${sumCat.toFixed(2)}) no coincide con el monto total sin IVA (${subtotal.toFixed(2)})` });
  }

  for (const item of catalogo) {
    if (!item.clave || !item.descripcion || !item.unidad) {
      return res.status(400).json({ error: "Cada concepto debe incluir clave, descripcion y unidad" });
    }
    if (normalizePositiveNumber(item.precio_unitario) <= 0 || normalizePositiveNumber(item.cantidad) <= 0) {
      return res.status(400).json({ error: "Todos los conceptos del catalogo deben tener precio y cantidad mayores a cero" });
    }
  }

  try {
    validatePrograma(programa, catalogo, plazo_dias);
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }

  const requiredGuarantees = ['anticipo', 'cumplimiento', 'vicios_ocultos'];
  const guaranteesByType = new Map((Array.isArray(garantias) ? garantias : []).map(g => [g.tipo, g]));
  for (const tipo of requiredGuarantees) {
    const guarantee = guaranteesByType.get(tipo);
    if (!guarantee || normalizeMoney(guarantee.monto) <= 0) {
      return res.status(400).json({ error: `La garantía de ${tipo.replace('_', ' ')} debe capturarse con monto mayor a cero` });
    }
  }

  const startDate = new Date(fecha_inicio);
  const endDate = new Date(startDate.getTime() + (parseInt(plazo_dias) * 24 * 60 * 60 * 1000));
  const fecha_termino = endDate.toISOString().split('T')[0];

  const ant_pct = parseFloat(anticipo_porcentaje || 30);
  const ant_monto = subtotal * (ant_pct / 100);
  const finalAmortizacionPlan = Array.isArray(amortizacion_plan) && amortizacion_plan.length > 0
    ? amortizacion_plan.map(p => ({ periodo: parseInt(p.periodo, 10), porcentaje: normalizeMoney(p.porcentaje), monto: normalizeMoney(p.monto) }))
    : buildAmortizacionPlan(subtotal, ant_pct, plazo_dias);

  const filesMap = req.files || {};
  const pdfFile = filesMap['pdf_contrato']?.[0];
  const jurDepFile = filesMap['jur_dep_file']?.[0];
  const jurContFile = filesMap['jur_cont_file']?.[0];

  const newContract = store.insert('contratos', {
    folio,
    objeto,
    estado: 'vigente',
    dependencia_id: req.body.dependencia_id || null,
    empresa_id: req.body.empresa_id || null,
    monto: subtotal,
    anticipo_porcentaje: ant_pct,
    anticipo_monto: ant_monto,
    plazo_dias: parseInt(plazo_dias),
    fecha_inicio,
    fecha_termino,
    modalidad_pago,
    residente_id,
    superintendente_id,
    supervision_id,
    pdf_contrato: pdfFile ? `/uploads/${pdfFile.filename}` : null,
    pdf_contrato_inmutable: Boolean(pdfFile),
    catalogo,
    programa,
    juridicos: {
      dependencia: juridicos.dependencia || "",
      dependencia_path: jurDepFile ? `/uploads/${jurDepFile.filename}` : null,
      contratista: juridicos.contratista || "",
      contratista_path: jurContFile ? `/uploads/${jurContFile.filename}` : null,
      fundamento_legal: juridicos.fundamento_legal || "LOPSRM / RLOPSRM"
    },
    garantias: garantias.map(g => ({
      tipo: g.tipo,
      afianzadora: g.afianzadora || "",
      vigencia: g.vigencia || null,
      monto: normalizeMoney(g.monto),
      estado: "registrada"
    })),
    amortizacion_plan: finalAmortizacionPlan,
    penalizaciones: Array.isArray(penalizaciones) ? penalizaciones.map(p => ({
      tipo: p.tipo || "general",
      descripcion: p.descripcion || "",
      porcentaje: normalizeMoney(p.porcentaje),
      monto_base: normalizeMoney(p.monto_base || subtotal)
    })) : [],
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  if (pdfFile) {
    store.insert('documentos', {
      contrato_id: newContract.id,
      tipo: 'contrato_firmado',
      nombre: pdfFile.originalname,
      path: `/uploads/${pdfFile.filename}`,
      inmutable: true,
      creado_por_id: req.user.id,
      creado_por_nombre: req.user.nombre,
      creado_en: new Date().toISOString()
    });
  }

  if (jurDepFile) {
    store.insert('documentos', {
      contrato_id: newContract.id,
      tipo: 'elementos_dependencia',
      nombre: jurDepFile.originalname,
      path: `/uploads/${jurDepFile.filename}`,
      inmutable: true,
      creado_por_id: req.user.id,
      creado_por_nombre: req.user.nombre,
      creado_en: new Date().toISOString()
    });
  }

  if (jurContFile) {
    store.insert('documentos', {
      contrato_id: newContract.id,
      tipo: 'elementos_contratista',
      nombre: jurContFile.originalname,
      path: `/uploads/${jurContFile.filename}`,
      inmutable: true,
      creado_por_id: req.user.id,
      creado_por_nombre: req.user.nombre,
      creado_en: new Date().toISOString()
    });
  }

  newContract.garantias.forEach(g => {
    store.insert('fianzas', {
      contrato_id: newContract.id,
      tipo: g.tipo,
      afianzadora: g.afianzadora,
      vigencia: g.vigencia,
      monto: g.monto,
      umbrales_alerta: [30, 15, 5],
      pdf_poliza: null,
      origen: 'alta_contrato',
      creado_por_id: req.user.id,
      creado_por_nombre: req.user.nombre,
      creado_en: new Date().toISOString()
    });
  });

  store.insert('contrato_versiones', {
    contrato_id: newContract.id,
    version: 1,
    motivo: 'Alta inicial del contrato',
    snapshot: newContract,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  return res.status(201).json({ message: "Contrato creado con éxito", contrato: newContract });
});

// Consulta de contratos visibles para el usuario.
router.get('/contratos', authenticate, (req, res) => {
  const all = store.getCollection('contratos');
  const user = req.user;

  if (user.rol === 'dependencia' || user.rol === 'finanzas') {
    return res.json(all);
  }

  const filtered = all.filter(c =>
    c.residente_id === user.id ||
    c.superintendente_id === user.id ||
    c.supervision_id === user.id ||
    c.creado_por_id === user.id
  );
  return res.json(filtered);
});

// Consulta detallada de contrato (HU-04).
router.get('/contratos/:id', authenticate, (req, res) => {
  const contract = store.findOne('contratos', c => c.id === req.params.id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const user = req.user;
  if (!userCanAccessContract(user, contract)) {
    return res.status(403).json({ error: "No tienes acceso a este contrato" });
  }

  const contractBonds = store.find('fianzas', f => f.contrato_id === contract.id).map(f => ({
    ...f,
    endosos: store.find('fianza_endosos', e => e.fianza_id === f.id)
  }));
  const contractConvenios = store.find('convenios', c => c.contrato_id === contract.id);
  const contractMinutas = store.find('minutas', m => m.contrato_id === contract.id);
  const contractVisitas = store.find('visitas', v => v.contrato_id === contract.id);
  const contractAlertas = store.find('alertas', a => a.contrato_id === contract.id);
  const contractDocumentos = store.find('documentos', d => d.contrato_id === contract.id);
  const contractVersiones = store.find('contrato_versiones', v => v.contrato_id === contract.id);
  const contractTrabajos = store.find('trabajos_periodo', t => t.contrato_id === contract.id);

  return res.json({
    ...contract,
    fianzas: contractBonds,
    convenios: contractConvenios,
    minutas: contractMinutas,
    visitas: contractVisitas,
    alertas: contractAlertas,
    documentos: contractDocumentos,
    versiones: contractVersiones,
    trabajos_periodo: contractTrabajos
  });
});

router.get('/contratos/:id/expediente/search', authenticate, (req, res) => {
  const contract = store.findOne('contratos', c => c.id === req.params.id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const user = req.user;
  if (!userCanAccessContract(user, contract)) {
    return res.status(403).json({ error: "No tienes acceso a este contrato" });
  }

  const { folio, contratista, objeto, periodo, tipo_documento, query } = req.query;
  const users = store.getCollection('usuarios');
  const contractor = users.find(u => u.id === contract.superintendente_id);
  const notes = store.find('notas', n => n.contrato_id === contract.id);
  const docs = store.find('documentos', d => d.contrato_id === contract.id);
  const bonds = store.find('fianzas', f => f.contrato_id === contract.id);
  const convenios = store.find('convenios', c => c.contrato_id === contract.id);
  const minutas = store.find('minutas', m => m.contrato_id === contract.id);
  const visitas = store.find('visitas', v => v.contrato_id === contract.id);

  const items = [
    {
      bloque: 'configuracion',
      tipo: 'contrato',
      titulo: contract.folio,
      descripcion: contract.objeto,
      fecha: contract.creado_en,
      archivo: contract.pdf_contrato || null,
      datos: contract
    },
    ...docs.map(d => ({ bloque: 'documentos', tipo: d.tipo, titulo: d.nombre, descripcion: d.path, fecha: d.creado_en, archivo: d.path || null, datos: d })),
    ...bonds.map(f => ({ bloque: 'fianzas', tipo: f.tipo, titulo: `${f.tipo} - ${f.afianzadora}`, descripcion: `Vigencia ${f.vigencia}`, fecha: f.creado_en, archivo: f.pdf_poliza || null, datos: f })),
    ...convenios.map(c => ({ bloque: 'convenios', tipo: 'convenio', titulo: c.descripcion, descripcion: c.motivo || c.articulo_aplicado, fecha: c.creado_en, archivo: null, datos: c })),
    ...minutas.map(m => ({ bloque: 'minutas', tipo: 'minuta', titulo: m.descripcion, descripcion: m.fecha_reunion, fecha: m.fecha_reunion, archivo: m.pdf_path || null, datos: m })),
    ...visitas.map(v => ({ bloque: 'visitas', tipo: 'visita', titulo: v.descripcion, descripcion: `${v.fecha_visita} ${v.asistentes || ''}`, fecha: v.fecha_visita, archivo: null, datos: v })),
    ...notes.map(n => ({ bloque: 'bitacora', tipo: n.tipo, titulo: `Nota ${n.folio}`, descripcion: n.contenido, fecha: n.fecha, archivo: null, datos: n }))
  ];

  const lower = value => String(value || '').toLowerCase();
  const periodMatches = item => {
    if (!periodo) return true;
    return lower(item.fecha).includes(lower(periodo)) || lower(item.descripcion).includes(lower(periodo));
  };

  const filtered = items.filter(item => {
    if (folio && !lower(contract.folio).includes(lower(folio))) return false;
    if (contratista && !lower(contractor ? `${contractor.nombre} ${contractor.email}` : '').includes(lower(contratista))) return false;
    if (objeto && !lower(contract.objeto).includes(lower(objeto))) return false;
    if (tipo_documento && lower(item.tipo) !== lower(tipo_documento) && lower(item.bloque) !== lower(tipo_documento)) return false;
    if (!periodMatches(item)) return false;
    if (query) {
      const haystack = lower(`${item.bloque} ${item.tipo} ${item.titulo} ${item.descripcion}`);
      if (!haystack.includes(lower(query))) return false;
    }
    return true;
  });

  return res.json(filtered);
});

module.exports = router;
