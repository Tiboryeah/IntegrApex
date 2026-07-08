# Matriz De Cumplimiento - IntegrApex

Fuente: `Historias_Usuario.xlsx` (criterios de aceptación leídos directamente de cada hoja, no resumidos). Estado verificado criterio por criterio contra el código actual: `backend/src/routes/*.routes.js`, `frontend/public/app_v99.js` y `frontend/public/js/modules/*.js`.

Leyenda: **Cumple** (los 3 criterios se satisfacen), **Cumple con matices** (funciona pero con una desviación menor respecto a la letra del criterio), **Parcial** (falta al menos un criterio de forma sustancial).

## Acceso (Cumple 100%)

| Historia | Estado | Evidencia | Notas |
|---|---|---|---|
| HU-00 Inicio de sesión por rol | Cumple | `auth.routes.js` `/auth/login` | Verificado en navegador: bloquea vacíos/incorrectos, deduce rol sin pedirlo, cada registro guarda `creado_por_id/nombre/en`. |
| Registro de usuario con aprobación | Cumple | `auth.routes.js` `/auth/register`, `/admin/requests`, `/admin/approve` | Verificado en navegador extremo a extremo: cuenta pendiente → login bloqueado con aviso → aprobación por dependencia con `aprobado_por/aprobado_en` → login habilitado. |
| Por Firmar | Cumple | `bitacora.routes.js` `/bitacora/por-firmar`, `/bitacora/:id/firmar` | Cada firmante ve solo lo suyo; firma solo con su propio `user.id`; se marca `completada` cuando firman todos. |

## Contrato y expediente

| Historia | Estado | Notas |
|---|---|---|
| HU-01 Alta de contratos | Cumple | Folio único, suma catálogo = monto, cantidades/precios > 0, programa dentro de plazo, garantías con monto, PDF inmutable (no existe endpoint para reemplazarlo). |
| HU-02 Fianzas y garantías | Cumple con matices | Póliza con afianzadora/vigencia/monto y PDF consultable: sí. **El criterio "el sistema emite alerta a 30/15/5 días" hoy es solo un badge de color que se calcula al abrir la pestaña Garantías** — no se genera ningún registro en `notificaciones` cuando una fianza entra en ventana de vencimiento (a diferencia de HU-07, que sí inserta notificaciones). Si se quiere el criterio al pie de la letra, falta generar la notificación real, no solo el color. |
| HU-03 Convenios modificatorios | Cumple | Nueva versión de catálogo/programa sin alterar la anterior, clasifica Art. 59 / 59 Bis automáticamente, histórico con fecha/autor/motivo y endosos generados. |
| HU-04 Expediente contractual | Cumple con matices | Los 5 bloques existen y el buscador aplica AND (folio, contratista, objeto, periodo, tipo). **Los bloques están repartidos en pestañas, no en una sola vista** (interpretación de diseño, no bloqueante). **La tabla de resultados del buscador no trae enlace de descarga por fila** — el documento solo se descarga desde la pestaña "Configuración"/"Documentos" original, no desde el resultado de búsqueda. |

## Programa, avance y bitácora

