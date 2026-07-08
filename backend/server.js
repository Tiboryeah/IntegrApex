const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const store = require('./src/db/store');
const { authenticate, authorizeRoles, JWT_SECRET } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const uploadsDir = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/uploads', express.static(uploadsDir));

// Multer upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

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

// ==========================================
// 1. AUTHENTICATION & ACCESS CONTROL API
// ==========================================

// HU-00: Inicio de sesion por rol
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contrasena requeridos" });
  }

  const user = store.findOne('usuarios', u => u.email === email);
  if (!user || user.contrasena !== password) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  if (user.estado === 'pendiente') {
    return res.status(403).json({ error: "Su cuenta esta pendiente de aprobacion por la Dependencia" });
  }

  // Deduce role from db user record
  const token = jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  return res.json({
    message: "Inicio de sesion exitoso",
    user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }
  });
});

// Registro de usuario (nuevo solicitante)
app.post('/api/auth/register', (req, res) => {
  const { email, password, nombre, rol } = req.body;
  if (!email || !password || !nombre || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const exists = store.findOne('usuarios', u => u.email === email);
  if (exists) {
    return res.status(400).json({ error: "El correo ya esta registrado" });
  }

  const newUser = store.insert('usuarios', {
    email,
    contrasena: password,
    nombre,
    rol, // Rol solicitado
    estado: "pendiente"
  });

  return res.status(201).json({
    message: "Solicitud registrada con exito. Pendiente de aprobacion.",
    user: { id: newUser.id, email: newUser.email, nombre: newUser.nombre, rol: newUser.rol, estado: newUser.estado }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: "Sesion cerrada correctamente" });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  return res.json({ user: req.user });
});

app.get('/api/users', authenticate, (req, res) => {
  const users = store.getCollection('usuarios').map(u => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    estado: u.estado
  }));
  return res.json(users);
});

// Admin Aprobacion (Dependencia)
app.get('/api/admin/requests', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const pending = store.find('usuarios', u => u.estado === 'pendiente');
  return res.json(pending);
});

