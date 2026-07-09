# Manual de usuario - IntegrApex

## 1. Acceso al sistema

1. Abrir `http://localhost:3000` o la URL proporcionada por el administrador.
2. Ingresar correo y contraseña.
3. El sistema identifica el rol del usuario y muestra el menú correspondiente.

Si el usuario aún no tiene cuenta, debe usar `Solicitar acceso`. La cuenta quedará pendiente hasta que un usuario con rol `dependencia` la apruebe.

## 2. Roles disponibles

| Rol | Funciones principales |
|---|---|
| Residente | Alta de contratos, expediente, bitácora, programa, avance y autorización de estimaciones. |
| Contratista | Bitácora, integración de estimaciones, envío de soportes y tránsito a pago. |
| Supervisión | Revisión técnica de estimaciones, bitácora y seguimiento del avance. |
| Dependencia | Aprobación de usuarios, fianzas, convenios y portafolio ejecutivo. |
| Finanzas | Registro de pagos y consulta de estimaciones en trámite de pago. |

## 3. Inicio

La pantalla de inicio muestra los flujos disponibles para el rol activo. Cada tarjeta abre un módulo operativo o indica que el usuario tiene acceso de solo lectura.

## 4. Alta de contratos

Disponible para el rol `residente`.

1. Abrir `Alta de contratos`.
2. Capturar datos generales del contrato.
3. Seleccionar residente, contratista/superintendente y supervisión.
4. Registrar catálogo de conceptos.
5. Capturar programa de obra.
6. Adjuntar documento de contrato cuando aplique.
7. Guardar.

El sistema valida importes, fechas, catálogo, programa y anticipo antes de crear el contrato.

## 5. Expediente contractual

Desde `Listado de contratos` se selecciona un contrato. El expediente se organiza en pestañas:

- Configuración.
- Catálogo.
- Programa y avance.
- Garantías.
- Minutas / Visitas.
- Bitácora de notas.
- Convenios.

La búsqueda del expediente permite localizar documentos y registros asociados mediante filtros combinados.

## 6. Fianzas y garantías

Disponible principalmente para `dependencia`.

1. Abrir el expediente del contrato.
2. Entrar a `Garantías`.
3. Registrar póliza, afianzadora, monto, vigencia y archivo PDF.
4. Guardar.

El sistema emite alertas cuando una fianza entra en umbrales de vencimiento. Los endosos permiten actualizar vigencias y mantener trazabilidad.

## 7. Bitácora

La bitácora permite apertura, firma y notas tipificadas.

Flujo general:

1. El residente apertura la bitácora.
2. Los firmantes revisan su bandeja `Por Firmar`.
3. Cada firmante registra su firma.
4. Una vez completada, se habilita el registro de notas.

Las notas pueden vincularse a registros previos y permiten correcciones formales con estructura `Dice / Debe decir`.

## 8. Programa, avance y alertas

En la pestaña `Programa y avance` se consulta:

- Programa mensual.
- Curva S.
- Gantt.
- Avance por concepto.
- Trabajos por periodo.
- Alertas por desviación.

Los trabajos por periodo deben vincularse con una nota de bitácora y no pueden exceder cantidades contratadas.

## 9. Minutas y visitas

Desde `Minutas / Visitas` se registran reuniones y visitas de obra. Los registros pueden filtrarse por periodo y referenciarse desde notas de bitácora.

## 10. Estimaciones

El ciclo de estimación cubre:

1. Integración por el contratista.
2. Adjuntos: fotos, soportes y notas vinculadas.
3. Envío formal.
4. Revisión técnica por supervisión.
5. Autorización o rechazo por residencia.
6. Reingreso si fue rechazada.
7. Instrucción de pago.
8. Registro de pago por finanzas.

El sistema calcula anticipo, retenciones, deductivas, importes y semáforos de plazo.

## 11. Tablero de estimaciones

Muestra estimaciones activas, montos por estado, línea de tiempo y pendientes del usuario. Cada fila permite abrir el detalle de la estimación.

## 12. Portafolio ejecutivo

Disponible para `dependencia`. Presenta contratos con semáforos de riesgo, agrupaciones, tendencias y detalle ejecutivo por contrato.

## 13. Reportes

Los reportes se descargan en Excel o PDF desde el expediente. El sistema permite periodos acumulados, mensuales y trimestrales.

## 14. Notificaciones

La campana superior muestra notificaciones reales del usuario, con contador de no leídas y opciones para marcar como leídas.

## 15. Cierre de sesión

Usar `Cerrar sesión` desde el menú lateral. El sistema borra la sesión activa y regresa a la pantalla de acceso.
