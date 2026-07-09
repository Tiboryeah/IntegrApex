# Contexto para el proximo agente — IntegrApex

Este documento existe para que cualquier agente (Claude u otro) que retome este
proyecto en una conversacion nueva entienda en minutos que es esto, que se hizo,
en que estado quedo y que haria falta si se le pide seguir. No sustituye al
codigo ni a `MATRIZ_CUMPLIMIENTO_HU.md` (la fuente de verdad linea por linea de
cada criterio de aceptacion) — es el mapa de alto nivel para orientarse rapido.

## Que es este proyecto

IntegrApex es un sistema de gestion tecnico-administrativa de contratos de obra
publica (Node/Express + SPA vanilla JS), construido para cumplir 24 Historias de
Usuario (HU) especificadas en `Historias_Usuario.xlsx`, con roles (residente,
contratista, supervision, dependencia, finanzas), cada uno viendo solo lo que su
rol permite conforme al Excel. El dueno del proyecto es un estudiante/desarrollador
que lo esta construyendo como entrega academica/prototipo funcional, no como
producto en produccion con datos reales.

## Como llego a este punto (orden cronologico real)

1. **Origen**: el usuario traia un chat previo con otro asistente (Codex) que
   habia dejado un plan de implementacion a medio camino (llegaron hasta HU-10).
   El codigo estaba en dos archivos monoliticos: `backend/server.js` (~1500
   lineas, todos los endpoints) y `frontend/public/app_v99.js` (~3500 lineas,
   toda la logica de UI).
