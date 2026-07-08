# Matriz De Cumplimiento - IntegrApex

Fuente: `Historias_Usuario.xlsx` (criterios de aceptación leídos directamente de cada hoja, no resumidos). Estado verificado criterio por criterio contra el código actual: `backend/src/routes/*.routes.js`, `frontend/public/app_v99.js` y `frontend/public/js/modules/*.js`.

Leyenda: **Cumple** (los 3 criterios se satisfacen), **Cumple con matices** (funciona pero con una desviación menor respecto a la letra del criterio), **Parcial** (falta al menos un criterio de forma sustancial).

## Acceso (Cumple 100%)

| Historia | Estado | Evidencia | Notas |
|---|---|---|---|
| HU-00 Inicio de sesión por rol | Cumple | `auth.routes.js` `/auth/login` | Verificado en navegador: bloquea vacíos/incorrectos, deduce rol sin pedirlo, cada registro guarda `creado_por_id/nombre/en`. |
| Registro de usuario con aprobación | Cumple | `auth.routes.js` `/auth/register`, `/admin/requests`, `/admin/approve` | Verificado en navegador extremo a extremo: cuenta pendiente → login bloqueado con aviso → aprobación por dependencia con `aprobado_por/aprobado_en` → login habilitado. |
| Por Firmar | Cumple | `bitacora.routes.js` `/bitacora/por-firmar`, `/bitacora/:id/firmar` | Cada firmante ve solo lo suyo; firma solo con su propio `user.id`; se marca `completada` cuando firman todos. **Nota:** la pantalla ya funcionaba pero no tenía ningún enlace en el sidebar — era inalcanzable desde la UI. Se conectó al agregar el tablero de HU-17. |

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
| HU-10 Consulta y búsqueda de notas | **Cumple** | Filtra con AND por tipo, fecha inicio, fecha fin, **firmante** (select poblado con los autores reales de la bitácora) y **vínculo** (por folio), todos combinables. Cada nota tiene checkbox de selección + "Seleccionar todas"; **"Exportar selección" genera un .xlsx real** (vía `exceljs`, endpoint `GET /contratos/:id/bitacora/notas/export?ids=...`) — verificado que el archivo descargado es un ZIP/XLSX válido (firma `PK`), no un CSV disfrazado. Utilidad reutilizable en `backend/src/utils/xlsxExport.js` para futuras exportaciones (HU-19). |
| HU-11 Minutas, visitas y acuerdos | **Cumple** | Filtro por periodo (mes) sobre minutas y visitas ya cargadas del contrato — filtrado en cliente ya que ambas colecciones vienen embebidas en el contrato, sin round-trip extra. La nota de bitácora ahora acepta `referencia_tipo`/`referencia_id` (`minuta` o `visita`), validado contra el contrato en el backend, con selector en el formulario de nueva nota y badge visible en el listado. |

## Estimaciones

