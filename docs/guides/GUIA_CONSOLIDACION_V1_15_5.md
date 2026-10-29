# V1.15.5 · Guía de uso y comprobación

## Qué cambia

- Resumen táctico se abre primero y consume Neon; también Integraciones por vía, Flujo de actividades y Documentos Clave.
- Los cinco módulos no migrados se encuentran en **En desarrollo**; permanecen accesibles, pero no forman parte de la lectura consolidada.
- Solo **Sincronización de datos** carga archivos de Excel/Drive, compara las versiones y publica actualizaciones.
- Documentos Clave mantiene sus operaciones de incidencias, comentarios, versión y revisión ya existentes en Neon.

## Requisitos

1. Las cuatro publicaciones deben permanecer activas (`active_source='neon'`) y no presentar dependencias desactualizadas.
2. En Vercel Development deben existir `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID` y `DOCUMENT_EDITOR_EMAILS`.
3. La URL local/de despliegue debe estar permitida en el cliente Google OAuth.
4. No se necesita un nuevo SQL.

## Procedimiento

1. Sustituir el proyecto y conservar `.env.local` y `.vercel/`.
2. Ejecutar `npm install`, `npm test`, `npm run build`, `npx vercel dev`.
3. Abrir la URL. Debe aparecer **Resumen táctico**, no Resumen ejecutivo.
4. Autorizar el acceso de Google si el navegador no concede un token silenciosamente. La API valida el acceso; la página no descarga Google Sheets para mostrar las cuatro vistas.
5. Comprobar que las cuatro pestañas presentan sus datos publicados y que el cambio de pestaña no provoca lecturas de Drive.
6. Para importar nuevas filas, abrir **Sincronización de datos → Cargar fuente para sincronización** y seguir validación, comparación, guardar copia, cotejar y publicar.
7. Comprobar PowerPoint con datos de Neon y operaciones de bitácora de Documentos Clave.

## Alcances de seguridad y recuperación

La aplicación mantiene la autorización Google OAuth para las API. La carga automática intenta obtenerla sin interacción, pero el navegador puede requerir autorización explícita. No se incluyen credenciales en el ZIP, no se crean endpoints públicos nuevos y no se altera el esquema de Neon. Las API de rollback existentes se conservan por compatibilidad, aunque se retiran sus botones del modo operativo; cualquier recuperación debe ser administrada de manera controlada.
