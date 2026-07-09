# IntegrApex

IntegrApex es una aplicación web para la gestión técnico-administrativa de contratos de obra pública. Incluye control de acceso por rol, expediente contractual, bitácora electrónica, estimaciones, fianzas, convenios, reportes, alertas, notificaciones y tránsito a pago.

## Estado de la entrega

La aplicación está lista para ejecución local y revisión funcional. Las 24 historias de usuario de `Historias_Usuario.xlsx` se encuentran trazadas en `MATRIZ_CUMPLIMIENTO_HU.md` y cuentan con pruebas automatizadas de regresión.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Navegador moderno: Chrome, Edge, Firefox o Brave.
- Puerto local disponible: `3000`.

## Instalación rápida

```powershell
npm install
npm start
```

Abrir en el navegador:

```text
http://localhost:3000
```

El servidor Express expone la API y también sirve el frontend estático desde `frontend/public`.

## Cuentas de demostración

Las cuentas base están documentadas en `Cuentas_Prueba_IntegrApex.md`. Para una revisión inicial se recomienda iniciar con:

```text
residente@integrapex.test
IntegrApex2026!
```

## Scripts disponibles

```powershell
npm start
npm test
npm run test:smoke
npm run test:hu -- HU-12
```

- `npm start`: inicia la aplicación en `http://localhost:3000`.
- `npm test`: ejecuta smoke en navegador, acceso/registro y flujo funcional de HU-01 a HU-21.
- `npm run test:smoke`: valida login y rutas críticas por rol en Chromium.
- `npm run test:hu -- HU-12`: filtra por HU cuando aplica.

## Persistencia

La persistencia del prototipo es local en JSON:

```text
backend/data/db.json
```

El archivo se regenera automáticamente desde `backend/src/db/store.js` si no existe. Esta decisión facilita pruebas, revisión académica y despliegues ligeros. Para producción formal se recomienda migrar la persistencia a PostgreSQL o una base equivalente, con cifrado de contraseñas y variables de entorno para secretos.

## Estructura principal

```text
backend/
  server.js
  src/db/store.js
  src/middleware/
  src/routes/
  src/utils/
  src/jobs/

frontend/public/
  index.html
  style.css
  app_v99.js
  js/core/
  js/modules/

docs/
  MANUAL_USUARIO.md
  MANUAL_INSTALACION_DESPLIEGUE.md
  ARQUITECTURA_TECNICA.md

tests/
  run-integrapex-tests.js
```

## Arquitectura frontend

`frontend/public/app_v99.js` es únicamente el punto de arranque de la SPA: define el estado inicial, mezcla módulos registrados y ejecuta `app.init()`.

La lógica común vive en:

- `frontend/public/js/core/api.js`: wrapper HTTP compartido.
- `frontend/public/js/core/ui.js`: modal y notificaciones tipo toast.
- `frontend/public/js/core/router.js`: rutas, historial del navegador e inicialización.
- `frontend/public/js/core/layout.js`: header, sidebar y accesos por rol.

Las pantallas de negocio viven en `frontend/public/js/modules/`, separadas por dominio: autenticación, inicio, administración, contratos, expediente, fianzas, convenios, bitácora, documentos, programa, estimaciones, portafolio y notificaciones.

## Arquitectura backend

`backend/server.js` compone la aplicación Express: middlewares, archivos estáticos, rutas API, catch-all de SPA y manejador de errores.

Cada dominio tiene su router propio en `backend/src/routes/`:

- `auth.routes.js`
- `contratos.routes.js`
- `fianzas.routes.js`
- `convenios.routes.js`
- `bitacora.routes.js`
- `minutasVisitas.routes.js`
- `trabajosPeriodo.routes.js`
- `estimaciones.routes.js`
- `tableros.routes.js`
- `reportes.routes.js`
- `pagos.routes.js`
- `alertas.routes.js`
- `notificaciones.routes.js`

Los cálculos y generadores reutilizables viven en `backend/src/utils/`.

## Documentación de entrega

- `docs/MANUAL_USUARIO.md`: guía funcional por rol.
- `docs/MANUAL_INSTALACION_DESPLIEGUE.md`: instalación local, despliegue y operación.
- `docs/ARQUITECTURA_TECNICA.md`: organización técnica del sistema.
- `MATRIZ_CUMPLIMIENTO_HU.md`: trazabilidad de historias de usuario.
- `Cuentas_Prueba_IntegrApex.md`: cuentas de demostración.

## Verificación final

Antes de entregar o desplegar:

```powershell
npm test
```

Resultado esperado:

```text
3/3 pruebas pasaron
```
