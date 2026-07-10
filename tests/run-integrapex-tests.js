const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { request, chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const DB_PATH = path.join(BACKEND_DIR, 'data', 'db.json');
const ARTIFACTS_DIR = path.join(__dirname, '.artifacts');
const PORT = Number(process.env.TEST_PORT || 3199);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PDF = Buffer.from('%PDF-1.4\n% IntegrApex test file\n');
const XML = Buffer.from('<cfdi><integrapex>test</integrapex></cfdi>');

const cli = parseArgs(process.argv.slice(2));
const results = [];
let serverProcess = null;

function parseArgs(args) {
  const parsed = { smoke: false, grep: '' };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--smoke') parsed.smoke = true;
    if (args[i] === '--grep') parsed.grep = args[i + 1] || '';
  }
  return parsed;
}

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function ensureArtifacts() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'sample.pdf'), PDF);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'sample.xml'), XML);
}

function resetRuntimeState() {
  if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH, { force: true });
}

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch (_) {
      // El servidor todavía está iniciando.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start on ${BASE_URL}`);
}

async function startServer() {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  serverProcess.stdout.on('data', chunk => {
    if (process.env.TEST_VERBOSE) process.stdout.write(chunk);
  });
  serverProcess.stderr.on('data', chunk => process.stderr.write(chunk));

  await waitForServer();
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) return;
  serverProcess.kill();
  await new Promise(resolve => serverProcess.once('exit', resolve));
}

async function login(email, password) {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const res = await ctx.post('/api/auth/login', { data: { email, password } });
  await expectStatus(res, 200, `login ${email}`);
  return ctx;
}

