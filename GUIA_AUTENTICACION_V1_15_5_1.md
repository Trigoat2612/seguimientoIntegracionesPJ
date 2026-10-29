# V1.15.5.1 · Autenticación separada de Google Drive

## Objetivo

Consultar **Neon PostgreSQL** sin solicitar permisos de Google Drive. Mantener las APIs de Neon **protegidas**, separar los permisos de lectura y edición y reservar el acceso a archivos privados de Google Drive para la pantalla **Sincronización de datos**.

## Flujo de acceso

1. Abrir la página: se muestra **Resumen táctico**, la pestaña inicial.
2. Usar **Iniciar sesión · Neon** si es necesario. Google se usa **solo para verificar identidad**, con los permisos `openid email`. No se pide `drive.readonly`.
3. Con identidad autorizada, la aplicación consulta las cuatro API de Neon en paralelo: Resumen táctico, Integraciones por vía, Flujo de actividades y Documentos Clave.
4. Un **lector** puede consultar catálogos, detalles, bitácora y exportar a PPT. No puede abrir Sincronización de datos ni modificar la bitácora.
5. Un **editor** puede hacer lo anterior y actualizar la bitácora, la revisión documental y las publicaciones mediante la pestaña Sincronización de datos.
6. Solo cuando se utiliza **Google Drive privado** dentro de Sincronización se solicita, mediante **una segunda autorización independiente**, el permiso `https://www.googleapis.com/auth/drive.readonly`. El token de Drive nunca se envía a las API de Neon.

## Configuración del servidor

Conservar las variables existentes:

- `DATABASE_URL`: conexión privada del servidor a Neon.
- `GOOGLE_OAUTH_CLIENT_ID`: cliente OAuth de la aplicación para verificar la identidad del usuario.
- `DOCUMENT_EDITOR_EMAILS`: correos autorizados a **leer y editar** / sincronizar.

Variable nueva **opcional**:

- `DASHBOARD_VIEWER_EMAILS`: lista separada por comas de correos adicionales autorizados **solo a leer**. Si se omite, solo los correos de `DOCUMENT_EDITOR_EMAILS` pueden ingresar, tal como antes.

No se necesita un nuevo Client ID, ni secreto de Google, ni migración SQL. Configurar `DASHBOARD_VIEWER_EMAILS` solamente si se quiere otorgar acceso de consulta a otras cuentas. No publicar `DATABASE_URL` ni tokens de acceso en el frontend.

## Seguridad

- Las API validan el token de identidad, la audiencia (Client ID), el correo verificado y la pertenencia a una lista autorizada.
- Las consultas de registros publicadas admiten lectores. Las vistas de administración (`status`, `preview`), importaciones, publicaciones y reversión continúan **reservadas a editores**, con validación del lado del servidor.
- La API de bitácora permite leer a usuarios autorizados, pero escribir exclusivamente a editores. Un lector visualiza revisiones e incidencias sin controles de modificación.
- No existe un endpoint público de lectura de Neon sin sesión.
- La autorización de Drive sigue requiriendo permisos de archivo para el usuario; no es necesaria al cargar los cuatro módulos operativos.

## Instalación y comprobación

```powershell
npm install
npm test
npm run build
npx vercel dev
```

1. Abrir `http://localhost:3000` y entrar con cuenta editora. La lectura desde Neon debe funcionar sin pedir el permiso de Drive.
2. Revisar en las solicitudes del navegador que `/api/sesion`, `/api/resumen-tactico?action=records`, `/api/integraciones-via?action=records`, `/api/flujo-actividades?action=records` y `/api/documentos-clave?action=catalog` devuelvan respuesta con la sesión autorizada.
3. Verificar las exportaciones PPT con los datos publicados en Neon.
4. Abrir Documentos Clave y comprobar que se conserven incidencia, comentario, revisión e historial.
5. Abrir Sincronización de datos e importar una fuente privada desde Drive. **Solo entonces** debe aparecer la autorización de Drive.
6. Si se configura `DASHBOARD_VIEWER_EMAILS`, probar con un lector y verificar que consulta las vistas pero que publicar o guardar cambios devuelve **HTTP 403**.
7. Verificar acceso sin token (**HTTP 401**), correo no autorizado (**HTTP 403**) y token de cliente ajeno (**HTTP 403**).

**Advertencia:** una sesión de identidad sigue siendo necesaria para proteger la información del proyecto. Esta actualización elimina el **permiso de Drive para leer Neon**, no la autenticación del usuario.

## Reversión

Si aparece una incidencia, restaurar el ZIP de la V1.15.5. No hace falta revertir tablas ni datos: esta versión no aplica migraciones SQL.
