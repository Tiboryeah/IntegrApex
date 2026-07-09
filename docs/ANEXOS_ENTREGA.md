# Anexos de entrega - IntegrApex

## Anexo A. Documentos incluidos

- `README.md`: guía principal del proyecto.
- `docs/MANUAL_USUARIO.md`: operación funcional por rol.
- `docs/MANUAL_INSTALACION_DESPLIEGUE.md`: instalación, despliegue y operación técnica.
- `docs/ARQUITECTURA_TECNICA.md`: estructura técnica y responsabilidades por módulo.
- `MATRIZ_CUMPLIMIENTO_HU.md`: trazabilidad contra historias de usuario.
- `Cuentas_Prueba_IntegrApex.md`: cuentas de demostración.

## Anexo B. Comandos principales

```powershell
npm install
npm start
npm test
```

## Anexo C. URL local

```text
http://localhost:3000
```

## Anexo D. Criterio de aceptación técnico

La entrega se considera lista cuando:

1. La aplicación inicia sin errores.
2. Las cuentas de demostración permiten ingresar.
3. `npm test` termina con `3/3 pruebas pasaron`.
4. No se versionan archivos de runtime (`backend/data/db.json`, uploads de usuario, logs).
5. La documentación de usuario e instalación está disponible en `docs/`.

## Anexo E. Recomendaciones para producción

- Migrar persistencia JSON a PostgreSQL.
- Cifrar contraseñas.
- Definir `JWT_SECRET` fuera del código fuente.
- Configurar HTTPS.
- Implementar respaldos automáticos.
- Separar entornos de desarrollo, prueba y producción.
