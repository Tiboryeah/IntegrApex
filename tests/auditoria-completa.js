/**
 * IntegrApex - Suite de Auditoria Completa
 *
 * Cubre los aspectos que el test de flujo de negocio no prueba a fondo:
 *   - Catalogo de dependencias y empresas (CRUD)
 *   - Autorizacion por rol (acceso denegado a rutas restringidas)
 *   - Validaciones de campos obligatorios y duplicados
 *   - Endpoints de reportes y expediente
 *   - Responsividad minima (viewport movil via Playwright)
 *   - Notificaciones y correos salientes
 *   - Endpoints de admin (solicitudes de acceso)
 */

'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { request, chromium } = require('playwright');

const ROOT        = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const PORT        = Number(process.env.TEST_PORT || 3198);
const BASE_URL    = `http://127.0.0.1:${PORT}`;
const PDF         = Buffer.from('%PDF-1.4\n% IntegrApex auditoria\n');

let serverProcess = null;
const results     = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectStatus(res, expected, label) {
  if (res.status() !== expected) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label}: expected HTTP ${expected}, got ${res.status()} - ${body}`);
  }
}

async function expectOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label}: expected 2xx, got ${res.status()} - ${body}`);
  }
}

async function jsonResp(res, label) {
  await expectOk(res, label);
  return res.json();
}

async function test(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, status: 'pass', ms: Date.now() - started });
    console.log('PASS  ' + name);
  } catch (err) {
    results.push({ name, status: 'fail', ms: Date.now() - started, error: err });
    console.error('FAIL  ' + name);
    console.error('      ' + err.message);
  }
}

async function waitForServer(deadline) {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch (_) { /* still starting */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('Servidor no respondio en ' + BASE_URL);
}

async function startServer() {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  serverProcess.stderr.on('data', chunk => process.stderr.write(chunk));
  await waitForServer(Date.now() + 20000);
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) return;
  serverProcess.kill();
  await new Promise(r => serverProcess.once('exit', r));
}

async function login(email, password) {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  const res = await ctx.post('/api/auth/login', { data: { email, password } });
  await expectStatus(res, 200, 'login ' + email);
  return ctx;
}

async function testCatalogoDependencias() {
  const res = await login('residente@integrapex.test', 'IntegrApex2026!');
  const dep = await login('dependencia@integrapex.test', 'IntegrApex2026!');
  const con = await login('contratista@integrapex.test', 'IntegrApex2026!');
  const sup = await login('supervision@integrapex.test', 'IntegrApex2026!');

  const d1 = await jsonResp(await res.post('/api/catalogo/dependencias', {
    data: { nombre: 'SINFRA Jalisco', siglas: 'SINFRA', rfc: 'SINFRA010101', email: 'contacto@sinfra.gob.mx' }
  }), 'crear dependencia');
  assert(d1.dependencia.id, 'dependencia sin ID');
  assert(d1.dependencia.rfc === 'SINFRA010101', 'RFC no en mayusculas');

  const lista = await jsonResp(await res.get('/api/catalogo/dependencias'), 'listar dependencias');
  assert(Array.isArray(lista) && lista.some(d => d.nombre === 'SINFRA Jalisco'), 'dependencia no en lista');

  await expectStatus(await res.post('/api/catalogo/dependencias', { data: { nombre: 'SINFRA Jalisco' } }), 400, 'duplicado dependencia');
  await expectStatus(await res.post('/api/catalogo/dependencias', { data: { siglas: 'SIN_NOMBRE' } }), 400, 'dependencia sin nombre');

  const d2 = await jsonResp(await dep.post('/api/catalogo/dependencias', { data: { nombre: 'Comision Nacional del Agua' } }), 'crear dep por rol dependencia');
  assert(d2.dependencia.id, 'dependencia2 sin ID');

  await expectStatus(await con.post('/api/catalogo/dependencias', { data: { nombre: 'Empresa Maliciosa' } }), 403, 'contratista no autorizado');
  await expectStatus(await sup.post('/api/catalogo/dependencias', { data: { nombre: 'Empresa Maliciosa 2' } }), 403, 'supervision no autorizada');

  await Promise.all([res.dispose(), dep.dispose(), con.dispose(), sup.dispose()]);
}

