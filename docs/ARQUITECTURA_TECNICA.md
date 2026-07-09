# Arquitectura técnica - IntegrApex

## 1. Visión general

IntegrApex es una SPA servida por Express. El backend expone rutas REST bajo `/api` y el mismo servidor entrega los archivos estáticos de `frontend/public`.

```text
Navegador
  -> frontend/public/index.html
  -> frontend/public/js/core/*
  -> frontend/public/js/modules/*
  -> /api/*
  -> backend/src/routes/*
  -> backend/src/db/store.js
  -> backend/data/db.json
```

## 2. Backend

### 2.1 Entrada principal

`backend/server.js` configura:

- JSON body parser.
- Cookies.
- CORS.
- Archivos estáticos.
- Rutas API.
- Catch-all para la SPA.
- Manejador central de errores.
- Scheduler de alertas.

### 2.2 Rutas por dominio

Cada archivo en `backend/src/routes/` contiene endpoints de un dominio funcional. Esto evita concentrar la lógica en un solo archivo y facilita mantenimiento.

| Archivo | Dominio |
|---|---|
| `auth.routes.js` | Login, registro y aprobación de usuarios. |
| `contratos.routes.js` | Alta, consulta y expediente de contratos. |
| `fianzas.routes.js` | Pólizas, vigencias y endosos. |
| `convenios.routes.js` | Convenios modificatorios y versiones. |
| `bitacora.routes.js` | Apertura, firmas, notas y exportación. |
| `minutasVisitas.routes.js` | Minutas y visitas de obra. |
| `trabajosPeriodo.routes.js` | Avance ejecutado por periodo. |
| `estimaciones.routes.js` | Integración, revisión, autorización y reingreso. |
| `pagos.routes.js` | Suficiencia, instrucción y registro de pago. |
| `tableros.routes.js` | Tablero de estimaciones y portafolio. |
| `reportes.routes.js` | Exportación de reportes. |
| `alertas.routes.js` | Alertas por desviación. |
| `notificaciones.routes.js` | Bandeja de notificaciones. |

### 2.3 Utilidades

`backend/src/utils/` concentra cálculos y generadores reutilizables:

- Validación de programa y montos.
- Cálculo de avance.
- Semáforos de plazos legales.
- Generación de XLSX/PDF.
- Datos de reportes.
- Notificación por canal.

### 2.4 Persistencia

`backend/src/db/store.js` implementa un repositorio JSON simple con colecciones por dominio. El archivo físico se ubica en:

```text
backend/data/db.json
```

## 3. Frontend

### 3.1 Bootstrap

`frontend/public/app_v99.js` define el estado inicial y mezcla los métodos registrados en `window.IntegrApexModules`.

### 3.2 Núcleo frontend

| Archivo | Responsabilidad |
|---|---|
| `js/core/api.js` | Comunicación HTTP y manejo básico de errores. |
| `js/core/ui.js` | Modal global y toasts. |
| `js/core/router.js` | Navegación, rutas públicas/privadas e historial. |
| `js/core/layout.js` | Header, menú lateral y accesos por rol. |

### 3.3 Módulos funcionales

| Archivo | Responsabilidad |
|---|---|
| `auth.js` | Login y solicitud de acceso. |
| `inicio.js` | Pantalla inicial por rol. |
| `admin.js` | Aprobación de solicitudes. |
| `contratosShell.js` | Listado y shell del expediente. |
| `contratos.js` | Alta de contratos. |
| `expediente.js` | Configuración, catálogo y búsqueda documental. |
| `fianzas.js` | Garantías y endosos. |
| `convenios.js` | Convenios modificatorios. |
| `documentos.js` | Minutas y visitas. |
| `bitacora.js` | Bitácora, firmas, notas y exportación. |
| `programa.js` | Programa, curva S, Gantt y alertas. |
| `estimaciones.js` | Ciclo completo de estimaciones. |
| `portafolio.js` | Vista ejecutiva de contratos. |
| `notificaciones.js` | Campana de notificaciones. |

## 4. Seguridad y límites conocidos

El prototipo usa cookies HTTP-only con JWT. Para un ambiente productivo se recomienda:

- Hash de contraseñas con bcrypt o Argon2.
- Base de datos administrada.
- Rotación de `JWT_SECRET`.
- HTTPS obligatorio.
- Auditoría persistente de operaciones críticas.
- Backups programados.

## 5. Pruebas automatizadas

La suite en `tests/run-integrapex-tests.js` levanta un servidor de prueba, reinicia datos y valida:

- Login y rutas por rol.
- Registro y aprobación.
- Contratos, expediente, fianzas, convenios, bitácora.
- Estimaciones, pagos, portafolio y reportes.
- Descargas XLSX/PDF válidas.
