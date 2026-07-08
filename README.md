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
  server.js
  src/db/store.js
  src/middleware/auth.js
frontend/public/
  index.html
  style.css
  app_v99.js
  js/modules/
data/db.json
Historias_Usuario.xlsx
```

## Convencion De Frontend

El archivo `app_v99.js` queda como contenedor de arranque, navegacion y compatibilidad. La funcionalidad nueva o de alto volumen debe ir en `frontend/public/js/modules/` y registrarse en `window.IntegrApexModules` para evitar seguir creciendo el archivo principal.

Modulo extraido actualmente:

- `js/modules/programa.js`: HU-05, HU-06 y HU-07, incluyendo curva S, Gantt, trabajos terminados por periodo y alertas por concepto.

## Verificacion Recomendada

1. Iniciar sesion con cada rol base.
2. Confirmar que el menu cambia por rol.
3. Abrir expediente de contrato y revisar pestanas de configuracion, catalogo, programa, garantias, convenios, bitacora y estimaciones.
4. Probar responsive en anchos 1366, 1024, 768 y 390 px.
5. Revisar la matriz de cumplimiento antes de presentar la entrega.