async function testCatalogoEmpresas() {
  const res = await login('residente@integrapex.test', 'IntegrApex2026!');
  const con = await login('contratista@integrapex.test', 'IntegrApex2026!');

  const e1 = await jsonResp(await res.post('/api/catalogo/empresas', {
    data: { nombre_comercial: 'Constructora Alianza SA', razon_social: 'Constructora Alianza SA de CV', rfc: 'CAL010101XYZ', representante: 'Ing. Carlos Rios' }
  }), 'crear empresa');
  assert(e1.empresa.id, 'empresa sin ID');
  assert(e1.empresa.rfc === 'CAL010101XYZ', 'RFC empresa no en mayusculas');

  const lista = await jsonResp(await res.get('/api/catalogo/empresas'), 'listar empresas');
  assert(Array.isArray(lista) && lista.some(e => e.nombre_comercial === 'Constructora Alianza SA'), 'empresa no en lista');

  await expectStatus(await res.post('/api/catalogo/empresas', { data: { nombre_comercial: 'Constructora Alianza SA' } }), 400, 'duplicado empresa');
  await expectStatus(await res.post('/api/catalogo/empresas', { data: { razon_social: 'Sin nombre' } }), 400, 'empresa sin nombre_comercial');
  await expectStatus(await con.post('/api/catalogo/empresas', { data: { nombre_comercial: 'Empresa Infiltrada' } }), 403, 'contratista no puede crear empresa');

  await Promise.all([res.dispose(), con.dispose()]);
}

async function testAccesoSinAutenticacion() {
  const anon = await request.newContext({ baseURL: BASE_URL });
  const endpoints = [
    { m: 'get',  p: '/api/catalogo/dependencias' },
    { m: 'get',  p: '/api/catalogo/empresas' },
    { m: 'get',  p: '/api/contratos' },
    { m: 'get',  p: '/api/notificaciones' },
    { m: 'get',  p: '/api/tableros/portafolio' },
    { m: 'get',  p: '/api/correos-salientes' },
    { m: 'get',  p: '/api/admin/requests' }
  ];
  for (const ep of endpoints) {
    const r = await anon[ep.m](ep.p);
    assert(r.status() === 401, ep.m.toUpperCase() + ' ' + ep.p + ' no devuelve 401 sin sesion (got ' + r.status() + ')');
  }
  await anon.dispose();
}

async function testAutorizacionPorRol() {
  const contratista = await login('contratista@integrapex.test', 'IntegrApex2026!');
  const supervision = await login('supervision@integrapex.test', 'IntegrApex2026!');

  await expectStatus(await contratista.post('/api/admin/approve', { data: { userId: 'u0', approve: true, role: 'residente' } }), 403, 'contratista a admin');
  await expectStatus(await supervision.post('/api/admin/approve', { data: { userId: 'u0', approve: true, role: 'residente' } }), 403, 'supervision a admin');
  await expectStatus(await contratista.get('/api/admin/requests'), 403, 'contratista lista requests');

  await Promise.all([contratista.dispose(), supervision.dispose()]);
}

async function testLoginInvalido() {
  const anon = await request.newContext({ baseURL: BASE_URL });

  await expectStatus(await anon.post('/api/auth/login', { data: { email: 'residente@integrapex.test', password: 'contrasenaIncorrecta' } }), 401, 'password incorrecto');
  await expectStatus(await anon.post('/api/auth/login', { data: { email: 'noexiste@integrapex.test', password: 'IntegrApex2026!' } }), 401, 'email inexistente');
  await expectStatus(await anon.post('/api/auth/login', { data: { email: '', password: '' } }), 400, 'credenciales vacias');

  const emailNuevo = 'pendiente.' + Date.now() + '@integrapex.test';
  await anon.post('/api/auth/register', { data: { email: emailNuevo, password: 'IntegrApex2026!', nombre: 'Pendiente Test', rol: 'residente' } });
  await expectStatus(await anon.post('/api/auth/login', { data: { email: emailNuevo, password: 'IntegrApex2026!' } }), 403, 'usuario pendiente bloqueado');

  await anon.dispose();
}