async function expectStatus(res, expected, label) {
  if (res.status() !== expected) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label}: expected HTTP ${expected}, got ${res.status()} ${body}`);
  }
}

async function expectOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label}: expected 2xx, got ${res.status()} ${body}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(res, label) {
  await expectOk(res, label);
  return res.json();
}

async function test(name, fn) {
  if (cli.smoke && !name.includes('SMOKE')) return;
  if (cli.grep && !matchesFilter(name, cli.grep)) return;

  const started = Date.now();
  try {
    await fn();
    results.push({ name, status: 'pass', ms: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'fail', ms: Date.now() - started, error });
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
  }
}

function matchesFilter(name, grep) {
  const normalizedName = name.toLowerCase();
  const normalizedGrep = grep.toLowerCase();
  if (normalizedName.includes(normalizedGrep)) return true;

  const huMatch = normalizedGrep.match(/^hu-(\d{2})$/);
  if (!huMatch) return false;

  const target = Number(huMatch[1]);
  const ranges = [...name.matchAll(/HU-(\d{2})\.\.HU-(\d{2})/g)];
  return ranges.some(match => {
    const start = Number(match[1]);
    const end = Number(match[2]);
    return target >= start && target <= end;
  });
}

async function smokeBrowser() {
  const users = [
    ['residente@integrapex.test', 'IntegrApex2026!', 'Listado de Contratos'],
    ['dependencia@integrapex.test', 'IntegrApex2026!', 'Portafolio Ejecutivo'],
    ['contratista@integrapex.test', 'IntegrApex2026!', 'Tablero de Estimaciones'],
    ['supervision@integrapex.test', 'IntegrApex2026!', 'Tablero de Estimaciones'],
    ['correo@dominio.com', 'Contrasena123!', 'Tablero de Estimaciones']
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const [email, password, expectedText] of users) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => {
        const text = msg.text();
        const isExpectedAuthProbe = text.includes('/api/auth/me') && text.includes('401');
        if (msg.type() === 'error' && !isExpectedAuthProbe) errors.push(text);
      });

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.fill('#login-email', email);
      await page.fill('#login-password', password);
      await page.click('button[type=submit]');
      await page.waitForTimeout(900);
      const body = await page.locator('body').innerText();
      assert(body.includes(expectedText) || body.includes('Bienvenido'), `${email} did not reach expected UI`);
      assert(new URL(page.url()).pathname === '/inicio', `${email} stayed on ${page.url()} after login`);
      assert(errors.length === 0, `${email} browser errors: ${errors.join(' | ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function createContract(residente) {
  const folio = `SIG-${Date.now()}`;
  const start = today(-1);
  const catalogo = [
    { clave: 'CON-01', descripcion: 'Excavacion controlada', unidad: 'm3', precio_unitario: 100, cantidad: 100 },
    { clave: 'CON-02', descripcion: 'Concreto estructural', unidad: 'm3', precio_unitario: 200, cantidad: 50 }
  ];
  const programa = [
    { mes: 1, avances: { 'CON-01': 60, 'CON-02': 20 } },
    { mes: 2, avances: { 'CON-01': 40, 'CON-02': 30 } }
  ];
  const multipart = {
    folio,
    objeto: 'Construccion de prueba verificable',
    ubicacion_obra: 'Calle de Prueba 123, Ciudad de Mexico',
    monto: '20000',
    anticipo_porcentaje: '30',
    plazo_dias: '60',
    fecha_inicio: start,
    modalidad_pago: 'Precios Unitarios',
    residente_id: 'u0',
    superintendente_id: 'u1',
    supervision_id: 'u2',
    catalogo: JSON.stringify(catalogo),
    programa: JSON.stringify(programa),
    juridicos: JSON.stringify({ dependencia: 'Oficio autorizado', contratista: 'Acta constitutiva' }),
    garantias: JSON.stringify([
      { tipo: 'anticipo', afianzadora: 'Afianzadora Test', vigencia: addDays(start, 90), monto: 6000 },
      { tipo: 'cumplimiento', afianzadora: 'Afianzadora Test', vigencia: addDays(start, 90), monto: 2000 },
      { tipo: 'vicios_ocultos', afianzadora: 'Afianzadora Test', vigencia: addDays(start, 90), monto: 2000 }
    ]),
    amortizacion_plan: JSON.stringify([]),
    penalizaciones: JSON.stringify([{ tipo: 'retencion', descripcion: '5 al millar', porcentaje: 0.5 }]),
    pdf_contrato: { name: 'contrato.pdf', mimeType: 'application/pdf', buffer: PDF }
  };

  const res = await residente.post('/api/contratos', { multipart });
  const data = await json(res, 'HU-01 crear contrato');
  assert(data.contrato.folio === folio, 'HU-01 folio unico no regresado');
  assert(data.contrato.pdf_contrato, 'HU-01 PDF de contrato no quedo ligado');
  return data.contrato;
}

async function creatorSeesContractEvenWhenNotAssigned() {
  const residente = await login('residente2.demo@integrapex.test', 'IntegrApex2026!');
  const contract = await createContract(residente);

  assert(contract.creado_por_id === 'u_aldo_res', 'HU-01 contrato no registro al creador esperado');
  assert(contract.residente_id !== 'u_aldo_res', 'HU-01 prueba requiere contrato creado por usuario no asignado');

  const contracts = await json(await residente.get('/api/contratos'), 'HU-01 listar contratos creados');
  assert(contracts.some(c => c.id === contract.id), 'HU-01 contrato creado no aparece en lista del creador');

  const detail = await json(await residente.get(`/api/contratos/${contract.id}`), 'HU-01 consultar contrato creado');
  assert(detail.id === contract.id, 'HU-01 creador no puede consultar detalle del contrato');

  await residente.dispose();
}

async function openAndSignBitacora({ residente, contratista, supervision, contratoId }) {
  const openRes = await residente.post(`/api/contratos/${contratoId}/bitacora/aperturar`, {
    data: { fecha_entrega_sitio: today(-1) }
  });
  const opened = await json(openRes, 'HU-08 aperturar bitacora');
  const bitacoraId = opened.bitacora.id;

  const pendingContractor = await json(await contratista.get('/api/bitacora/por-firmar'), 'Por Firmar contratista');
  assert(pendingContractor.some(item => item.bitacora_id === bitacoraId), 'Por Firmar no muestra firma pendiente al contratista');

  await expectOk(await residente.post(`/api/bitacora/${bitacoraId}/firmar`), 'firma residente');
  await expectOk(await contratista.post(`/api/bitacora/${bitacoraId}/firmar`), 'firma contratista');
  const finalSign = await json(await supervision.post(`/api/bitacora/${bitacoraId}/firmar`), 'firma supervision');
  assert(finalSign.bitacora.completada === true, 'HU-08 bitacora no quedo completa tras todas las firmas');
  return bitacoraId;
}

async function createNotes({ residente, contratista, contratoId }) {
  const first = await json(await contratista.post(`/api/contratos/${contratoId}/bitacora/notas`, {
    data: { tipo: 'Entrega', contenido: 'Entrega de generadores del periodo inicial' }
  }), 'HU-09 nota contratista');

  const correction = await json(await residente.post(`/api/contratos/${contratoId}/bitacora/notas`, {
    data: {
      tipo: 'General',
      vinculo_nota_id: first.nota.folio,
      dice: 'Entrega de generadores del periodo inicial',
      debe_decir: 'Entrega de generadores revisados del periodo inicial'
    }
  }), 'HU-09 correccion dice debe decir');
  assert(correction.nota.correccion && correction.nota.correccion.debe_decir, 'HU-09 correccion no quedo estructurada');

  const search = await json(await residente.get(`/api/contratos/${contratoId}/bitacora/notas?tipo=Entrega&creador_id=u1&query=generadores`), 'HU-10 busqueda notas AND');
  assert(search.length === 1 && search[0].id === first.nota.id, 'HU-10 busqueda AND no regreso la nota esperada');

  const exportRes = await residente.get(`/api/contratos/${contratoId}/bitacora/notas/export?ids=${first.nota.id}`);
  const buffer = await exportRes.body();
  assert(buffer.slice(0, 2).toString() === 'PK', 'HU-10 export no es XLSX real');
  return first.nota;
}

async function runBusinessFlow() {
  const residente = await login('residente@integrapex.test', 'IntegrApex2026!');
  const contratista = await login('contratista@integrapex.test', 'IntegrApex2026!');
  const supervision = await login('supervision@integrapex.test', 'IntegrApex2026!');
  const dependencia = await login('dependencia@integrapex.test', 'IntegrApex2026!');
  const finanzas = await login('correo@dominio.com', 'Contrasena123!');

  const contract = await createContract(residente);
  await openAndSignBitacora({ residente, contratista, supervision, contratoId: contract.id });
  const note = await createNotes({ residente, contratista, contratoId: contract.id });

  const fianzaRes = await dependencia.post(`/api/contratos/${contract.id}/fianzas`, {
    multipart: {
      tipo: 'cumplimiento',
      afianzadora: 'Afianzadora Ejecutable',
      vigencia: today(3),
      monto: '2000',
      umbrales_alerta: JSON.stringify([30, 15, 5]),
      pdf_poliza: { name: 'poliza.pdf', mimeType: 'application/pdf', buffer: PDF }
    }
  });
  const fianza = (await json(fianzaRes, 'HU-02 registrar fianza')).fianza;
  assert(fianza.pdf_poliza, 'HU-02 poliza PDF no quedo consultable');
  const notif = await json(await dependencia.get('/api/notificaciones'), 'HU-02 notificaciones fianza');
  assert(notif.notificaciones.some(n => n.tipo === 'fianza_vencimiento'), 'HU-02 no genero alerta de vencimiento');

  const convenio = await json(await dependencia.post(`/api/contratos/${contract.id}/convenios`, {
    data: { descripcion: 'Convenio de ajuste menor', motivo: 'Adecuacion de alcance', cambio_monto: 1000, cambio_plazo: 5 }
  }), 'HU-03 convenio');
  assert(convenio.convenio.version_nueva > convenio.convenio.version_previa, 'HU-03 no versiono el contrato');
  assert(convenio.endosos_generados >= 1, 'HU-03 no genero endosos');

  const expediente = await json(await residente.get(`/api/contratos/${contract.id}/expediente/search?folio=${encodeURIComponent(contract.folio)}&tipo_documento=fianzas`), 'HU-04 expediente search');
  assert(expediente.some(item => item.archivo), 'HU-04 buscador no trae descarga por fila');

  const alerta = await json(await residente.post(`/api/contratos/${contract.id}/alertas`, {
    data: { concept_key: 'CON-01', limite_desviacion: 90, canal: 'correo' }
  }), 'HU-07 crear alerta correo');
  assert(alerta.alerta.estado === 'activa', 'HU-07 alerta no quedo activa');

  const trabajo = await json(await contratista.post(`/api/contratos/${contract.id}/trabajos-periodo`, {
    data: {
      periodo_numero: 1,
      fecha_inicio: today(-1),
      fecha_fin: today(),
      cantidades: { 'CON-01': 5 },
      nota_bitacora_id: note.id,
      observaciones: 'Trabajo terminado con evidencia'
    }
  }), 'HU-06 trabajos periodo');
  assert(trabajo.trabajo.nota_bitacora_id === note.id, 'HU-06 no vinculo la nota de bitacora');
  await expectStatus(await contratista.post(`/api/contratos/${contract.id}/trabajos-periodo`, {
    data: { periodo_numero: 2, fecha_inicio: today(), fecha_fin: today(), cantidades: { 'CON-01': 500 }, nota_bitacora_id: note.id }
  }), 400, 'HU-06 bloqueo Art 118');
  const correos = await json(await residente.get('/api/correos-salientes'), 'HU-07 correos salientes');
  assert(correos.some(c => c.tipo === 'alerta_concepto'), 'HU-07 canal correo no registro salida simulada');

  const minuta = await json(await residente.post(`/api/contratos/${contract.id}/minutas`, {
    multipart: {
      descripcion: 'Minuta mensual de avance',
      fecha_reunion: today(),
      pdf_minuta: { name: 'minuta.pdf', mimeType: 'application/pdf', buffer: PDF }
    }
  }), 'HU-11 minuta');
  const visita = await json(await residente.post(`/api/contratos/${contract.id}/visitas`, {
    data: { descripcion: 'Visita de verificacion', fecha_visita: today(), asistentes: 'Residencia, Supervision' }
  }), 'HU-11 visita');
  const referencedNote = await json(await residente.post(`/api/contratos/${contract.id}/bitacora/notas`, {
    data: { tipo: 'General', contenido: 'Nota vinculada a minuta', referencia_tipo: 'minuta', referencia_id: minuta.minuta.id }
  }), 'HU-11 nota con referencia');
  assert(referencedNote.nota.referencia_id === minuta.minuta.id && visita.visita.id, 'HU-11 referencia minuta/visita no quedo registrada');

  const estRes = await contratista.post(`/api/contratos/${contract.id}/estimaciones/integrar`, {
    multipart: {
      periodo_numero: '1',
      fecha_inicio: today(-1),
      fecha_fin: today(),
      avances: JSON.stringify({ 'CON-01': 10, 'CON-02': 5 }),
      notas_vinculadas_ids: JSON.stringify([note.id]),
      penalizaciones: '25',
      fotos: { name: 'foto.pdf', mimeType: 'application/pdf', buffer: PDF },
      soportes: { name: 'soporte.pdf', mimeType: 'application/pdf', buffer: PDF }
    }
  });
  const est = (await json(estRes, 'HU-12 integrar estimacion')).estimacion;
  assert(est.fotos.length === 1 && est.soportes.length === 1 && est.notas_vinculadas_ids.includes(note.id), 'HU-12 anexos/notas no persistieron');

  await expectOk(await contratista.post(`/api/estimaciones/${est.id}/enviar`, {
    multipart: { pdf_soporte: { name: 'envio.pdf', mimeType: 'application/pdf', buffer: PDF } }
  }), 'HU-13 enviar estimacion');
  const presented = await json(await residente.get(`/api/contratos/${contract.id}/estimaciones?periodo=1&estado=presentada`), 'HU-14 historial filtros');
  assert(presented.length === 1 && presented[0].plazo_revision, 'HU-13/HU-14 semaforo o filtros no funcionan');

  await expectStatus(await residente.post(`/api/estimaciones/${est.id}/resolver`, { data: { resolucion: 'autorizada' } }), 400, 'HU-15 secuencia obligatoria');
  await expectOk(await supervision.post(`/api/estimaciones/${est.id}/revisar`, {
    data: { observaciones: [{ seccion: 'generadores', concepto: 'CON-01', tipo: 'Volumen', severidad: 'Alta', comentario: 'Aclarar volumen ejecutado' }] }
  }), 'HU-15 revisar por seccion');
  await expectOk(await residente.post(`/api/estimaciones/${est.id}/resolver`, {
    data: { resolucion: 'rechazada', comentarios: 'Requiere correccion documental' }
  }), 'HU-15 rechazar');
  const obsXlsx = await (await residente.get(`/api/estimaciones/${est.id}/observaciones/export?formato=xlsx`)).body();
  const obsPdf = await (await residente.get(`/api/estimaciones/${est.id}/observaciones/export?formato=pdf`)).body();
  assert(obsXlsx.slice(0, 2).toString() === 'PK' && obsPdf.slice(0, 5).toString() === '%PDF-', 'HU-16 export observaciones invalido');

  const reingreso = await json(await contratista.post(`/api/estimaciones/${est.id}/reingresar`, {
    data: { avances: { 'CON-01': 8, 'CON-02': 5 }, notas_vinculadas_ids: [note.id], penalizaciones: 0 }
  }), 'HU-16 reingresar');
  assert(reingreso.estimacion.estimacion_vinculada_id === est.id, 'HU-16 no vinculo version rechazada');

  const est2 = reingreso.estimacion;
  await expectOk(await contratista.post(`/api/estimaciones/${est2.id}/enviar`), 'HU-13 enviar reingreso');
  await expectOk(await supervision.post(`/api/estimaciones/${est2.id}/revisar`, { data: { observaciones: [] } }), 'HU-15 revisar reingreso');
  await expectOk(await residente.post(`/api/estimaciones/${est2.id}/resolver`, { data: { resolucion: 'autorizada' } }), 'HU-15 autorizar reingreso');

  const tableroContratista = await json(await contratista.get('/api/tableros/estimaciones-activas'), 'HU-17 tablero contratista');
  assert(tableroContratista.estimaciones.some(e => e.id === est2.id && e.requiere_mi_accion), 'HU-17 no marca pendiente del contratista');

  const presupuesto = await json(await contratista.post(`/api/estimaciones/${est2.id}/presupuesto`, { data: {} }), 'HU-20 presupuesto');
  assert(presupuesto.disponible > presupuesto.solicitado, 'HU-20 suficiencia no usa techo disponible');
  await expectOk(await contratista.post(`/api/estimaciones/${est2.id}/instruccion-pago`, {
    multipart: {
      factura: { name: 'factura.pdf', mimeType: 'application/pdf', buffer: PDF },
      cfdi: { name: 'cfdi.xml', mimeType: 'application/xml', buffer: XML }
    }
  }), 'HU-20 instruccion pago');
  await expectOk(await finanzas.post(`/api/estimaciones/${est2.id}/registrar-pago`, {
    data: { banco_referencia: 'SPEI-TEST-001', notas_pago: 'Pago verificado por suite' }
  }), 'HU-21 registrar pago');

  const tableroFinanzas = await json(await finanzas.get('/api/tableros/estimaciones-activas'), 'HU-17 tablero finanzas');
  assert(tableroFinanzas.resumen.total >= 1, 'HU-17 tablero no conserva estimaciones activas/pagadas');

  const portafolio = await json(await dependencia.get('/api/tableros/portafolio?agrupar_por=contratista'), 'HU-18 portafolio');
  assert(portafolio.agrupado_por === 'contratista' && portafolio.grupos.length > 0, 'HU-18 agrupacion no funciona');

  const reportes = ['fisico', 'financiero', 'estimaciones', 'observaciones', 'bitacora', 'modificatorios', 'penalizaciones'];
  for (const tipo of reportes) {
    const xlsx = await (await residente.get(`/api/contratos/${contract.id}/reportes/${tipo}/export?formato=xlsx&periodo_tipo=mensual&periodo_valor=${today().slice(0, 7)}`)).body();
    const pdf = await (await residente.get(`/api/contratos/${contract.id}/reportes/${tipo}/export?formato=pdf&periodo_tipo=acumulado`)).body();
    assert(xlsx.slice(0, 2).toString() === 'PK', `HU-19 ${tipo} XLSX invalido`);
    assert(pdf.slice(0, 5).toString() === '%PDF-', `HU-19 ${tipo} PDF invalido`);
  }

  const paidEstimations = await json(await residente.get(`/api/contratos/${contract.id}/estimaciones?estado=pagada`), 'HU-21 historial pagada');
  assert(paidEstimations.some(e => e.id === est2.id && e.pago_usuario_id), 'HU-21 pago no actualizo estimacion');

  await Promise.all([residente.dispose(), contratista.dispose(), supervision.dispose(), dependencia.dispose(), finanzas.dispose()]);
}

async function accessAndRegistration() {
  const anonymous = await request.newContext({ baseURL: BASE_URL });
  await expectStatus(await anonymous.post('/api/auth/login', { data: { email: '', password: '' } }), 400, 'HU-00 login vacio');
  await expectStatus(await anonymous.post('/api/auth/login', { data: { email: 'residente@integrapex.test', password: 'bad' } }), 401, 'HU-00 login invalido');

  const email = `nuevo.${Date.now()}@integrapex.test`;
  const register = await json(await anonymous.post('/api/auth/register', {
    data: { email, password: 'IntegrApex2026!', nombre: 'Usuario Nuevo Verificado', rol: 'residente' }
  }), 'Registro crear pendiente');
  await expectStatus(await anonymous.post('/api/auth/login', { data: { email, password: 'IntegrApex2026!' } }), 403, 'Registro bloquea pendiente');

  const dependencia = await login('dependencia@integrapex.test', 'IntegrApex2026!');
  const pending = await json(await dependencia.get('/api/admin/requests'), 'Registro listar pendientes');
  assert(pending.some(u => u.id === register.user.id), 'Registro no aparece en solicitudes');
  await expectOk(await dependencia.post('/api/admin/approve', {
    data: { userId: register.user.id, approve: true, role: 'supervision' }
  }), 'Registro aprobar');

  const approved = await login(email, 'IntegrApex2026!');
  const me = await json(await approved.get('/api/auth/me'), 'HU-00 rol deducido');
  assert(me.user.rol === 'supervision', 'Registro no aplico rol efectivo aprobado');
  await Promise.all([anonymous.dispose(), dependencia.dispose(), approved.dispose()]);
}

async function main() {
  ensureArtifacts();
  resetRuntimeState();
  await startServer();
  try {
    await test('SMOKE roles y rutas criticas en Chromium', smokeBrowser);
    await test('HU-00 Registro control de acceso por rol', accessAndRegistration);
    await test('HU-01 Contrato creado visible para su creador', creatorSeesContractEvenWhenNotAssigned);
    await test('Por Firmar HU-01..HU-21 flujo funcional completo por API', runBusinessFlow);
  } finally {
    await stopServer();
  }

  const failed = results.filter(r => r.status === 'fail');
  console.log(`\n${results.length - failed.length}/${results.length} pruebas pasaron`);
  if (failed.length) process.exit(1);
}

main().catch(async error => {
  console.error(error.stack || error.message);
  await stopServer();
  process.exit(1);
});
