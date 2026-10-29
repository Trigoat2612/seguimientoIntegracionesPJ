# Arquitectura · Tablero de Integraciones PJ

## Capas

1. **Interfaz (`src/client/`)**: navegación, filtros, visualización, consulta de publicaciones y exportación de PPT. No contiene credenciales ni consulta PostgreSQL directamente.
2. **Modelos compartidos (`src/shared/`)**: interpretación de Seguimiento, IntegracionesEtapa, EtapaActividadIntegracion y CatalogoDocumentos, validación de filas, comparación de lotes y reglas documentales. No acceden al entorno de ejecución del servidor.
3. **Servidor (`api/`, `src/server/`)**: Vercel Functions que conectan con Neon, leen publicaciones y controlan edición, sincronización, auditoría y acceso a Drive. Los GET de datos publicados permanecen accesibles sin iniciar sesión, como se estableció en V1.15.5.2.
4. **Datos (`database/migrations/`)**: historial SQL. **No ejecutar de nuevo todas las migraciones en una base existente**, ni editar producción durante un ordenamiento de archivos.
5. **Build (`scripts/`)**: genera `public/` copiando solo el HTML de entrada, los activos permitidos y las dependencias ES del navegador. No incluye `api/`, `src/server/`, migraciones ni configuraciones privadas.

## Dependencias

```text
Browser /src/client/app.js
  ├── /src/client/core/            cálculo y formatos visuales
  ├── /src/client/ui/              interfaz documental y sincronización
  ├── /src/client/presentations/   PowerPoint
  └── /src/shared/                 modelos y contratos puros

GET /api/*  ── Neon (lectura publicada)
POST/PATCH /api/* ── identificar editor ── Neon (actualizaciones)
Sincronización de datos ── Google OAuth/Drive ── cotejo ── publicación Neon
```

## Reglas de mantenimiento

- Editar únicamente el código de `src/`, `api/`, `scripts/`, `tests/` y los SQL versionados, según corresponda.
- Mantener `api/` en la raíz para el descubrimiento automático de funciones de Vercel.
- Compartir validaciones en `src/shared/`; no duplicar reglas de negocio entre navegador y API.
- Incorporar un test para cualquier cambio de rutas, permisos, catálogo documental o exportación PPT.
- `src/client/app.js` conserva por ahora la coordinación de las pantallas. **Su división interna en controladores por vista queda como mejora posterior**, porque ese cambio exige una fase específica de pruebas del estado compartido; no se mezcla con este refactor estructural.
- Configuración sensible: mantener `.env.local` fuera del ZIP y repositorio. `config.js` solo puede contener identificadores públicos de OAuth y rutas de origen.

## Nota de seguridad

En V1.15.5.2 se habilitaron GET sin autenticación. En un despliegue expuesto, terceros podrían consultar información publicada, incluidas incidencias. Restringir el acceso al sitio mediante las funciones de protección del entorno cuando existan datos no públicos.