async function testNotificacionesYCorreos() {
  const dep = await login('dependencia@integrapex.test', 'IntegrApex2026!');

  const notifRes = await jsonResp(await dep.get('/api/notificaciones'), 'obtener notificaciones');
  assert(typeof notifRes === 'object' && Array.isArray(notifRes.notificaciones), 'estructura notificaciones incorrecta');

  const correos = await jsonResp(await dep.get('/api/correos-salientes'), 'correos salientes');
  assert(Array.isArray(correos), 'correos no es array');

  await dep.dispose();
}

async function testExpedienteBuscador() {
  const res = await login('residente@integrapex.test', 'IntegrApex2026!');

  const items = await jsonResp(await res.get('/api/contratos/c_base/expediente/search?tipo_documento=fianzas'), 'expediente search fianzas');
  assert(Array.isArray(items), 'expediente no retorna array');

  const porFolio = await jsonResp(await res.get('/api/contratos/c_base/expediente/search?folio=SOP-2026-001'), 'expediente search por folio');
  assert(Array.isArray(porFolio), 'expediente por folio no es array');

  await res.dispose();
}

async function testContratosSemilla() {
  // Finanzas ve todos los contratos sin filtro de asignacion.
  const fin = await login('correo@dominio.com', 'Contrasena123!');

  const contratos = await jsonResp(await fin.get('/api/contratos'), 'listar contratos como finanzas');
  assert(Array.isArray(contratos) && contratos.length >= 6, 'contratos semilla incompletos: ' + contratos.length);

  const folios = contratos.map(c => c.folio);
  for (const f of ['SOP-2026-001','SOP-2026-002','SOP-2026-003','SOP-2026-004','SOP-2026-005','SOP-2026-006']) {
    assert(folios.includes(f), 'falta contrato semilla ' + f);
  }

  // Residente solo ve su propio contrato (comportamiento esperado por rol).
  const res = await login('residente@integrapex.test', 'IntegrApex2026!');
  const propios = await jsonResp(await res.get('/api/contratos'), 'contratos propios del residente');
  assert(Array.isArray(propios) && propios.some(c => c.folio === 'SOP-2026-001'), 'residente no ve su propio contrato');

  await Promise.all([fin.dispose(), res.dispose()]);
}

async function testPortafolioEjecutivo() {
  const dep = await login('dependencia@integrapex.test', 'IntegrApex2026!');

  // Sin agrupar_por, la API retorna un array plano con todos los contratos.
  const portafolio = await jsonResp(await dep.get('/api/tableros/portafolio'), 'portafolio sin filtro');
  assert(Array.isArray(portafolio) && portafolio.length >= 6, 'portafolio sin filtro no retorna todos los contratos');
  assert(portafolio[0].semaforo, 'portafolio no tiene campo semaforo');

  // Con agrupar_por=contratista, la API retorna { agrupado_por, grupos }.
  const agrupado = await jsonResp(await dep.get('/api/tableros/portafolio?agrupar_por=contratista'), 'portafolio por contratista');
  assert(agrupado.agrupado_por === 'contratista', 'agrupacion incorrecta');
  assert(Array.isArray(agrupado.grupos) && agrupado.grupos.length > 0, 'portafolio agrupado sin grupos');

  await dep.dispose();
}

async function testFianzaSinPdfFalla() {
  const dep = await login('dependencia@integrapex.test', 'IntegrApex2026!');

  const res = await dep.post('/api/contratos/c_base/fianzas', {
    data: { tipo: 'cumplimiento', afianzadora: 'Sin PDF Test', vigencia: '2027-01-01', monto: '5000', umbrales_alerta: JSON.stringify([30, 15]) }
  });
  assert(res.status() < 500, 'fianza sin pdf causo error 5xx: ' + res.status());

  await dep.dispose();
}

