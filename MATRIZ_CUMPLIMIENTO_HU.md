# Matriz De Cumplimiento - IntegrApex

Fuente: `Historias_Usuario.xlsx`. Estado verificado contra `backend/server.js`, `frontend/public/app_v99.js`, `frontend/public/style.css` y datos locales.

| Historia | Estado | Evidencia principal | Observaciones |
|---|---|---|---|
| HU-00 Inicio de sesion por rol | Cumple | `/api/auth/login`, `/api/auth/me`, menus por rol | Login deduce rol desde usuario y no pide rol al iniciar sesion. |
| Registro de usuario | Cumple | `/api/auth/register`, `/api/admin/requests`, `/api/admin/approve` | Cuenta queda pendiente y dependencia aprueba/rechaza. |
| Por Firmar | Cumple | `/api/bitacora/por-firmar`, `/api/bitacora/:id/firmar` | Cada firmante ve solo sus aperturas pendientes. |
| HU-01 Alta de contratos | Cumple | `/api/contratos`, pantalla Alta de contrato | Captura datos generales, equipo, catalogo, programa mensual, juridicos, garantias, amortizacion, penalizaciones y PDF inmutable cuando se carga. Valida folio unico, catalogo, programa y garantias. |
| HU-02 Fianzas y garantias | Cumple | `/api/contratos/:id/fianzas`, `/api/fianzas/:id/endosos`, pestana Garantias | Registra poliza, PDF, metadatos, umbrales configurables de vencimiento y endosos con historial aplicado a monto/vigencia. |
| HU-03 Convenios modificatorios | Cumple | `/api/contratos/:id/convenios`, pestana Convenios | Aplica monto/plazo, clasifica Art. 59/59 Bis, crea version previa/nueva de contrato y genera endosos sobre fianzas asociadas. |
| HU-04 Expediente contractual | Cumple | `/api/contratos/:id`, `/api/contratos/:id/expediente/search`, pestana Configuracion | Vista integrada con bloques del expediente, buscador global AND por folio, contratista, periodo, tipo/bloque y palabra clave, y descarga individual de documentos vinculados. |
| HU-05 Programa y curva de avance | Cumple | pestana Programa y Avance, curva S, Gantt, tabla Avance por Concepto | Distingue avance programado, fisico ejecutado y financiero pagado. Incluye filtros por concepto y periodo, porcentajes por concepto y validacion responsive en 1366 px y 390 px. |
| HU-06 Trabajos terminados por periodo | Cumple | `/api/contratos/:id/trabajos-periodo`, panel Trabajos Terminados por Periodo | El contratista registra cantidades terminadas por periodo con fechas, observaciones y nota de bitacora obligatoria. Bloquea conceptos ajenos y excedentes contra catalogo/estimaciones conforme Art. 118 RLOPSRM. |
| HU-07 Alertas por concepto | Cumple | `/api/contratos/:id/alertas`, `/api/alertas/:id`, panel Vigilancia Conceptos | Crea/actualiza/elimina alertas, calcula atraso contra avance fisico, muestra canal, permite pausar/reactivar y registra notificaciones internas del sistema. |
| HU-08 Apertura formal de bitacora | Cumple | `/api/contratos/:id/bitacora/aperturar` | Bitacora unica, firmantes desde equipo del contrato y nota inicial al completarse firmas. |
| HU-09 Notas tipificadas con firma | Cumple | `/api/contratos/:id/bitacora/notas` | Folio correlativo, firma hash, tipos por rol y vinculo opcional a nota previa. |
| HU-10 Busqueda de notas | Parcial alto | filtros de bitacora, exportacion CSV | Filtra por tipo, fechas, creador y texto. Falta filtro explicito por vinculo y seleccion multiple antes de exportar. |
| HU-11 Minutas y visitas | Parcial | `/api/contratos/:id/minutas`, `/api/contratos/:id/visitas` | Registra PDF de minuta y visitas. Falta filtro por periodo y adjuntar minuta/visita en nota. |
| HU-12 Integracion de estimacion | Parcial alto | `/api/contratos/:id/estimaciones/integrar` | Calcula caratula, IVA, anticipo, retencion y bloquea excedentes. Soportes, fotos y notas vinculadas estan simplificados. |
| HU-13 Envio de estimacion | Parcial | `/api/estimaciones/:id/enviar` | Registra fecha de presentacion y valida 6 dias. Notificaciones y conteo visible de 15 dias no estan completos. |
| HU-14 Historial de estimaciones | Parcial | `/api/contratos/:id/estimaciones`, pantalla Estimaciones | Lista y abre estimaciones. Filtros por periodo/estado no estan completos. |
| HU-15 Revision y autorizacion | Parcial | `/api/estimaciones/:id/revisar`, `/api/estimaciones/:id/resolver` | Flujo supervision-residencia existe. Observaciones por seccion/severidad y semaforo de plazo requieren mejora. |
| HU-16 Reingreso tras rechazo | Parcial | `/api/estimaciones/:id/reingresar` | Nueva version vinculada. Falta descarga PDF/Excel de observaciones y control estricto de plazo. |
| HU-17 Tablero de estimaciones | Parcial | `/api/tableros/estimaciones-activas` | Filtra activas y marca accion por rol. Linea de tiempo e indicadores agregados son basicos. |
| HU-18 Portafolio ejecutivo | Parcial | `/api/tableros/portafolio` | Semaforo y drill-down. Agrupaciones y comparativo periodo anterior no estan implementados. |
| HU-19 Reportes definidos | Parcial alto | `/api/contratos/:id/reporte-data`, exportacion CSV | Entrega los 7 conjuntos de datos y exporta CSV. PDF y seleccion de periodicidad no estan completos. |
| HU-20 Transito a pago | Parcial | `/api/estimaciones/:id/presupuesto`, `/api/estimaciones/:id/instruccion-pago` | Verifica suficiencia y exige factura/CFDI. Falta semaforo visible de 20 dias y fianza cuando aplique. |
| HU-21 Registro de pago | Cumple | `/api/estimaciones/:id/registrar-pago` | Marca estimacion pagada, guarda referencia, fecha, monto y usuario. |

## Estado General

El sistema cubre funcionalmente la mayoria del flujo integral y es apto para demostracion academica/prototipo. Para declararlo 100% productivo frente al Excel, los puntos que conviene cerrar primero son: bitacora avanzada, soportes completos de estimaciones, notificaciones/semaforos legales restantes y exportacion PDF.
