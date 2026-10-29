**V1.15.5.2 · Consulta directa:** los cuatro módulos permiten lectura sin Google OAuth; autenticación solo para edición documental y sincronización/publicación. Se retira la exposición de origen de datos en las vistas. La lectura queda accesible a quien pueda abrir el despliegue, por lo que debe configurarse control de acceso al sitio si los datos son reservados. Ver `GUIA_LECTURA_DIRECTA_V1_15_5_2.md`.

**V1.15.5.1 · Corrección de acceso:** consulta Neon protegida con token de identidad sin permisos de Drive; edición/publicación solo editores; Drive autorizado aparte para sincronización. Referencia `GUIA_AUTENTICACION_V1_15_5_1.md`. No requiere SQL ni actualización de datos.

# Línea base de desarrollo · Migración gradual a Neon

**Aprobación funcional:** 23 de octubre de 2026  
**Proyecto:** Seguimiento de integraciones EJE No Penal  
**Base funcional a preservar:** V1.14.4 (bitácora e incidencias de Documentos Clave, tabs previas y PowerPoint).  
**Principio actualizado en V1.15.5:** Neon es la fuente de lectura operativa de los cuatro módulos migrados. Google Sheets/Excel se conserva exclusivamente como origen para importaciones controladas desde Sincronización de datos.

| Versión | Alcance comprometido | Regla de liberación |
|---|---|---|
| **V1.15.0** | Infraestructura de sincronización, tablas de importación y auditoría, API, validación y controles de fuente | Solo copias preliminares; **sin cambiar lecturas** |
| **V1.15.1** | Migración de **Documentos Clave**, preservando bitácora y estados/versiones documentales | Aprobación del cotejo de códigos y de las relaciones existentes |
| **V1.15.2** | Migración de **Resumen táctico** (`Seguimiento`) | Igualdad de estados, criticidades, totales y alertas |
| **V1.15.3** | Migración de **Integraciones por vía** (`IntegracionesEtapa`) | Igualdad de asociaciones, conteos únicos, orden, filtros y PPT |
| **V1.15.4** | Migración de **Flujo de actividades** (`EtapaActividadIntegracion`) | Igualdad de pasos, actividades y relaciones; también actividades sin integración |
| **V1.15.5** | Lectura Neon por defecto, consolidación operativa, menú En desarrollo y sincronización única | Iniciar en Resumen táctico; cuatro API Neon; respaldo documental conservado; no consultar Drive desde pestañas operativas |

## Controles transversales

- Mantener la versión funcional anterior y los archivos fuente como alternativa de recuperación.
- Separar preparación/importación de activación de la nueva lectura.
- No sobrescribir datos preexistentes de `document_incidents`, `document_reviews` ni sus historiales.
- Identificadores documentales **textuales**, sin confundir `4.1` con `4.10`.
- Registrar por lote el módulo, la fuente, usuario, fecha y contenido íntegro de filas; importaciones idénticas no se repiten.
- Comparar datos antes de activar, corregir correspondencias explícitamente y registrar discrepancias.
- Establecer fuente activa para cada módulo únicamente después de aprobar sus verificaciones funcionales.
- Probar cambios en rama Development de Neon y en Vercel Development antes de llevarlos a Production.

## Delimitación de la V1.15.0

La API almacena **instantáneas de las hojas** y compara la última instantánea con la fuente cargada en el navegador. **No almacena todavía los modelos relacionales definitivos ni sustituye ninguna pestaña**. Los controles de la tabla `migration_source_controls` impiden activar Neon como fuente mediante la aplicación o actualizaciones ordinarias de esa tabla. La promoción por módulo se diseñará y probará a partir de V1.15.1.

## Progreso verificado
- **V1.15.0.1**: infraestructura y build para Vercel, versión confirmada funcional por el usuario.
- **V1.15.1**: 39 Documentos Clave activos y publicados en Neon, códigos y vínculos de bitácora comprobados en production (27/10/2026).
- **V1.15.2**: implementación de Resumen táctico validada por el usuario a nivel funcional y por consulta directa de integridad en Neon (28/10/2026).
- **V1.15.3**: implementación de Integraciones por vía con SQL aditivo y lectura reversible, usuario indicó continuar a la siguiente versión.
- **V1.15.4**: desarrollo del Flujo de actividades, SQL aditivo, publicación, lectura dual, controles de integridad y reversión; pendiente de ejecución real de SQL y validación funcional del usuario.

## Corrección técnica de V1.15.4

V1.15.4.1 corrige la acción de publicación del Flujo de actividades sin alterar el alcance ni la secuencia de V1.15.0 a V1.15.5.

## V1.15.5 · Consolidación operativa

- **Pantalla inicial:** Resumen táctico con carga de cuatro módulos publicados desde API de Neon cuando la sesión OAuth está autorizada.
- **Módulos principales:** Resumen táctico, Integraciones por vía, Flujo de actividades, Documentos Clave y Sincronización de datos.
- **En desarrollo:** Resumen ejecutivo, Sistemas, Integraciones, Endpoints y Datos técnicos, agrupados en submenú colapsado inicialmente.
- **Actualización de información importada:** exclusivamente desde Sincronización de datos. Las recargas de las otras vistas solo vuelven a consultar las publicaciones de Neon.
- **Documentos Clave:** conserva registro/seguimiento de incidencias, comentarios, versiones y estados de revisión en Neon, sin cambios de esquema.
- **Seguridad:** no se habilita acceso anónimo a los datos; OAuth sigue siendo necesario para las API. Si la autorización silenciosa no es posible, se presenta un botón de autorización.
- **Migraciones:** sin SQL nuevo; las tablas creadas hasta V1.15.4 se conservan. No se cambia la fuente de lectura a Google Sheets en los módulos operativos.
- **Pruebas:** ejecutar `npm test` y `npm run build`; después comprobar la autenticación, las cinco pestañas principales y la exportación PPT en el entorno Vercel del usuario.


V1.15.5.5: seguimiento documental desde bitacoraDocumentosClave (B:I), importación append-only, 5 estados y 5 equipos, se oculta módulo de incidencias sin borrar datos.

V1.15.5.6: corrección de instantáneas XLSX dispersas y de la validación de blancos en el servidor de sincronización. Sin cambios SQL.