async function testReportesContratoBase() {
  const res = await login('residente@integrapex.test', 'IntegrApex2026!');
  const tipos = ['fisico', 'financiero', 'estimaciones', 'observaciones', 'bitacora', 'modificatorios', 'penalizaciones'];

  for (const tipo of tipos) {
    const xlsx = await (await res.get('/api/contratos/c_base/reportes/' + tipo + '/export?formato=xlsx&periodo_tipo=acumulado')).body();
    assert(xlsx.slice(0, 2).toString() === 'PK', 'reporte ' + tipo + ' XLSX invalido');

    const pdf = await (await res.get('/api/contratos/c_base/reportes/' + tipo + '/export?formato=pdf&periodo_tipo=acumulado')).body();
    assert(pdf.slice(0, 5).toString() === '%PDF-', 'reporte ' + tipo + ' PDF invalido');
  }

  await res.dispose();
}

async function testTableroEstimaciones() {
  const fin = await login('correo@dominio.com', 'Contrasena123!');
  const con = await login('contratista@integrapex.test', 'IntegrApex2026!');

  const tFin = await jsonResp(await fin.get('/api/tableros/estimaciones-activas'), 'tablero finanzas');
  assert(tFin.resumen, 'tablero finanzas sin resumen');
  assert(typeof tFin.resumen.total === 'number', 'tablero finanzas total no es numero');

  const tCon = await jsonResp(await con.get('/api/tableros/estimaciones-activas'), 'tablero contratista');
  assert(tCon.estimaciones, 'tablero contratista sin estimaciones');

  await Promise.all([fin.dispose(), con.dispose()]);
}

async function testAdminSolicitudes() {
  const dep  = await login('dependencia@integrapex.test', 'IntegrApex2026!');
  const anon = await request.newContext({ baseURL: BASE_URL });

  const email = 'audit.' + Date.now() + '@integrapex.test';
  const reg = await jsonResp(await anon.post('/api/auth/register', {
    data: { email, password: 'IntegrApex2026!', nombre: 'Auditado Nuevo', rol: 'supervision' }
  }), 'registro para aprobacion');
  assert(reg.user.estado === 'pendiente', 'registro no queda pendiente');

  const pending = await jsonResp(await dep.get('/api/admin/requests'), 'listar pendientes');
  assert(Array.isArray(pending) && pending.some(u => u.id === reg.user.id), 'usuario no en pendientes');

  await expectOk(await dep.post('/api/admin/approve', { data: { userId: reg.user.id, approve: true, role: 'supervision' } }), 'aprobar usuario');

  // Login exitoso ya demuestra que el estado paso a 'aprobado' (pendiente daria 403).
  const aprobado = await login(email, 'IntegrApex2026!');
  const me = await jsonResp(await aprobado.get('/api/auth/me'), 'auth/me post-aprobacion');
  assert(me.user.rol === 'supervision', 'rol no aplicado correctamente');
  // El JWT no incluye 'estado'; verificamos via la lista de admin que quedo aprobado.
  const todos = await jsonResp(await dep.get('/api/admin/usuarios'), 'listar usuarios admin');
  const usuarioAprobado = todos.find(u => u.email === email);
  assert(usuarioAprobado && usuarioAprobado.estado === 'aprobado', 'estado no actualizado en base de datos');

  const email2 = 'audit2.' + Date.now() + '@integrapex.test';
  const reg2 = await jsonResp(await anon.post('/api/auth/register', {
    data: { email: email2, password: 'IntegrApex2026!', nombre: 'Rechazado', rol: 'residente' }
  }), 'registro para rechazo');
  await expectOk(await dep.post('/api/admin/approve', { data: { userId: reg2.user.id, approve: false } }), 'rechazar usuario');
  await expectStatus(await anon.post('/api/auth/login', { data: { email: email2, password: 'IntegrApex2026!' } }), 401, 'rechazado bloqueado');

  await Promise.all([dep.dispose(), anon.dispose(), aprobado.dispose()]);
}

