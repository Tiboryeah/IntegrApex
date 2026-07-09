# Manual de instalación y despliegue - IntegrApex

## 1. Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Git.
- Puerto disponible: `3000` para ejecución local.

## 2. Instalación local

Clonar el repositorio:

```powershell
git clone <URL_DEL_REPOSITORIO>
cd SIGECOP
```

Instalar dependencias:

```powershell
npm install
```

El `postinstall` instala automáticamente las dependencias del backend.

## 3. Ejecución local

```powershell
npm start
```

Abrir:

```text
http://localhost:3000
```

## 4. Persistencia local

La aplicación utiliza un archivo JSON local:

```text
backend/data/db.json
```

Si el archivo no existe, se crea automáticamente a partir de `backend/src/db/store.js`.

Para reiniciar datos de demostración:

1. Detener el servidor.
2. Eliminar `backend/data/db.json`.
3. Ejecutar `npm start`.

## 5. Archivos cargados

Los archivos subidos por usuarios se guardan en:

```text
backend/data/uploads/
```

La carpeta se conserva con `.gitkeep`, pero los archivos cargados en ejecución no se versionan.

## 6. Variables de entorno

La aplicación funciona sin variables obligatorias en modo local. Variables admitidas:

| Variable | Uso | Valor por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `JWT_SECRET` | Firma de sesiones JWT | Valor interno de desarrollo |

Para despliegues no locales se recomienda definir `JWT_SECRET`.

## 7. Pruebas

Ejecutar suite completa:

```powershell
npm test
```

Smoke de navegación por rol:

```powershell
npm run test:smoke
```

Resultado esperado:

```text
3/3 pruebas pasaron
```

## 8. Despliegue en servidor Node.js

Pasos generales:

1. Copiar el repositorio al servidor.
2. Ejecutar `npm install`.
3. Definir `PORT` y `JWT_SECRET` si aplica.
4. Ejecutar `npm start`.
5. Exponer el puerto mediante proxy reverso o plataforma de despliegue.

Ejemplo con variable de puerto:

```powershell
$env:PORT=3000
$env:JWT_SECRET="cambiar-este-valor"
npm start
```

## 9. Despliegue en Render u otra plataforma PaaS

Configuración recomendada:

- Runtime: Node.
- Build command: `npm install`.
- Start command: `npm start`.
- Environment:
  - `PORT`: administrado por la plataforma si aplica.
  - `JWT_SECRET`: valor privado.

Advertencia: la persistencia JSON local depende del sistema de archivos del proveedor. Para uso productivo se recomienda migrar a una base de datos administrada.

## 10. Respaldo y recuperación

Para respaldar datos:

```powershell
Copy-Item backend/data/db.json backups/db-$(Get-Date -Format yyyyMMdd-HHmmss).json
```

Para restaurar:

1. Detener el servidor.
2. Reemplazar `backend/data/db.json` por el respaldo.
3. Iniciar nuevamente.

## 11. Checklist de entrega

- `npm install` ejecuta sin errores.
- `npm test` pasa completo.
- `backend/data/db.json` no está versionado.
- `backend/data/uploads/` no contiene archivos de usuario versionados.
- `JWT_SECRET` está definido en entornos no locales.
- Cuentas de demostración documentadas.