| Historia | Estado | Notas |
|---|---|---|
| HU-05 Programa y curva de avance | Cumple | Gantt concepto×periodo con color ejecutado/no ejecutado, 3 curvas (programado/ejecutado/financiero), filtros por concepto y periodo recalculan ambas vistas, % global y por concepto. |
| HU-06 Trabajos terminados por periodo | Cumple | Cantidad ligada a concepto y a nota de bitácora, acumulado en vivo, bloqueo Art. 118 RLOPSRM. Nota menor: no valida que la nota vinculada sea tipo "Entrega"/"Avance" (acepta cualquier tipo de nota del contrato). |
| HU-07 Alertas de atraso por concepto | Cumple con matices | Crear/pausar/eliminar sin afectar otras: sí. El umbral se respeta. **"La alerta dispara" hoy es un badge que se recalcula al abrir la pestaña, no un evento real** — solo se inserta una notificación en el momento de crear/editar la alerta, no cada vez que el avance cruza el umbral. No hay verificación periódica (cron/poller) que dispare la notificación cuando realmente ocurre el atraso. |
| HU-08 Apertura formal de bitácora | Cumple | Bitácora única, firmantes tomados del equipo del contrato (no texto libre), firma completa cuando firman todos, primera nota con los datos obligatorios. |
| HU-09 Notas tipificadas con firma | Cumple con matices | Tipos por rol, folio correlativo, firma (hash) desde la cuenta propia, vínculo opcional a nota previa, no hay endpoint de edición/borrado (inmutable de facto). **El formato "dice / debe decir" no es un campo estructurado**: el vínculo a la nota previa existe, pero el usuario tiene que escribir "dice/debe decir" a mano en el contenido libre; no hay una plantilla dedicada. |
| HU-10 Consulta y búsqueda de notas | **Parcial** | Filtra por tipo, fecha inicio, fecha fin y palabra clave con AND — pero **el filtro por firmante y por vínculo no están expuestos en la UI** (el backend sí acepta `creador_id` pero el formulario no tiene ese campo; no existe filtro por `vinculo_nota_id` ni en backend ni en frontend). **La exportación a Excel es un stub que no exporta nada**: `exportBitacoraExcel()` solo muestra un toast de éxito, no genera archivo, y no hay forma de seleccionar varias notas (no hay checkboxes). Es el hueco más concreto de todo el sistema. |
| HU-11 Minutas, visitas y acuerdos | **Parcial** | Minutas y visitas se ven en la pestaña Documentos. **Falta el filtro por periodo** (hoy se listan todas, sin filtro de fecha/periodo ni en backend ni en frontend). **Falta la posibilidad de adjuntar una minuta o visita como referencia en una nota de bitácora** — el modelo de nota solo soporta `vinculo_nota_id` (a otra nota), no `minuta_id`/`visita_id`. |

## Estimaciones