| Historia | Estado | Notas |
|---|---|---|
| HU-12 Apertura e integración de estimación | **Parcial alto** | Cálculo automático de anticipo/retención 5 al millar/deductivas: correcto. Bloqueo por excedente Art. 118: correcto. **Faltan por completo: registro fotográfico (no existe campo ni carga de fotos) y soportes al momento de integrar** (el único PDF se carga hasta HU-13, al enviar). **Las notas vinculadas no se seleccionan desde el buscador de bitácora**: hoy es un campo numérico manual (`est-vinculos`) donde se escribe un ID de nota a mano. |
| HU-13 Envío de la estimación | **Parcial** | Fecha/hora de recepción se registra. Bloqueo de los 6 días: el backend rechaza el envío tarde, pero **el botón "Enviar" no se deshabilita en la UI** antes de intentarlo (el criterio pide que se deshabilite, no solo que falle después). **No se genera ninguna notificación a residencia/supervisión** al enviar (no hay inserción en `notificaciones`). **No existe ningún campo que registre el inicio del plazo de 15 días de revisión** ni un semáforo visible. |
| HU-14 Historial de estimaciones | **Cumple** | Filtros por periodo y estado (AND) agregados a `GET /contratos/:id/estimaciones` + formulario en la pantalla de Estimaciones. Verificado que un periodo inexistente devuelve vacío y que un periodo real devuelve exactamente esa estimación. |
| HU-15 Recepción, revisión y autorización | **Parcial** | ✅ Corregido: `/estimaciones/:id/resolver` ahora exige `en_revision` (rechaza `presentada` con 400) y la UI de residencia ya no muestra los botones de autorizar/rechazar hasta que Supervisión turna — verificado end-to-end con Playwright. Sigue faltando: **revisión sección por sección** (carátula/generadores/fotos/soportes/notas) — las observaciones son un textarea libre único, sin tipo, severidad ni concepto asociado — y **el semáforo de 15 días** (art. 54 LOPSRM), que no existe en ningún lado. |
| HU-16 Reingreso tras rechazo | **Cumple** | La nueva versión queda como bloque independiente vinculado a la rechazada (`estimacion_vinculada_id`), sin reiniciar fechas de periodo. Las observaciones ahora se muestran inline en la estimación rechazada y se descargan en **Excel o PDF reales** desde `GET /estimaciones/:id/observaciones/export` (reutiliza los builders de HU-10/19). |
| HU-17 Tablero de estimaciones | **Cumple** | Nueva pantalla `Tablero de Estimaciones` (sidebar, HU-17) para residente/contratista/supervision/finanzas: solo activas (excluye rechazada/borrador), tarjetas de resumen agregado por estado (conteo + monto), **línea de tiempo por estimación** (reconstruida de los timestamps ya existentes: creación, presentación, revisión, autorización, instrucción de pago, pago), y panel **"Mis Pendientes"** filtrado por `requiere_mi_accion` (ahora también cubre a contratista cuando una estimación queda `autorizada`, antes solo se calculaba para supervision/residente/finanzas). Clic en una fila navega directo al detalle de esa estimación en su contrato. De paso se conectó **"Por Firmar"** al sidebar (existía y funcionaba, pero no había ningún enlace para llegar a esa pantalla). |
| HU-18 Portafolio ejecutivo | **Parcial** | El semáforo existe mecánicamente, pero **se calcula con datos simulados**: `avance_programado` está fijo en `60.0` (hardcodeado, no calculado del programa real del contrato) y "pendientes" cuenta *todas* las notas del contrato, no las que de verdad están sin atender. No factoriza atrasos en plazos legales (estimaciones vencidas, fianzas por vencer). El clic sobre la tarjeta no abre un detalle consolidado de indicadores (físico/financiero/atrasos/penalizaciones) — lleva al Expediente genérico. **No hay agrupación** (contratista / ejercicio fiscal / tipo de contratación) **ni comparativo contra el periodo anterior**. |
| HU-19 Exportación de los 7 reportes | **Cumple** | Cada uno de los 7 reportes se descarga en **Excel real** (`exceljs`) o **PDF real** (`pdfkit`, tabla paginada con encabezado), a elección del usuario, desde `GET /contratos/:id/reportes/:tipo/export?formato=xlsx\|pdf`. **Selector de periodo** (acumulado / mensual / trimestral) filtra las estimaciones, notas y convenios subyacentes por fecha sin cambiar la estructura del reporte — verificado que un mes sin datos devuelve un archivo válido con 0 filas y el mes real devuelve la información esperada. Definiciones de columnas centralizadas en `backend/src/utils/reportData.js`, reutilizando `xlsxExport.js` (de HU-10) y el nuevo `pdfExport.js`. |
| HU-20 Tránsito a pago | **Parcial** | Bloquea si excede presupuesto: sí, pero **contra un techo anual hardcodeado (`$15,000,000`) igual para todos los contratos**, no un presupuesto real por contrato/ejercicio. Exige factura y CFDI antes de generar instrucción: sí. **No valida el estado de la fianza de cumplimiento cuando el contrato lo exige** (criterio explícito del HU). **No hay semáforo de 20 días** (art. 54 LOPSRM) en ningún lado. |
| HU-21 Registro del pago efectuado | Cumple | Marca la estimación como pagada, guarda fecha/importe/referencia/usuario; el avance financiero se deriva automáticamente de las estimaciones en estado `pagada` (no requiere un paso extra). |

## Resumen priorizado para la siguiente vuelta

1. ~~Bug real: HU-15 permitía que residencia resolviera sin que supervisión hubiera turnado~~ — **corregido y verificado.**
2. ~~HU-10: exportación a Excel falsa y filtros por firmante/vínculo faltantes~~ — **corregido y verificado** (exportación real a `.xlsx` con `exceljs`, filtros completos con AND).
3. ~~HU-17: backend listo pero sin pantalla~~ — **corregido y verificado** (tablero + Mis Pendientes + línea de tiempo; de paso se conectó "Por Firmar", que tampoco tenía enlace).
4. ~~HU-19: solo CSV, sin selector de periodo~~ — **corregido y verificado** (Excel y PDF reales para los 7 reportes, filtro acumulado/mensual/trimestral).
5. **HU-12, HU-13, HU-16, HU-18, HU-20** comparten el mismo patrón y son lo que queda: la mecánica central (cálculos, bloqueos) ya funciona, pero falta la capa de evidencias/soportes/semáforos/plazos legales alrededor. Siguiente candidato natural: cualquiera de estas cinco.

## Plan De Cierre (orden correcto para las 8 historias "Parcial")

Quedaban 8 historias en **Parcial**: HU-11, HU-12, HU-13, HU-14, HU-15, HU-16, HU-18, HU-20. No se resuelven en el orden en que aparecen en el Excel — hay dependencias reales de datos y de infraestructura entre ellas que conviene respetar para no reconstruir lo mismo dos veces.

