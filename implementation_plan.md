# Banco de Dependencias y Empresas

Agregar la capacidad de dar de alta **Dependencias Contratantes** y **Empresas Contratistas** como entidades independientes con persistencia en `db.json`, ordenadas alfabéticamente. Estas entidades quedarán disponibles en el formulario de alta de contratos para ser seleccionadas.

## Entidades a crear

### Dependencias
Campos: `id`, `nombre`, `siglas`, `rfc`, `direccion`, `telefono`, `email`, `nombre_contacto`, `creado_en`

### Empresas
Campos: `id`, `nombre_comercial`, `razon_social`, `rfc`, `direccion`, `telefono`, `email`, `representante`, `creado_en`

---

## Propuestos cambios

### Backend

#### [MODIFY] [store.js](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/backend/src/db/store.js)
- Agregar colecciones `dependencias` y `empresas` al `initialState` (arrays vacíos).
- El `read()` ya maneja claves faltantes, así que la migración de `db.json` existente es automática.

#### [NEW] [catalogo.routes.js](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/backend/src/routes/catalogo.routes.js)
Nuevas rutas REST bajo `/api/catalogo`:

| Método | Path                        | Descripción                           |
|--------|-----------------------------|---------------------------------------|
| GET    | `/api/catalogo/dependencias`| Lista todas ordenadas alfabéticamente |
| POST   | `/api/catalogo/dependencias`| Da de alta una nueva                  |
| GET    | `/api/catalogo/empresas`    | Lista todas ordenadas alfabéticamente |
| POST   | `/api/catalogo/empresas`    | Da de alta una nueva                  |

Acceso: autenticado; alta restringida a roles `residente` y `dependencia`.

#### [MODIFY] [index.js (routes)](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/backend/src/routes/index.js)
- Registrar `catalogo.routes.js`.

---

### Frontend

#### [NEW] [catalogo.js (módulo)](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/frontend/public/js/modules/catalogo.js)
Módulo con:
- `renderCatalogoBanco()` — pantalla dedicada con dos tabs: **Dependencias** | **Empresas**. Muestra la lista ordenada como tarjetas/tabla.
- `openNuevaDependenciaModal()` — abre un modal con el formulario de alta.
- `submitNuevaDependencia()` — POST al API, cierra modal y refresca lista.
- `openNuevaEmpresaModal()` — abre modal con formulario.
- `submitNuevaEmpresa()` — POST al API, cierra modal y refresca lista.
- Helpers `loadDependencias()` / `loadEmpresas()` que devuelven la lista ya ordenada para usar en selects de otros módulos.

#### [MODIFY] [contratos.js](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/frontend/public/js/modules/contratos.js)
- En `renderAltaContrato()`, reemplazar los inputs de texto para "dependencia" y "empresa" por:
  - Un `<select>` de dependencias cargado desde `/api/catalogo/dependencias`.
  - Botón **+ Nuevo** que abre `openNuevaDependenciaModal()`.
  - Un `<select>` de empresas cargado desde `/api/catalogo/empresas`.
  - Botón **+ Nuevo** que abre `openNuevaEmpresaModal()`.
- Al guardar el contrato, incluir `dependencia_id` y `empresa_id` en el payload (como campos adicionales que se guardan en el contrato).

#### [MODIFY] [router.js](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/frontend/public/js/core/router.js)
- Agregar ruta `catalogo-banco` → `renderCatalogoBanco()`.
- URL: `/catalogo`.

#### [MODIFY] [layout.js](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/frontend/public/js/core/layout.js)
- Agregar ítem "Banco de Catálogos" en el sidebar para roles `residente` y `dependencia`.

#### [MODIFY] [index.html](file:///c:/Users/USER/.gemini/antigravity/scratch/IntegrApex/frontend/public/index.html)
- Agregar `<script src="/js/modules/catalogo.js?v=107">`.

---

## Flujo de uso

1. Usuario navega a **Banco de Catálogos** desde el sidebar.
2. Ve dos tabs: Dependencias / Empresas, cada una con lista alfabética.
3. Usa el botón **"+ Nueva Dependencia"** o **"+ Nueva Empresa"** para abrir el modal de alta.
4. Llena el formulario y guarda → el registro aparece al instante en la lista, ordenado.
5. Al crear un contrato nuevo, los selects de Dependencia y Empresa se cargan desde el banco.
6. El botón **+ Nuevo** dentro del formulario de contrato también abre el modal correspondiente sin salir del flujo.

## Verificación

- Iniciar el servidor y navegar a `/catalogo`.
- Dar de alta al menos 3 dependencias en orden no alfabético y verificar que la lista se muestra en orden A-Z.
- Dar de alta empresas y repetir la verificación.
- Ir a **Alta de Contrato**, verificar que los selects se poblán con las entidades del banco.
- Crear un contrato usando dependencia y empresa del banco.
- Reiniciar el servidor y verificar que los datos persisten.
