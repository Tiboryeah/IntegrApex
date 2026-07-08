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

La trazabilidad frente a `Historias_Usuario.xlsx` esta en [MATRIZ_CUMPLIMIENTO_HU.md](MATRIZ_CUMPLIMIENTO_HU.md).

## Estado Actual Del Bloque Implementado

- HU-05: programa de obra con curva S, Gantt, filtros por concepto/periodo y avance programado, fisico y financiero.
- HU-06: registro funcional de trabajos terminados por periodo, ligado obligatoriamente a nota de bitacora y validado contra catalogo.
- HU-07: alertas por concepto con canal, estado activo/pausado, calculo de atraso, notificacion interna y acciones de pausa/reactivacion.

## Estructura

```text
backend/
  server.js               # composicion de Express: middlewares, routers, catch-all
  src/db/store.js
  src/middleware/
    auth.js
    upload.js              # config de multer
    errorHandler.js        # middleware final de errores -> JSON
  src/utils/validators.js  # helpers de validacion compartidos
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
    pagos.routes.js
    alertas.routes.js
frontend/public/
  index.html
  style.css
  app_v99.js               # core: estado, api(), router SPA, sidebar, dashboards, shell de contrato, modal/toast
  js/modules/
    contratos.js            # HU-01 alta de contrato
    expediente.js           # HU-04 pestanas config/catalogo, buscador, exportacion CSV
    fianzas.js               # HU-02
    convenios.js             # HU-03
    documentos.js            # HU-11 minutas/visitas
    bitacora.js               # HU-08, HU-09, HU-10, bandeja Por Firmar
    estimaciones.js           # HU-12 a HU-21
    programa.js                # HU-05, HU-06, HU-07: curva S, Gantt, trabajos por periodo, alertas
backend/data/db.json
Historias_Usuario.xlsx
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
