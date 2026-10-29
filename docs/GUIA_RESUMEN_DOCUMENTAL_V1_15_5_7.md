# V1.15.5.7 · Resumen documental en el tablero

## Acceso
- Opción **Resumen documental** del menú principal, junto a **Documentos Clave**.
- En **Documentos Clave**, botón **Resumen documental**.
- Los usuarios con permisos de lectura del sitio pueden ver el resumen sin iniciar sesión con Google, igual que las fichas del catálogo.

## Indicadores
Se calculan con los documentos **activos y publicados** en `key_documents` y el historial de `document_tracking_entries` de Neon.

- **Documentos registrados:** cantidad de entradas activas del catálogo (no cantidad de filas de la bitácora).
- **Con seguimiento:** documentos que tienen al menos una anotación publicada.
- **Atención prioritaria:** documentos cuyo último estado registrado es `Pendiente` u `Observado` (este último es histórico y no se puede asignar a nuevas entradas).
- **Validados:** documentos con último estado `Validado`. Este estado no implica necesariamente cierre técnico completo.
- **Sin seguimiento:** documentos del catálogo sin anotaciones publicadas.
- **Anotaciones:** suma de registros de seguimiento de los códigos del catálogo.

Un documento se cuenta una sola vez en el cuadro de estados. La última anotación se determina por el orden de registro (`created_at`) y, dentro de importaciones del mismo instante, por su fila en la fuente (`source_row`). No se usa la fecha de actividad para resolver el orden, porque la fuente permite fechas no informadas.

La alerta «Revisar pendientes del cierre» es un **indicador de revisión**, basado en términos como *pendiente*, *falta*, *actualizar* o *subsanar* en el último seguimiento. No modifica el estado ni sustituye la validación de GSJ/GTI.

## Funcionalidad
- Clic en KPIs o en el gráfico de estados para filtrar.
- Búsqueda por código, documento, actividad, comentarios y responsable.
- Filtro por equipo validador.
- «Ver ficha» abre el documento en **Documentos Clave**, con todo su historial.
- «Actualizar indicadores» consulta de nuevo Neon.
- Tras registrar o publicar un seguimiento desde el tablero, el resumen se invalida y se vuelve a consultar al entrar.

## Arquitectura y despliegue
- Nueva lectura GET en `/api/seguimiento-documental?action=dashboard`; no requiere credenciales de editor, según la política de lectura previa.
- Solo se devuelven entradas de códigos presentes en el catálogo activo. No se requiere migración adicional ni modificación de Excel.
- Si el catálogo original permanece en Google Sheets, la pantalla utiliza ese catálogo visible y las anotaciones publicadas en Neon.
- **Advertencia de seguridad:** el endpoint es de lectura pública a nivel de API. Restringir el acceso al despliegue cuando las anotaciones contengan información privada.

Para instalar, conservar las variables de entorno y ejecutar `npm test`, `npm run build`, `npx vercel dev` o el despliegue en Vercel. Las pruebas automatizadas no sustituyen la prueba con la base Neon de producción.