app.post('/api/admin/approve', authenticate, authorizeRoles('dependencia'), (req, res) => {
  const { userId, approve, role } = req.body; // approve: true/false, role: final assigned role
  if (!userId) {
    return res.status(400).json({ error: "ID de usuario requerido" });
  }

  const user = store.findOne('usuarios', u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  if (approve) {
    store.update('usuarios', userId, {
      estado: 'aprobado',
      rol: role || user.rol, // Can override role during approval
      aprobado_por: req.user.nombre,
      aprobado_en: new Date().toISOString()
    });
    return res.json({ message: "Usuario aprobado con exito" });
  } else {
    store.update('usuarios', userId, { estado: 'rechazado' });
    return res.json({ message: "Usuario rechazado" });
  }
});

// ==========================================
// 2. CONTRATOS API
// ==========================================

// Alta de contratos (HU-01)
app.post('/api/contratos', authenticate, authorizeRoles('residente'), upload.single('pdf_contrato'), (req, res) => {
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
    catalogo = parseJsonField(catalogo, [], 'Catalogo');
    programa = parseJsonField(programa, [], 'Programa de obra');
    juridicos = parseJsonField(juridicos, {}, 'Elementos juridicos');
    garantias = parseJsonField(garantias, [], 'Garantias');
    amortizacion_plan = parseJsonField(amortizacion_plan, [], 'Plan de amortizacion');
    penalizaciones = parseJsonField(penalizaciones, [], 'Penalizaciones');
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }

  // Validations
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
      return res.status(400).json({ error: `La garantia de ${tipo.replace('_', ' ')} debe capturarse con monto mayor a cero` });
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

  const newContract = store.insert('contratos', {
    folio,
    objeto,
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
    pdf_contrato: req.file ? `/uploads/${req.file.filename}` : null,
    pdf_contrato_inmutable: Boolean(req.file),
    catalogo,
    programa,
    juridicos: {
      dependencia: juridicos.dependencia || "",
      contratista: juridicos.contratista || "",
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

  if (req.file) {
    store.insert('documentos', {
      contrato_id: newContract.id,
      tipo: 'contrato_firmado',
      nombre: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
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

  return res.status(201).json({ message: "Contrato creado con exito", contrato: newContract });
});

// GET all contracts
app.get('/api/contratos', authenticate, (req, res) => {
  const all = store.getCollection('contratos');
  const user = req.user;

  if (user.rol === 'dependencia' || user.rol === 'finanzas') {
    return res.json(all);
  }

  const filtered = all.filter(c => 
    c.residente_id === user.id || 
    c.superintendente_id === user.id || 
    c.supervision_id === user.id
  );
  return res.json(filtered);
});

// GET detailed contract (HU-04)
app.get('/api/contratos/:id', authenticate, (req, res) => {
  const contract = store.findOne('contratos', c => c.id === req.params.id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const user = req.user;
  if (user.rol !== 'dependencia' && user.rol !== 'finanzas') {
    if (contract.residente_id !== user.id && contract.superintendente_id !== user.id && contract.supervision_id !== user.id) {
      return res.status(403).json({ error: "No tienes acceso a este contrato" });
    }
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

app.get('/api/contratos/:id/expediente/search', authenticate, (req, res) => {
  const contract = store.findOne('contratos', c => c.id === req.params.id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const user = req.user;
  if (user.rol !== 'dependencia' && user.rol !== 'finanzas') {
    if (contract.residente_id !== user.id && contract.superintendente_id !== user.id && contract.supervision_id !== user.id) {
      return res.status(403).json({ error: "No tienes acceso a este contrato" });
    }
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
      datos: contract
    },
    ...docs.map(d => ({ bloque: 'documentos', tipo: d.tipo, titulo: d.nombre, descripcion: d.path, fecha: d.creado_en, datos: d })),
    ...bonds.map(f => ({ bloque: 'fianzas', tipo: f.tipo, titulo: `${f.tipo} - ${f.afianzadora}`, descripcion: `Vigencia ${f.vigencia}`, fecha: f.creado_en, datos: f })),
    ...convenios.map(c => ({ bloque: 'convenios', tipo: 'convenio', titulo: c.descripcion, descripcion: c.motivo || c.articulo_aplicado, fecha: c.creado_en, datos: c })),
    ...minutas.map(m => ({ bloque: 'minutas', tipo: 'minuta', titulo: m.descripcion, descripcion: m.fecha_reunion, fecha: m.fecha_reunion, datos: m })),
    ...visitas.map(v => ({ bloque: 'visitas', tipo: 'visita', titulo: v.descripcion, descripcion: `${v.fecha_visita} ${v.asistentes || ''}`, fecha: v.fecha_visita, datos: v })),
    ...notes.map(n => ({ bloque: 'bitacora', tipo: n.tipo, titulo: `Nota ${n.folio}`, descripcion: n.contenido, fecha: n.fecha, datos: n }))
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

// ==========================================
// 3. FIANZAS / GARANTAS API (HU-02)
// ==========================================
app.post('/api/contratos/:id/fianzas', authenticate, authorizeRoles('dependencia'), upload.single('pdf_poliza'), (req, res) => {
  const contrato_id = req.params.id;
  const { afianzadora, vigencia, monto, tipo } = req.body;
  let { umbrales_alerta } = req.body;

  if (!afianzadora || !vigencia || !monto || !tipo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  try {
    umbrales_alerta = parseJsonField(umbrales_alerta, [30, 15, 5], 'Umbrales de alerta');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const thresholds = (Array.isArray(umbrales_alerta) ? umbrales_alerta : [30, 15, 5])
    .map(n => parseInt(n, 10))
    .filter(n => Number.isInteger(n) && n > 0)
    .sort((a, b) => b - a);

  const newBond = store.insert('fianzas', {
    contrato_id,
    tipo,
    afianzadora,
    vigencia,
    monto: parseFloat(monto),
    umbrales_alerta: thresholds.length ? thresholds : [30, 15, 5],
    pdf_poliza: req.file ? `/uploads/${req.file.filename}` : null,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  return res.status(201).json({ message: "Garantia registrada con exito", fianza: newBond });
});

app.post('/api/fianzas/:id/endosos', authenticate, authorizeRoles('dependencia'), upload.single('pdf_endoso'), (req, res) => {
  const fianza = store.findOne('fianzas', f => f.id === req.params.id);
  if (!fianza) {
    return res.status(404).json({ error: "Fianza no encontrada" });
  }

  const { descripcion, cambio_monto, nueva_vigencia, convenio_id } = req.body;
  if (!descripcion) {
    return res.status(400).json({ error: "Descripcion del endoso requerida" });
  }

  const endoso = store.insert('fianza_endosos', {
    fianza_id: fianza.id,
    contrato_id: fianza.contrato_id,
    convenio_id: convenio_id || null,
    descripcion,
    cambio_monto: normalizeMoney(cambio_monto),
    monto_previo: normalizeMoney(fianza.monto),
    monto_nuevo: normalizeMoney(fianza.monto) + normalizeMoney(cambio_monto),
    vigencia_previa: fianza.vigencia,
    nueva_vigencia: nueva_vigencia || fianza.vigencia,
    pdf_endoso: req.file ? `/uploads/${req.file.filename}` : null,
    creado_por_id: req.user.id,
    creado_por_nombre: req.user.nombre,
    creado_en: new Date().toISOString()
  });

  store.update('fianzas', fianza.id, {
    monto: endoso.monto_nuevo,
    vigencia: endoso.nueva_vigencia,
    actualizado_en: new Date().toISOString()
  });

  return res.status(201).json({ message: "Endoso registrado con exito", endoso });
});

// ==========================================
// 4. CONVENIOS MODIFICATORIOS (HU-03)
// ==========================================
app.post('/api/contratos/:id/convenios', authenticate, authorizeRoles('dependencia'), (req, res) => {
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

// ==========================================
// 5. BITCORA ELECTRNICA API (HU-08, HU-09, HU-10, Por Firmar)
// ==========================================

// HU-08: Apertura formal
app.post('/api/contratos/:id/bitacora/aperturar', authenticate, authorizeRoles('residente'), (req, res) => {
  const contrato_id = req.params.id;
  const { fecha_entrega_sitio } = req.body;

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const exists = store.findOne('bitacoras', b => b.contrato_id === contrato_id);
  if (exists) {
    return res.status(400).json({ error: "La bitacora de este contrato ya fue aperturada" });
  }

  const bitacora = store.insert('bitacoras', {
    contrato_id,
    fecha_entrega_sitio,
    firmantes: [
      { user_id: contract.residente_id, rol: 'residente', firmado: false, fecha_firma: null },
      { user_id: contract.superintendente_id, rol: 'contratista', firmado: false, fecha_firma: null },
      ...(contract.supervision_id ? [{ user_id: contract.supervision_id, rol: 'supervision', firmado: false, fecha_firma: null }] : [])
    ],
    completada: false
  });

  return res.status(201).json({ message: "Bitacora creada en borrador. Pendiente de firmas de representantes.", bitacora });
});

// Por Firmar: Bandeja de firmas pendientes
app.get('/api/bitacora/por-firmar', authenticate, (req, res) => {
  const user = req.user;
  const bitacoras = store.getCollection('bitacoras');
  const contratos = store.getCollection('contratos');

  const pendingSignatures = [];
  bitacoras.forEach(b => {
    const signature = b.firmantes.find(f => f.user_id === user.id);
    if (signature && !signature.firmado) {
      const contract = contratos.find(c => c.id === b.contrato_id);
      pendingSignatures.push({
        bitacora_id: b.id,
        contrato_id: b.contrato_id,
        folio: contract ? contract.folio : "N/A",
        objeto: contract ? contract.objeto : "N/A",
        fecha_entrega_sitio: b.fecha_entrega_sitio
      });
    }
  });

  return res.json(pendingSignatures);
});

// Por Firmar: Firmar apertura
app.post('/api/bitacora/:id/firmar', authenticate, (req, res) => {
  const bitacora_id = req.params.id;
  const user = req.user;

  const bitacora = store.findOne('bitacoras', b => b.id === bitacora_id);
  if (!bitacora) {
    return res.status(404).json({ error: "Registro de bitacora no encontrado" });
  }

  const signatureIdx = bitacora.firmantes.findIndex(f => f.user_id === user.id);
  if (signatureIdx === -1) {
    return res.status(403).json({ error: "No eres un firmante autorizado para esta bitacora" });
  }

  if (bitacora.firmantes[signatureIdx].firmado) {
    return res.status(400).json({ error: "Ya has firmado esta apertura" });
  }

  bitacora.firmantes[signatureIdx].firmado = true;
  bitacora.firmantes[signatureIdx].fecha_firma = new Date().toISOString();

  const allSigned = bitacora.firmantes.every(f => f.firmado);
  bitacora.completada = allSigned;

  store.update('bitacoras', bitacora_id, bitacora);

  if (allSigned) {
    const contract = store.findOne('contratos', c => c.id === bitacora.contrato_id);
    store.insert('notas', {
      contrato_id: bitacora.contrato_id,
      folio: 1,
      tipo: "Apertura",
      contenido: `Nota de Apertura Formal de Bitacora. Contrato Folio: ${contract.folio}. Objeto: ${contract.objeto}. Monto Contractual: $${contract.monto.toFixed(2)} M.N. Plazo: ${contract.plazo_dias} dias naturales con inicio el ${contract.fecha_inicio} y termino el ${contract.fecha_termino}. Representantes autorizados: Residente (${contract.residente_id}), Superintendente (${contract.superintendente_id}), Supervision (${contract.supervision_id || 'N/A'}). De acuerdo con el Art. 122 RLOPSRM.`,
      creado_por_nombre: "Sistema IntegrApex (Firma conjunta)",
      creado_por_id: "system",
      creado_por_rol: "sistema",
      fecha: new Date().toISOString(),
      vinculo_nota_id: null
    });
  }

  return res.json({ message: "Firma registrada con exito", bitacora });
});

// HU-09: Emisin y respuesta de notas
app.post('/api/contratos/:id/bitacora/notas', authenticate, (req, res) => {
  const contrato_id = req.params.id;
  const { tipo, contenido, vinculo_nota_id } = req.body;
  const user = req.user;

  if (!tipo || !contenido) {
    return res.status(400).json({ error: "Tipo y contenido requeridos" });
  }

  const bitacora = store.findOne('bitacoras', b => b.contrato_id === contrato_id);
  if (!bitacora || !bitacora.completada) {
    return res.status(400).json({ error: "La bitacora no ha sido aperturada formalmente o le faltan firmas" });
  }

  const validTypes = {
    residente: ['Autorizacion', 'Aprobacion', 'Instruccin', 'General'],
    contratista: ['Solicitud', 'Aviso', 'Entrega', 'General'],
    supervision: ['Avance', 'Incidencia', 'Reporte', 'General']
  };

  const allowedTypes = validTypes[user.rol] || ['General'];
  if (!allowedTypes.includes(tipo)) {
    return res.status(403).json({ error: `Tu rol no tiene permitido emitir notas del tipo ${tipo}. Permitidos: ${allowedTypes.join(', ')}` });
  }

  const contractNotes = store.find('notas', n => n.contrato_id === contrato_id);
  const nextFolio = contractNotes.reduce((max, n) => Math.max(max, n.folio), 0) + 1;

  const signatureHash = require('crypto').createHash('sha256').update(`${user.id}_${nextFolio}_${Date.now()}`).digest('hex');

  const newNote = store.insert('notas', {
    contrato_id,
    folio: nextFolio,
    tipo,
    contenido,
    creado_por_nombre: user.nombre,
    creado_por_id: user.id,
    creado_por_rol: user.rol,
    fecha: new Date().toISOString(),
    firma_hash: signatureHash,
    vinculo_nota_id: vinculo_nota_id || null
  });

  return res.status(201).json({ message: "Nota emitida y firmada digitalmente", nota: newNote });
});

// HU-10: Busqueda y consulta de notas
app.get('/api/contratos/:id/bitacora/notas', authenticate, (req, res) => {
  const contrato_id = req.params.id;
  const { tipo, f_inicio, f_fin, creador_id, query } = req.query;

  const notes = store.find('notas', n => n.contrato_id === contrato_id);

  const filtered = notes.filter(n => {
    if (tipo && n.tipo !== tipo) return false;
    if (creador_id && n.creado_por_id !== creador_id) return false;
    
    if (f_inicio) {
      if (new Date(n.fecha) < new Date(f_inicio)) return false;
    }
    if (f_fin) {
      const end = new Date(f_fin);
      end.setHours(23, 59, 59, 999);
      if (new Date(n.fecha) > end) return false;
    }

    if (query) {
      const txt = query.toLowerCase();
      const inCont = n.contenido.toLowerCase().includes(txt);
      const inName = n.creado_por_nombre.toLowerCase().includes(txt);
      const inFolio = String(n.folio).includes(txt);
      if (!inCont && !inName && !inFolio) return false;
    }

    return true;
  });

  return res.json(filtered.sort((a, b) => a.folio - b.folio));
});

// ==========================================
// 6. MINUTAS & VISITAS API (HU-11)
// ==========================================
app.post('/api/contratos/:id/minutas', authenticate, authorizeRoles('residente'), upload.single('pdf_minuta'), (req, res) => {
  const contrato_id = req.params.id;
  const { descripcion, fecha_reunion } = req.body;

  const newMinuta = store.insert('minutas', {
    contrato_id,
    descripcion,
    fecha_reunion,
    pdf_path: req.file ? `/uploads/${req.file.filename}` : null,
    creado_en: new Date().toISOString()
  });
  return res.status(201).json({ message: "Minuta guardada con exito", minuta: newMinuta });
});

app.post('/api/contratos/:id/visitas', authenticate, authorizeRoles('residente'), (req, res) => {
  const newVisita = store.insert('visitas', {
    contrato_id: req.params.id,
    descripcion: req.body.descripcion,
    fecha_visita: req.body.fecha_visita,
    asistentes: req.body.asistentes,
    creado_en: new Date().toISOString()
  });
  return res.status(201).json({ message: "Visita de obra agendada con exito", visita: newVisita });
});

// ==========================================
// 6B. TRABAJOS TERMINADOS POR PERIODO (HU-06)
// ==========================================
app.get('/api/contratos/:id/trabajos-periodo', authenticate, (req, res) => {
  const list = store.find('trabajos_periodo', t => t.contrato_id === req.params.id);
  return res.json(list.sort((a, b) => a.periodo_numero - b.periodo_numero));
});

app.post('/api/contratos/:id/trabajos-periodo', authenticate, authorizeRoles('contratista'), (req, res) => {
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
    return res.status(201).json({ message: "Trabajos terminados registrados con exito", trabajo });
  } catch (e) {
    return res.status(e.statusCode || 400).json({ error: e.message });
  }
});

// ==========================================
// 7. ESTIMACIONES API (HU-12 a HU-17)
// ==========================================

// HU-12: Integracin de estimacion
app.post('/api/contratos/:id/estimaciones/integrar', authenticate, authorizeRoles('contratista'), (req, res) => {
  const contrato_id = req.params.id;
  const { periodo_numero, fecha_inicio, fecha_fin, avances, notas_vinculadas_ids, penalizaciones } = req.body;

  if (!periodo_numero || !fecha_inicio || !fecha_fin || !avances) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const contract = store.findOne('contratos', c => c.id === contrato_id);
  if (!contract) {
    return res.status(404).json({ error: "Contrato no encontrado" });
  }

  const prevEstimations = store.find('estimaciones', e => e.contrato_id === contrato_id && e.estado !== 'rechazada');
  
  const cumulative = {};
  contract.catalogo.forEach(item => {
    cumulative[item.clave] = 0;
  });

  prevEstimations.forEach(e => {
    Object.keys(e.avances).forEach(k => {
      cumulative[k] = (cumulative[k] || 0) + parseFloat(e.avances[k]);
    });
  });

  for (const [clave, qty] of Object.entries(avances)) {
    const concept = contract.catalogo.find(item => item.clave === clave);
    if (!concept) {
      return res.status(400).json({ error: `Concepto ${clave} no pertenece al catalogo` });
    }
    const currentQty = parseFloat(qty || 0);
    const prevQty = cumulative[clave] || 0;
    if (prevQty + currentQty > concept.cantidad) {
      return res.status(400).json({ 
        error: `Restriccin del Art. 118 RLOPSRM: El avance acumulado para el concepto ${clave} (${(prevQty + currentQty).toFixed(2)}) excede la cantidad contratada (${concept.cantidad.toFixed(2)}) por ${(prevQty + currentQty - concept.cantidad).toFixed(2)}` 
      });
    }
  }

  let subtotalEstimado = 0;
  Object.entries(avances).forEach(([clave, qty]) => {
    const concept = contract.catalogo.find(item => item.clave === clave);
    subtotalEstimado += parseFloat(qty) * concept.precio_unitario;
  });

  const iva = subtotalEstimado * 0.16;
  const totalEstimado = subtotalEstimado + iva;

  const anticipo_porcentaje = contract.anticipo_porcentaje || 30;
  const amortizacionAnticipo = subtotalEstimado * (anticipo_porcentaje / 100);

  const retencion5Millar = subtotalEstimado * 0.005;

  const penalizacionesMonto = parseFloat(penalizaciones || 0);
  const liquidoAPagar = totalEstimado - amortizacionAnticipo - retencion5Millar - penalizacionesMonto;

  const newEst = store.insert('estimaciones', {
    contrato_id,
    periodo_numero: parseInt(periodo_numero),
    fecha_inicio,
    fecha_fin,
    fecha_creacion: new Date().toISOString(),
    avances,
    notas_vinculadas_ids: notas_vinculadas_ids || [],
    subtotal: subtotalEstimado,
    iva,
    total: totalEstimado,
    anticipo_amortizado: amortizacionAnticipo,
    retencion_5_millar: retencion5Millar,
    penalizaciones: penalizacionesMonto,
    liquido_a_pagar: liquidoAPagar,
    estado: "borrador",
    observaciones: [],
    version_numero: 1
  });

  return res.status(201).json({ message: "Estimacion integrada en borrador", estimacion: newEst });
});

// HU-13: Envo de la estimacion
app.post('/api/estimaciones/:id/enviar', authenticate, authorizeRoles('contratista'), upload.single('pdf_soporte'), (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  const endDate = new Date(est.fecha_fin);
  const now = new Date();
  const diffTime = Math.abs(now - endDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 6 && now > endDate) {
    return res.status(400).json({ error: `Limite del Art. 54 LOPSRM: El plazo de presentacin (6 dias naturales) ha vencido.` });
  }

  store.update('estimaciones', est_id, {
    estado: "presentada",
    fecha_presentacion: now.toISOString(),
    pdf_soporte: req.file ? `/uploads/${req.file.filename}` : est.pdf_soporte
  });

  return res.json({ message: "Estimacion enviada formalmente a revision.", fecha_presentacion: now.toISOString() });
});

// GET estimations
app.get('/api/contratos/:id/estimaciones', authenticate, (req, res) => {
  const list = store.find('estimaciones', e => e.contrato_id === req.params.id);
  return res.json(list.sort((a,b) => a.periodo_numero - b.periodo_numero));
});

// HU-15: Revision tecnica (Supervision)
app.post('/api/estimaciones/:id/revisar', authenticate, authorizeRoles('supervision'), (req, res) => {
  const { observaciones } = req.body;
  const est = store.findOne('estimaciones', e => e.id === req.params.id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  if (est.estado !== 'presentada') {
    return res.status(400).json({ error: "La estimacion no se encuentra en estado 'presentada'." });
  }

  store.update('estimaciones', est.id, {
    estado: "en_revision",
    observaciones: observaciones || [],
    fecha_revision_supervision: new Date().toISOString()
  });

  return res.json({ message: "Estimacion revisada y turnada a Residencia" });
});

// HU-15: Autorizacion o Rechazo (Residencia)
app.post('/api/estimaciones/:id/resolver', authenticate, authorizeRoles('residente'), (req, res) => {
  const { resolucion, comentarios } = req.body;
  const est = store.findOne('estimaciones', e => e.id === req.params.id);
  if (!est) {
    return res.status(404).json({ error: "Estimacion no encontrada" });
  }

  if (est.estado !== 'en_revision' && est.estado !== 'presentada') {
    return res.status(400).json({ error: "La estimacion debe estar en revision primero." });
  }

  const finalState = resolucion === 'autorizada' ? 'autorizada' : 'rechazada';

  store.update('estimaciones', est.id, {
    node_id: est.id,
    estado: finalState,
    fecha_autorizacion_residencia: new Date().toISOString(),
    comentario_residencia: comentarios || ""
  });

  return res.json({ message: `Estimacion resuelta como: ${finalState}` });
});

// HU-16: Reingreso de estimacion tras rechazo
app.post('/api/estimaciones/:id/reingresar', authenticate, authorizeRoles('contratista'), (req, res) => {
  const oldEstId = req.params.id;
  const oldEst = store.findOne('estimaciones', e => e.id === oldEstId);
  if (!oldEst || oldEst.estado !== 'rechazada') {
    return res.status(400).json({ error: "La estimacion no existe o no ha sido rechazada" });
  }

  const { avances, notas_vinculadas_ids, penalizaciones } = req.body;
  const nextVersion = (oldEst.version_numero || 1) + 1;

  const contract = store.findOne('contratos', c => c.id === oldEst.contrato_id);
  let subtotal = 0;
  Object.entries(avances).forEach(([clave, qty]) => {
    const concept = contract.catalogo.find(item => item.clave === clave);
    subtotal += parseFloat(qty) * concept.precio_unitario;
  });

  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const amort = subtotal * (contract.anticipo_porcentaje / 100);
  const ret5 = subtotal * 0.005;
  const pen = parseFloat(penalizaciones || 0);
  const liquido = total - amort - ret5 - pen;

  const newEst = store.insert('estimaciones', {
    contrato_id: oldEst.contrato_id,
    periodo_numero: oldEst.periodo_numero,
    fecha_inicio: oldEst.fecha_inicio,
    fecha_fin: oldEst.fecha_fin,
    fecha_creacion: new Date().toISOString(),
    avances,
    notas_vinculadas_ids: notas_vinculadas_ids || [],
    subtotal,
    iva,
    total,
    anticipo_amortizado: amort,
    retencion_5_millar: ret5,
    penalizaciones: pen,
    liquido_a_pagar: liquido,
    estado: "borrador",
    observaciones: [],
    version_numero: nextVersion,
    estimacion_vinculada_id: oldEstId
  });

  return res.status(201).json({ message: "Nueva versin de estimacion integrada (reingreso)", estimacion: newEst });
});

// ==========================================
// 8. TABLEROS & PORTAFOLIO (HU-17, HU-18, HU-19)
// ==========================================

// HU-17: Tablero de estimaciones aceptadas y en proceso
app.get('/api/tableros/estimaciones-activas', authenticate, (req, res) => {
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

// HU-18: Vista ejecutiva del portafolio con semforos
app.get('/api/tableros/portafolio', authenticate, authorizeRoles('dependencia'), (req, res) => {
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
app.get('/api/contratos/:id/reporte-data', authenticate, (req, res) => {
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

// ==========================================
// 9. PAGOS API (HU-20, HU-21)
// ==========================================

// HU-20: Transito a pago - suficiencia presupuestal
app.post('/api/estimaciones/:id/presupuesto', authenticate, (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) return res.status(404).json({ error: "Estimacion no encontrada" });

  const techoAnualDisponible = 15000000.00;

  if (est.liquido_a_pagar > techoAnualDisponible) {
    return res.status(400).json({ 
      error: `Restriccin del Art. 24 LOPSRM: Insuficiencia presupuestal. El total de la estimacion ($${est.liquido_a_pagar.toFixed(2)}) excede el presupuesto disponible ($${techoAnualDisponible.toFixed(2)}).` 
    });
  }

  return res.json({ 
    message: "Verificacion de suficiencia presupuestal exitosa (Art. 24 LOPSRM).",
    disponible: techoAnualDisponible,
    solicitado: est.liquido_a_pagar
  });
});

// HU-20: Cargar soportes y generar instruccin
app.post('/api/estimaciones/:id/instruccion-pago', authenticate, upload.fields([
  { name: 'factura', maxCount: 1 },
  { name: 'cfdi', maxCount: 1 }
]), (req, res) => {
  const est_id = req.params.id;
  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est) return res.status(404).json({ error: "Estimacion no encontrada" });

  if (est.estado !== 'autorizada') {
    return res.status(400).json({ error: "La estimacion debe estar en estado 'autorizada'." });
  }

  if (!req.files || !req.files['factura'] || !req.files['cfdi']) {
    return res.status(400).json({ error: "Debe cargar la Factura y el XML de CFDI correspondientes" });
  }

  store.update('estimaciones', est_id, {
    estado: 'en_pago',
    pdf_factura: `/uploads/${req.files['factura'][0].filename}`,
    pdf_cfdi: `/uploads/${req.files['cfdi'][0].filename}`,
    fecha_instruccion_pago: new Date().toISOString()
  });

  return res.json({ message: "Instruccin de pago generada. Estatus actualizado a 'en_pago'." });
});

// HU-21: Registrar el pago efectuado
app.post('/api/estimaciones/:id/registrar-pago', authenticate, authorizeRoles('finanzas'), (req, res) => {
  const est_id = req.params.id;
  const { banco_referencia, notas_pago } = req.body;

  if (!banco_referencia) {
    return res.status(400).json({ error: "La referencia de transferencia bancaria es requerida" });
  }

  const est = store.findOne('estimaciones', e => e.id === est_id);
  if (!est || est.estado !== 'en_pago') {
    return res.status(400).json({ error: "La estimacion debe estar en transito de pago." });
  }

  store.update('estimaciones', est_id, {
    estado: 'pagada',
    fecha_pago_efectuado: new Date().toISOString(),
    pago_referencia: banco_referencia,
    pago_notas: notas_pago || "",
    pago_usuario_id: req.user.id
  });

  store.insert('pagos', {
    estimacion_id: est_id,
    contrato_id: est.contrato_id,
    periodo: est.periodo_numero,
    monto: est.liquido_a_pagar,
    fecha: new Date().toISOString(),
    referencia: banco_referencia,
    registrado_por: req.user.nombre
  });

  return res.json({ message: "Pago registrado y conciliado con exito." });
});

// ==========================================
// 10. ALERTAS DE ATRASO POR CONCEPTO (HU-07)
// ==========================================
app.get('/api/contratos/:id/alertas', authenticate, (req, res) => {
  const list = store.find('alertas', a => a.contrato_id === req.params.id);
  return res.json(list);
});

app.post('/api/contratos/:id/alertas', authenticate, authorizeRoles('residente'), (req, res) => {
  const contrato_id = req.params.id;
  const { concept_key, limite_desviacion, canal } = req.body;
  if (!concept_key || limite_desviacion === undefined) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const existing = store.findOne('alertas', a => a.contrato_id === contrato_id && a.concept_key === concept_key);
  if (existing) {
    const updated = store.update('alertas', existing.id, {
      limite_desviacion: parseFloat(limite_desviacion),
      canal: canal || 'sistema',
      estado: existing.estado || 'activa',
      actualizado_en: new Date().toISOString()
    });
    store.insert('notificaciones', {
      contrato_id,
      tipo: 'alerta_concepto',
      canal: canal || 'sistema',
      mensaje: `Alerta actualizada para el concepto ${concept_key}`,
      leida: false,
      creado_para_rol: 'residente',
      creado_en: new Date().toISOString()
    });
    return res.json({ message: "Alerta de concepto actualizada con exito", alerta: updated });
  } else {
    const newAlert = store.insert('alertas', {
      contrato_id,
      concept_key,
      limite_desviacion: parseFloat(limite_desviacion),
      canal: canal || 'sistema',
      estado: 'activa',
      creado_en: new Date().toISOString()
    });
    store.insert('notificaciones', {
      contrato_id,
      tipo: 'alerta_concepto',
      canal: canal || 'sistema',
      mensaje: `Alerta creada para el concepto ${concept_key}`,
      leida: false,
      creado_para_rol: 'residente',
      creado_en: new Date().toISOString()
    });
    return res.status(201).json({ message: "Alerta de concepto configurada con exito", alerta: newAlert });
  }
});

app.patch('/api/alertas/:id', authenticate, authorizeRoles('residente'), (req, res) => {
  const alerta = store.findOne('alertas', a => a.id === req.params.id);
  if (!alerta) return res.status(404).json({ error: "Alerta no encontrada" });
  const estado = req.body.estado;
  if (!['activa', 'pausada'].includes(estado)) {
    return res.status(400).json({ error: "Estado de alerta invalido" });
  }
  const updated = store.update('alertas', alerta.id, {
    estado,
    actualizado_en: new Date().toISOString()
  });
  return res.json({ message: estado === 'pausada' ? "Alerta pausada" : "Alerta reactivada", alerta: updated });
});

app.delete('/api/alertas/:id', authenticate, authorizeRoles('residente'), (req, res) => {
  store.delete('alertas', req.params.id);
  return res.json({ message: "Alerta de concepto eliminada con exito" });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IntegrApex Server running on port ${PORT}`);
});
