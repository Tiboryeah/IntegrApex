# IntegrApex

Sistema web para la gestion tecnico-administrativa de contratos de obra publica, con control de acceso por rol, expediente contractual, bitacora electronica, estimaciones, convenios, fianzas, alertas, tableros y transito a pago.

> Nota de alcance: la carpeta `IntegrApex-main/` es un intento previo y no forma parte de esta entrega. El sistema vigente esta en `backend/`, `frontend/`, `data/` y los documentos de la raiz.

## Stack

- Backend: Node.js, Express, JWT, cookies HTTP-only, Multer.
- Frontend: SPA vanilla HTML/CSS/JS servida desde `frontend/public`.
- Persistencia: JSON local en `data/db.json`.
- Puerto por defecto: `3000`.

## Ejecucion Local

```powershell
npm install
npm start
```

Abrir: `http://localhost:3000`

## Cuentas De Prueba

Las cuentas base estan documentadas en [Cuentas_Prueba_IntegrApex.md](Cuentas_Prueba_IntegrApex.md). La contrasena general para las cuentas base es:

```text
IntegrApex2026!
```

## Roles Principales

- `residente`: alta de contratos, expediente, bitacora, avance, alertas, autorizacion de estimaciones.
- `contratista`: bitacora, integracion/envio/reingreso de estimaciones, soportes de pago.
- `supervision`: revision tecnica de estimaciones, bitacora, avance.
- `dependencia`: aprobacion de usuarios, fianzas, convenios, portafolio ejecutivo.
- `finanzas`: registro de pagos y seguimiento de estimaciones en pago.

## Documentacion De Cumplimiento

La trazabilidad frente a `Historias_Usuario.xlsx` esta en [MATRIZ_CUMPLIMIENTO_HU.md](MATRIZ_CUMPLIMIENTO_HU.md). Para contexto de alto nivel (que se hizo, en que orden y que faltaria si se retoma el proyecto), ver [CONTEXTO_AGENTE.md](CONTEXTO_AGENTE.md).

## Estado Actual

Las 24 Historias de Usuario de `Historias_Usuario.xlsx` estan en estado **Cumple** (detalle criterio por criterio en la matriz de cumplimiento). Incluye notificaciones reales (campana en el topbar), alertas de vencimiento de fianzas y de atraso por concepto disparadas por eventos reales de backend, exportaciones reales en Excel/PDF, semaforos de plazos legales, y un ciclo completo de estimaciones (integracion con fotos/soportes, revision seccionada, autorizacion, transito a pago).

## Estructura

```text
backend/
  server.js               # composicion de Express: middlewares, routers, catch-all, arranca el scheduler de alertas
  src/db/store.js
  src/middleware/
    auth.js
    upload.js              # config de multer
    errorHandler.js        # middleware final de errores -> JSON
  src/utils/
    validators.js          # parseJsonField, normalizeMoney, buildAmortizacionPlan, validatePrograma
    xlsxExport.js / pdfExport.js  # builders genericos de exportacion (HU-10/16/19)
    plazosLegales.js       # semaforo verde/ambar/rojo (HU-13/15/18/20)
    reportData.js          # los 7 reportes de HU-19
    avanceConceptos.js     # avance real por concepto (HU-06/HU-07)
    notificar.js           # entrega de notificacion por canal (sistema/correo)
  src/jobs/
    alertasScheduler.js    # HU-02 vigencia de fianzas + HU-07 disparo de alertas de atraso
  src/routes/
    index.js                # agrega todos los routers de dominio
    auth.routes.js
    contratos.routes.js
    fianzas.routes.js
    convenios.routes.js
    bitacora.routes.js
    minutasVisitas.routes.js
    trabajosPeriodo.routes.js
    estimaciones.routes.js
    tableros.routes.js
    reportes.routes.js
    pagos.routes.js
    alertas.routes.js
    notificaciones.routes.js
frontend/public/
  index.html
  style.css
  app_v99.js               # core: estado, api(), router SPA, sidebar, dashboards, shell de contrato, modal/toast
  js/modules/
    contratos.js            # HU-01 alta de contrato
    expediente.js           # HU-04 pestanas config/catalogo, buscador con descarga por fila, exportacion de reportes
    fianzas.js               # HU-02
    convenios.js             # HU-03
    documentos.js            # HU-11 minutas/visitas
    bitacora.js               # HU-08, HU-09 (incl. correccion Dice/Debe decir), HU-10, bandeja Por Firmar
    estimaciones.js           # HU-12 a HU-17, HU-20, HU-21
    portafolio.js             # HU-18 Portafolio Ejecutivo
    programa.js                # HU-05, HU-06, HU-07: curva S, Gantt, trabajos por periodo, alertas
    notificaciones.js          # campana de notificaciones del topbar
backend/data/db.json          # runtime, gitignored
Historias_Usuario.xlsx
MATRIZ_CUMPLIMIENTO_HU.md     # trazabilidad HU por HU
CONTEXTO_AGENTE.md            # contexto de alto nivel para retomar el proyecto
```

## Convencion De Frontend

El archivo `app_v99.js` es el nucleo: estado, wrapper `api()`, router SPA (`navigate`), sidebar, login/registro, dashboards de listado, el shell de `renderContractDetail` (pestanas + outlet) y utilidades de modal/toast. Toda funcionalidad especifica de una HU vive en `frontend/public/js/modules/`, registrada como un objeto de metodos en `window.IntegrApexModules.<nombre>` y mezclada en `app` via `Object.assign` al cargar `app_v99.js` (ultimo script en `index.html`).

Las pestanas del expediente de contrato (`config`, `catalogo`, `programa`, `fianzas`, `documentos`, `bitacora`, `convenios`) se renderizan por delegacion: `renderActiveTabContent` en `app_v99.js` solo despacha a un metodo `render<Tab>Tab(contract, outlet)` que aporta el modulo correspondiente de la tabla de arriba.

## Convencion De Backend

`server.js` unicamente arma la app de Express (middlewares, archivos estaticos, montaje de `src/routes`, catch-all SPA y manejador de errores). Cada dominio de negocio (auth, contratos, fianzas, convenios, bitacora, minutas/visitas, trabajos por periodo, estimaciones, tableros, pagos, alertas) tiene su propio router en `src/routes/*.routes.js`, montado una sola vez desde `src/routes/index.js`. Los helpers puros (validaciones, calculos) viven en `src/utils/` para poder reutilizarse y probarse por separado del transporte HTTP.

## Verificacion Recomendada

1. Iniciar sesion con cada rol base.
2. Confirmar que el menu cambia por rol.
3. Abrir expediente de contrato y revisar pestanas de configuracion, catalogo, programa, garantias, convenios, bitacora y estimaciones.
4. Probar responsive en anchos 1366, 1024, 768 y 390 px.
5. Revisar la matriz de cumplimiento antes de presentar la entrega.