### Bloque 1 — Ganancias rapidas e independientes (cualquier orden entre si) — ✅ Completado

Reutilizaron infraestructura que ya existia (`xlsxExport.js`/`pdfExport.js` de HU-10/19, el patron de filtros AND de HU-10). No dependian de nada mas y no bloqueaban nada mas.

1. ~~**HU-16**: endpoint para descargar las observaciones de una estimacion rechazada en PDF/Excel~~ — hecho, reutilizando los builders de HU-19, mas visibilidad inline de las observaciones (antes no se mostraban en ningun lado).
2. ~~**HU-14**: filtros por periodo y estado (AND) en `GET /contratos/:id/estimaciones` + UI~~ — hecho, mismo patron que HU-10.
3. ~~**HU-11**: filtro por periodo en minutas/visitas, y referencia opcional (`referencia_tipo`/`referencia_id`) en la nota de bitacora~~ — hecho, con selector en el formulario y badge en el listado.

Verificado en navegador (11/11): observaciones visibles + descarga real en Excel y PDF, filtro de periodo en historial de estimaciones (vacio vs. coincidencia exacta), filtro de estado, filtro por periodo en minutas/visitas, y nota nueva referenciando una minuta con su badge visible. Suites de regresion previas re-verificadas sin hallazgos nuevos.

### Bloque 2 — Pieza compartida de plazos legales + notificaciones

4. Crear `backend/src/utils/plazosLegales.js`: helper puro (fecha inicio + dias limite -> dias restantes + semaforo verde/ambar/rojo). Sin esto, HU-13, HU-20 y HU-18 terminarian reimplementando la misma cuenta tres veces.
5. **HU-13**: semaforo de 15 dias (usa el helper), deshabilitar el boton "Enviar" en la UI cuando pasen los 6 dias (hoy solo falla despues, en el backend), notificacion real a residencia/supervision al enviar (mismo patron `notificaciones` que ya usa HU-07).
6. **HU-20**: semaforo de 20 dias (mismo helper), reemplazar el techo presupuestal global hardcodeado (`$15,000,000` para todos los contratos) por el monto contractual restante del contrato especifico, validar el estado de la fianza de cumplimiento cuando el contrato lo exija.
7. **HU-15 (parte A)**: semaforo de 15 dias de revision visible para supervision/residencia — mismo helper del paso 4. La otra mitad de HU-15 queda para el Bloque 4.

### Bloque 3 — HU-18 se apoya en todo lo anterior

8. **HU-18**: avance programado real (portar a backend el calculo acumulado que ya existe en `programa.js` para HU-05, en vez del 60% fijo), atrasos reales (reutiliza el helper de plazos legales del Bloque 2), pendientes reales (reutiliza `requiere_mi_accion` que ya se construyo para HU-17, en vez de contar todas las notas), agrupacion por contratista/ejercicio fiscal/tipo de contratacion y comparativo contra el periodo anterior.

### Bloque 4 — HU-12 al final, y con el HU-15 completo

9. **HU-12**: registro fotografico, soportes al momento de integrar (hoy solo se cargan al enviar, HU-13), y reemplazar el campo manual de ID de nota por un selector real que use el buscador de bitacora de HU-10.
10. **HU-15 (parte B)**: revision seccion por seccion (caratula/generadores/fotos/soportes/notas) con tipo/severidad/concepto por observacion. **No se puede hacer bien antes del paso 9** — no tiene sentido revisar "seccion de fotos" si HU-12 todavia no captura fotos como bloque propio.

Es la pieza mas grande y la que mas toca la pantalla de integracion de estimaciones (dinero real), por eso queda al final: para entonces ya existen y estan probados el helper de plazos, las notificaciones reales y las exportaciones — reduce el riesgo de tocar el formulario mas sensible del sistema con la infraestructura de soporte todavia sin probar.

### Fuera de este plan (opcional, pulido fino)

HU-02, HU-04, HU-07 y HU-09 quedaron como **Cumple con matices**: ya satisfacen el criterio central, las desviaciones son menores (alertas de fianza solo visuales, buscador de expediente sin descarga por fila, "disparo" de alerta sin evento real, formato "dice/debe decir" sin plantilla dedicada). No estan en la ruta critica; se abordan si se pide explicitamente un 100% literal.

## Estado general

El núcleo transaccional (contratos, fianzas, convenios, bitácora, programa, trabajos por periodo, integración/pago de estimaciones) funciona y ya está modularizado por dominio en backend (`src/routes/`) y frontend (`js/modules/`). Lo que falta para el 100% frente al Excel es, en su mayoría, la capa de "evidencia y trazabilidad legal" alrededor de ese núcleo: notificaciones reales, semáforos de plazo, exportaciones reales (XLSX/PDF) y algunos filtros de búsqueda que hoy son solo parciales.