| Historia | Estado | Notas |
|---|---|---|
| HU-12 Apertura e integración de estimación | **Parcial alto** | Cálculo automático de anticipo/retención 5 al millar/deductivas: correcto. Bloqueo por excedente Art. 118: correcto. **Faltan por completo: registro fotográfico (no existe campo ni carga de fotos) y soportes al momento de integrar** (el único PDF se carga hasta HU-13, al enviar). **Las notas vinculadas no se seleccionan desde el buscador de bitácora**: hoy es un campo numérico manual (`est-vinculos`) donde se escribe un ID de nota a mano. |
| HU-13 Envío de la estimación | **Parcial** | Fecha/hora de recepción se registra. Bloqueo de los 6 días: el backend rechaza el envío tarde, pero **el botón "Enviar" no se deshabilita en la UI** antes de intentarlo (el criterio pide que se deshabilite, no solo que falle después). **No se genera ninguna notificación a residencia/supervisión** al enviar (no hay inserción en `notificaciones`). **No existe ningún campo que registre el inicio del plazo de 15 días de revisión** ni un semáforo visible. |
| HU-14 Historial de estimaciones | **Parcial** | Muestra todas las estimaciones en orden cronológico, incluidas las rechazadas, y cada una abre su expediente. **No hay ningún filtro por periodo ni por estado** — ni en el backend (`GET /contratos/:id/estimaciones` no acepta query params) ni en la UI. |
| HU-15 Recepción, revisión y autorización | **Parcial** | ✅ Corregido: `/estimaciones/:id/resolver` ahora exige `en_revision` (rechaza `presentada` con 400) y la UI de residencia ya no muestra los botones de autorizar/rechazar hasta que Supervisión turna — verificado end-to-end con Playwright. Sigue faltando: **revisión sección por sección** (carátula/generadores/fotos/soportes/notas) — las observaciones son un textarea libre único, sin tipo, severidad ni concepto asociado — y **el semáforo de 15 días** (art. 54 LOPSRM), que no existe en ningún lado. |
| HU-16 Reingreso tras rechazo | **Parcial** | La nueva versión queda como bloque independiente vinculado a la rechazada (`estimacion_vinculada_id`), sin reiniciar fechas de periodo. **Falta la descarga en PDF/Excel de las observaciones de la versión rechazada** — no existe ese endpoint ni botón. |
| HU-17 Tablero de estimaciones | **Parcial (backend sin consumidor)** | El endpoint `/api/tableros/estimaciones-activas` existe y ya filtra activas (excluye rechazadas/borrador) y calcula `requiere_mi_accion` por rol — **pero ninguna pantalla del frontend lo consume**. La pantalla "Estimaciones" real llama a `GET /contratos/:id/estimaciones` (la lista simple), no al tablero. No hay línea de tiempo de estados, no hay indicadores agregados, y no existe un panel "Mis pendientes" en ninguna vista. |
| HU-18 Portafolio ejecutivo | **Parcial** | El semáforo existe mecánicamente, pero **se calcula con datos simulados**: `avance_programado` está fijo en `60.0` (hardcodeado, no calculado del programa real del contrato) y "pendientes" cuenta *todas* las notas del contrato, no las que de verdad están sin atender. No factoriza atrasos en plazos legales (estimaciones vencidas, fianzas por vencer). El clic sobre la tarjeta no abre un detalle consolidado de indicadores (físico/financiero/atrasos/penalizaciones) — lleva al Expediente genérico. **No hay agrupación** (contratista / ejercicio fiscal / tipo de contratación) **ni comparativo contra el periodo anterior**. |
| HU-19 Exportación de los 7 reportes | **Parcial alto** | Los 7 conjuntos de datos existen y se arman correctamente en `/contratos/:id/reporte-data`. **Pero solo se exporta CSV** (con BOM UTF-8) — no hay generación real de XLSX ni PDF (no está instalada ninguna librería para eso, ej. `exceljs`/`pdfkit`). **No hay selector de periodo** (mensual/trimestral/acumulado): siempre se exporta todo el histórico. |
| HU-20 Tránsito a pago | **Parcial** | Bloquea si excede presupuesto: sí, pero **contra un techo anual hardcodeado (`$15,000,000`) igual para todos los contratos**, no un presupuesto real por contrato/ejercicio. Exige factura y CFDI antes de generar instrucción: sí. **No valida el estado de la fianza de cumplimiento cuando el contrato lo exige** (criterio explícito del HU). **No hay semáforo de 20 días** (art. 54 LOPSRM) en ningún lado. |
| HU-21 Registro del pago efectuado | Cumple | Marca la estimación como pagada, guarda fecha/importe/referencia/usuario; el avance financiero se deriva automáticamente de las estimaciones en estado `pagada` (no requiere un paso extra). |

## Resumen priorizado para la siguiente vuelta

1. ~~Bug real: HU-15 permitía que residencia resolviera sin que supervisión hubiera turnado~~ — **corregido y verificado.**
2. **HU-10 es el hueco más visible**: la exportación a Excel no exporta nada (stub falso) y faltan dos filtros que el criterio pide explícitamente.
3. **HU-17 tiene el backend listo pero cero pantalla**: es la ganancia más barata (conectar un endpoint que ya funciona).
4. **HU-19 necesita XLSX/PDF real** (hoy todo es CSV) — requiere agregar una librería (ej. `exceljs` para Excel, `pdfkit` para PDF) siguiendo el patrón modular ya establecido (un módulo de generación de reportes en `backend/src/utils/`, no meter la lógica dentro de las rutas).
5. **HU-12, HU-13, HU-16, HU-18, HU-20** comparten el mismo patrón: la mecánica central (cálculos, bloqueos) ya funciona, pero falta la capa de evidencias/soportes/semáforos/plazos legales alrededor.

## Estado general

El núcleo transaccional (contratos, fianzas, convenios, bitácora, programa, trabajos por periodo, integración/pago de estimaciones) funciona y ya está modularizado por dominio en backend (`src/routes/`) y frontend (`js/modules/`). Lo que falta para el 100% frente al Excel es, en su mayoría, la capa de "evidencia y trazabilidad legal" alrededor de ese núcleo: notificaciones reales, semáforos de plazo, exportaciones reales (XLSX/PDF) y algunos filtros de búsqueda que hoy son solo parciales.