async function testResponsividadUI() {
  const viewports = [
    { name: 'Movil',   width: 390,  height: 844  },
    { name: 'Tablet',  width: 768,  height: 1024 },
    { name: 'Desktop', width: 1440, height: 900  }
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('/api/auth/me')) errors.push(msg.text());
      });

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // El formulario de login se inyecta via JS asíncrono (tras llamada a /api/auth/me).
      // Esperamos a que aparezca antes de verificar visibilidad.
      await page.waitForSelector('#login-email', { state: 'visible', timeout: 10000 });

      const emailInput = page.locator('#login-email');
      const passInput  = page.locator('#login-password');
      const submitBtn  = page.locator('button[type=submit]');

      assert(await emailInput.isVisible(), vp.name + ': #login-email no visible');
      assert(await passInput.isVisible(),  vp.name + ': #login-password no visible');
      assert(await submitBtn.isVisible(),  vp.name + ': boton submit no visible');

      const box = await emailInput.boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= vp.width + 5,
        vp.name + ': campo email sale del viewport (x=' + box?.x + ' w=' + box?.width + ')');

      assert(errors.length === 0, vp.name + ': errores en consola: ' + errors.join(' | '));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function testNavegacionPostLogin() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('/api/auth/me')) errors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.fill('#login-email', 'residente@integrapex.test');
    await page.fill('#login-password', 'IntegrApex2026!');
    await page.click('button[type=submit]');
    await page.waitForTimeout(1500);

    assert(new URL(page.url()).pathname === '/inicio', 'No redirige a /inicio (esta en ' + page.url() + ')');

    const body = await page.locator('body').innerText();
    assert(body.includes('Listado de Contratos') || body.includes('Bienvenido') || body.includes('Contratos'),
      'Dashboard de residente no muestra contenido esperado');

    assert(errors.length === 0, 'Errores en consola post-login: ' + errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
  }
}

async function testCorreosSalientes() {
  const res = await login('residente@integrapex.test', 'IntegrApex2026!');
  const correos = await jsonResp(await res.get('/api/correos-salientes'), 'correos salientes residente');
  assert(Array.isArray(correos), 'correos-salientes no es array');
  await res.dispose();
}

async function main() {
  await startServer();
  console.log('\nIntegrApex Auditoria - ' + new Date().toLocaleTimeString() + '\n');
  console.log('-'.repeat(55));

  try {
    await test('CAT-01  Catalogo de dependencias (CRUD + autorizacion)',    testCatalogoDependencias);
    await test('CAT-02  Catalogo de empresas (CRUD + autorizacion)',         testCatalogoEmpresas);
    await test('SEG-01  Endpoints protegidos sin sesion devuelven 401',     testAccesoSinAutenticacion);
    await test('SEG-02  Autorizacion por rol - admin restringido',          testAutorizacionPorRol);
    await test('AUTH-01 Login con credenciales invalidas y pendientes',     testLoginInvalido);
    await test('NOTIF-01 Notificaciones y correos salientes',               testNotificacionesYCorreos);
    await test('EXP-01  Expediente - buscador de documentos',               testExpedienteBuscador);
    await test('DB-01   Contratos semilla (6 contratos, 6 folios)',         testContratosSemilla);
    await test('DASH-01 Portafolio ejecutivo con agrupacion',               testPortafolioEjecutivo);
    await test('FIA-01  Fianza sin PDF no causa error 500',                 testFianzaSinPdfFalla);
    await test('REP-01  7 tipos de reportes (XLSX + PDF) en contrato base', testReportesContratoBase);
    await test('DASH-02 Tablero de estimaciones activas',                   testTableroEstimaciones);
    await test('ADMIN-01 Admin: registrar, aprobar y rechazar usuarios',    testAdminSolicitudes);
    await test('UI-01   Responsividad 3 viewports (movil/tablet/desktop)',  testResponsividadUI);
    await test('UI-02   Navegacion post-login en Chromium',                 testNavegacionPostLogin);
    await test('NOTIF-02 Correos salientes accesibles por residente',       testCorreosSalientes);
  } finally {
    await stopServer();
  }

  console.log('-'.repeat(55));
  const failed = results.filter(r => r.status === 'fail');
  const pass   = results.length - failed.length;
  console.log('\n' + pass + '/' + results.length + ' pruebas pasaron\n');

  if (failed.length) {
    console.log('Fallos:');
    failed.forEach(f => console.log('  x ' + f.name));
    process.exit(1);
  }
}

main().catch(async err => {
  console.error(err.stack || err.message);
  await stopServer();
  process.exit(1);
});