2. **Refactor de modularizacion** (primer pedido explicito: "refactorizar como
   lo haria un senior, y despues ir poco a poco cumpliendo los HU"): se separo
   el backend en un router de Express por dominio (`backend/src/routes/*.routes.js`)
   y el frontend en modulos por dominio (`frontend/public/js/modules/*.js`),
   siguiendo un patron ya existente parcialmente (`programa.js` registrando
   metodos en `window.IntegrApexModules.<nombre>`, mezclados en el objeto `app`
   via `Object.assign` al final de `app_v99.js`). Se verifico en navegador real
   con Playwright que nada se rompio.
3. **Correccion de bugs reales encontrados durante la verificacion**: sesion no
   persistente, un bug de `selectContract` preexistente, rutas de sidebar rotas
   hacia el modulo de Estimaciones, falta de `authorizeRoles` en dos endpoints
   de HU-20, secuenciacion incorrecta en HU-15 (residencia podia resolver sin
   que supervision hubiera turnado), boton "Cambiar de rol" renombrado a
   "Cerrar sesion" (era confuso, no correspondia a ningun criterio del Excel).
4. **Auditoria completa contra el Excel**: se leyeron los 24 HU criterio por
   criterio y se genero `MATRIZ_CUMPLIMIENTO_HU.md`, marcando cada uno como
   Cumple / Cumple con matices / Parcial, con el detalle exacto de que faltaba.
5. **Plan de cierre en 5 bloques** (seccion "Plan De Cierre" dentro de la
   matriz), ordenado por dependencias reales de datos, no por el orden del
   Excel:
   - **Bloque 1**: HU-16 (export real de observaciones), HU-14 (filtros AND en
     historial de estimaciones), HU-11 (filtro por periodo en minutas/visitas +
     referencia opcional en nota de bitacora).
   - **Bloque 2**: helper compartido de plazos legales (`plazosLegales.js`),
     HU-13 (semaforo 15 dias + notificacion real al enviar), HU-20 (semaforo 20
     dias + presupuesto real por contrato + validacion de fianza de
     cumplimiento), HU-15 parte A (semaforo visible).
   - **Bloque 3**: HU-18 Portafolio Ejecutivo (semaforo de 3 factores reales,
     pantalla dedicada, doble clic para detalle consolidado, agrupacion,
     comparativo contra mes anterior).
   - **Bloque 4**: HU-12 (fotos/soportes reales al integrar la estimacion +
     buscador real de notas de bitacora en vez de un ID manual) y HU-15 parte B
     (revision seccion por seccion con tipo/severidad/concepto por
     observacion).
   - **Bloque 5**: pulido fino de las 4 HU que habian quedado "Cumple con
     matices" (HU-02, HU-04, HU-07, HU-09). El hallazgo clave de este bloque:
     el backend ya insertaba notificaciones en la base de datos desde HU-13/
     HU-20/HU-07, pero **no existia ninguna pantalla ni endpoint para verlas** —
     eran invisibles para el usuario. Se construyo una campana de
     notificaciones real (topbar) antes de poder cerrar HU-02 y HU-07 con
     propiedad. Tambien se agrego el formato estructurado "Dice/Debe decir" de
     HU-09 y el enlace de descarga por fila del buscador de HU-04.

Cada bloque siguio el mismo patron disciplinado: implementar backend + frontend
reales (nunca mocks/stubs), levantar el servidor en el puerto 3099 (para no
chocar con una instancia de desarrollo en 3000), escribir un script de
Playwright en el scratchpad de la sesion y verificar en un Chromium real
(capturas de pantalla incluidas), re-correr **todas** las suites de regresion
de bloques anteriores, actualizar la matriz con el detalle concreto de lo
verificado, y hacer un commit de Git descriptivo. El usuario aprobaba cada
bloque con una respuesta corta ("Si, sigue", "Si, sigamos con esa") antes de
avanzar al siguiente.

## Estado actual (al cierre del Bloque 5)

**Las 24 Historias de Usuario del Excel estan en estado Cumple.** El detalle
verificable de cada una, criterio por criterio, esta en
`MATRIZ_CUMPLIMIENTO_HU.md` — leerlo antes de asumir que algo falta o esta
roto, es la fuente de verdad mas actualizada.

Dos decisiones de diseno quedan anotadas ahi por transparencia, sin bloquear
ningun criterio:
- HU-04: el expediente muestra sus 5 bloques repartidos en pestanas en vez de
  una sola vista continua (el buscador global si cruza los 5).
- HU-07 canal "correo": entrega a un buzon simulado dentro de la app
  (`correos_salientes`, expuesto via `GET /api/correos-salientes`) en vez de
  una bandeja SMTP real, porque no hay credenciales de correo provistas por el
  usuario.

## Mapa de arquitectura (estado final)

```
backend/
  server.js                        # composicion Express; arranca el scheduler de alertas al escuchar
  src/db/store.js                  # "base de datos" JSON plano (backend/data/db.json, gitignored)
  src/middleware/{auth,upload,errorHandler}.js
  src/utils/
    validators.js                  # parseJsonField, normalizeMoney, buildAmortizacionPlan, validatePrograma
    xlsxExport.js / pdfExport.js   # builders genericos reutilizados por HU-10/16/19
    plazosLegales.js               # semaforo verde/ambar/rojo (HU-13/15/18/20)
    reportData.js                  # los 7 reportes de HU-19 (JSON + export comparten definicion)
    avanceConceptos.js             # avance real por concepto (HU-06/HU-07)
    notificar.js                   # entrega notificacion: canal sistema -> bandeja, canal correo -> buzon simulado
  src/jobs/
    alertasScheduler.js            # checkFianzasVigencia (HU-02) + checkAlertasConcepto (HU-07); arranca en server.js
  src/routes/*.routes.js           # un router por dominio, agregados en routes/index.js
    (auth, contratos, fianzas, convenios, bitacora, minutasVisitas, trabajosPeriodo,
     estimaciones, tableros, reportes, pagos, alertas, notificaciones)
frontend/public/
  app_v99.js                       # nucleo: estado, api(), router SPA, sidebar, shell de contrato, modal/toast
  js/modules/*.js                  # un modulo por dominio, registrado en window.IntegrApexModules.<nombre>
    (contratos, expediente, fianzas, convenios, documentos, bitacora, estimaciones,
     portafolio, programa, notificaciones)
```

Convenciones (ya documentadas en `README.md`, no las repito aqui): cada tab del
expediente se renderiza por delegacion (`renderActiveTabContent` -> `render<Tab>Tab`
del modulo correspondiente); todos los modulos frontend comparten el mismo
objeto `app` en tiempo de ejecucion via `Object.assign`, por lo que pueden
llamarse entre si sin imports.

## Como levantar y verificar el sistema

```powershell
npm install
npm start          # sirve en PORT (default 3000)
```

Cuentas de prueba en `Cuentas_Prueba_IntegrApex.md`, password general
`IntegrApex2026!`. Para una verificacion "limpia" desde cero, borrar
`backend/data/db.json` antes de arrancar (se regenera solo desde
`initialState` en `store.js`) y, si se van a probar bitacora/estimaciones,
aperturar y firmar la bitacora primero (`POST /contratos/:id/bitacora/aperturar`
+ 3 firmas via `POST /bitacora/:id/firmar`) — sin eso, casi todo lo demas
devuelve 400.

No hay una suite de tests automatizada commiteada al repositorio todavia. Todo
lo verificado en este proyecto se hizo con scripts de Playwright ad-hoc
guardados en el scratchpad de cada sesion (rutas temporales fuera del repo,
no persisten entre sesiones). Si se retoma el proyecto y se quiere volver a
verificar algo, hay que rehacer esos scripts — el patron que funciono bien:
Chromium headless, `page.on('pageerror', ...)` para capturar errores de
consola, `page.waitForEvent('download')` + verificar la firma de bytes
(`PK`/`0x504b` para xlsx, `%PDF-` para pdf) para probar que un archivo
exportado es real y no un mock.

## Que faltaria si se pide seguir

Con las 24 HU en Cumple, no hay nada pendiente por contrato con el usuario.
Si se pide continuar, las direcciones razonables (ninguna es un requisito del
Excel, son mejoras de "hardening" hacia produccion) son:

1. **Persistencia real**: `backend/data/db.json` es un archivo JSON plano leido/
   escrito sincronicamente en cada operacion — funciona para una demo pero no
   escala ni es seguro para concurrencia real. Migrar a una base de datos real
   (Postgres/SQLite) seria el cambio de mayor impacto si esto va a produccion.
2. **Seguridad de contrasenas**: hoy las contrasenas se guardan y comparan en
   **texto plano** (`store.js` `initialState.usuarios[].contrasena`,
   comparacion directa en `auth.routes.js` linea ~17: `user.contrasena !==
   password`, sin bcrypt ni hashing). Aceptable para un prototipo/demo con
   cuentas de prueba conocidas, pero es lo primero que hay que corregir antes
   de cualquier despliegue con datos o usuarios reales.
3. **Suite de tests commiteada**: llevar los patrones de Playwright ad-hoc a
   una carpeta `tests/` real dentro del repo con un `npm test`, en vez de
   scripts efimeros en el scratchpad de cada sesion.
4. **Correo real para HU-07**: si se quiere que el canal "correo" entregue de
   verdad, integrar un proveedor SMTP (requiere credenciales que el usuario
   tendria que proporcionar explicitamente).
5. **CI/CD y despliegue**: no hay pipeline ni configuracion de despliegue; el
   repositorio es local (`git init` hecho en esta sesion), sin remoto
   configurado todavia.
6. **`README.md`**: su seccion de estructura de carpetas quedo desactualizada
   varias veces durante los bloques 3-5 (portafolio.js, notificaciones.js,
   reportes.routes.js, jobs/, utils nuevos). Vale la pena revisarla antes de
   presentar el repo a alguien mas.

## Reglas de trabajo que el usuario espera (si se retoma)

- Todo cambio real en backend + frontend, nunca stubs ni datos falsos.
- Verificacion en navegador real (Playwright), no solo revisar que el codigo
  "se ve bien".
- Re-correr toda la regresion anterior antes de dar un bloque por cerrado.
- Actualizar `MATRIZ_CUMPLIMIENTO_HU.md` con el detalle concreto de lo
  verificado (no solo marcar "hecho").
- Commit de Git descriptivo por bloque.
- Preguntar/confirmar con el usuario antes de pasar al siguiente bloque de
  trabajo — el usuario dirige el ritmo, una respuesta corta ("Si, sigue") es
  su forma habitual de aprobar y continuar.
- Modularidad tipo "senior" en todo momento: nunca volver a amontonar codigo
  de dominios distintos en un archivo compartido.
