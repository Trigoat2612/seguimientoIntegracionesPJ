# V1.15.5.2 · Consulta directa y presentación simplificada

## Objetivo

Las vistas de **Resumen táctico**, **Integraciones por vía**, **Flujo de actividades** y **Documentos Clave** se consultan directamente al abrir la aplicación. La carga **no invoca Google OAuth** ni Drive y no necesita un token de identidad del visitante.

Las vistas operativas solo muestran **Datos publicados** y **Recargar vista**. Se retiraron mensajes sobre Neon, columnas, hojas, lotes y origen de datos, así como el panel completo «Fuente del Flujo de actividades».

## Protección de cambios

- Consulta GET pública: `/api/resumen-tactico?action=records`, `/api/integraciones-via?action=records`, `/api/flujo-actividades?action=records`, `/api/documentos-clave?action=catalog`, `/api/incidencias?documento=...`.
- **Operaciones protegidas:** crear, comentar, actualizar y revisar incidencias y documentos; importar, comparar, publicar y revertir lotes en **Sincronización de datos**. Continúan requiriendo cuenta editora autorizada con `DOCUMENT_EDITOR_EMAILS`.
- `GET` de estado administrativo y cotejos (`status`, `preview`) en las API de migración continúa reservado al editor. El origen privado de Drive requiere su permiso OAuth específico únicamente al sincronizar.
- El token de Drive nunca se envía a la API de Neon. `DATABASE_URL` sigue siendo un secreto exclusivo del servidor, nunca del navegador.

## Seguridad importante

**Este cambio hace públicos los datos que devuelven las API GET cuando el despliegue es accesible en Internet**, incluidas las incidencias, comentarios, historiales y datos de auditoría expuestos en la ficha documental. La protección de escritura **no equivale** a una protección de lectura. No debe publicarse así información reservada del proyecto sin una protección de acceso al despliegue (por ejemplo, red privada, proxy de acceso corporativo o controles de acceso en Vercel). Si se opta por un acceso público real, revisar y aprobar previamente el contenido publicado.

## Instalación

1. Actualizar el proyecto con el ZIP completo. Conservar `.env.local` y `.vercel/` del equipo.
2. Ejecutar `npm install`, `npm test`, `npm run build` y `npx vercel dev`.
3. No ejecutar migraciones SQL. No se cambian los registros existentes en Neon.
4. Abrir Resumen táctico en una ventana sin sesión Google: deben cargarse los datos publicados.
5. Abrir Vías, Flujo y Documentos Clave: no debe aparecer autorización. En Flujo no debe existir el panel «Fuente del Flujo de actividades».
6. Abrir una ficha documental y consultar historial. Pulsar **Iniciar sesión para editar**: solicita cuenta autorizada y habilita la edición.
7. Entrar en **Sincronización de datos**, pulsar **Iniciar sesión para sincronizar**, autorizar cuenta editora y ejecutar únicamente las pruebas que correspondan. El consentimiento Drive se pide al importar archivos privados.
8. Comprobar que la exportación PowerPoint y los filtros de Resumen táctico / Vías no hayan cambiado.

## Nota de alcance

La comparación de datos importados frente a las publicaciones se mantiene en el módulo de **Sincronización de datos**. Ya no bloquea la lectura de datos publicados cuando existe una copia del Excel distinta o más reciente. Las publicaciones siguen verificando sus lotes y relaciones.

No se ha modificado la base de producción desde este trabajo ni se han ejecutado pruebas visuales en el despliegue del usuario; se requiere validación funcional allí.
