# V1.15.1 · Migración de Documentos Clave a Neon

## Alcance

Se agrega un catálogo persistente `key_documents` con `document_code TEXT`, nombre, fila y lote de origen, y una auditoría `key_document_migration_events`. **No se reemplazan** las tablas de `document_incidents`, `document_reviews`, ni sus historiales.

La lectura desde Neon es **opcional y explícita**. Resumen táctico, Integraciones por vía y Flujo de actividades continúan leyendo Google Sheets. La V1.15.0.1 permanece como versión de retorno de código.

## Antes de comenzar

- Trabaja primero con `DATABASE_URL` de una rama **Development** de Neon, vinculada a Vercel Development. Realiza copia de seguridad antes de aplicar SQL.
- Requiere la V1.15.0 funcionando y `sincronizacion-v1_15_0.sql` ejecutado.
- Ejecuta **solo el nuevo archivo** `documentos-clave-v1_15_1.sql` en el SQL Editor de esa rama. Es aditivo y reejecutable.
- Conserva `.env.local` y `.vercel/`; no los subas a Git.

## Procedimiento

1. En la raíz del proyecto: `npm install`, `npm test`, `npm run build`, `npx vercel dev`.
2. Inicia sesión con Google y carga/actualiza `CatalogoDocumentos` desde Drive privado.
3. Abre **Sincronización de datos → Documentos Clave**. Presiona **Validar** y **Guardar copia en Neon**.
4. Pulsa **Cotejar catálogo**. Verifica total, altas, bajas, cambios de nombre y posibles códigos con incidencias o revisiones que no aparecen en el catálogo. No se permite publicar con estos últimos.
5. Pulsa **Publicar en Neon**. El proyecto volverá a descargar Google Sheets y comprobará que el contenido coincida exactamente con el lote guardado. Se pedirá confirmación. Si cambió, guarda primero una copia nueva y repite el cotejo.
6. En la pestaña **Documentos Clave**, selecciona **Neon** para consultar el catálogo publicado. Examina un documento con incidencias anteriores y verifica que las conserve. También puedes seleccionar **Google Sheets** sin alterar datos.
7. Para regresar a la fuente anterior: **Sincronización de datos → Restaurar Google Sheets**. Esto cambia el control de fuente en Neon; no elimina los registros publicados ni las incidencias.

## Consultas SQL de comprobación

```sql
SELECT active_source, neon_read_enabled, published_batch_id
FROM migration_source_controls WHERE module_key='documentos_clave';

SELECT document_code, document_name, source_row, is_active
FROM key_documents ORDER BY source_row LIMIT 50;

SELECT event_type, actor_email, document_count, created_at
FROM key_document_migration_events ORDER BY created_at DESC LIMIT 10;
```

La primera consulta informará `google_sheets / false` antes de publicar y `neon / true` al publicar. Si regresas a Google, las filas seguirán disponibles para auditoría.

## Limitaciones y seguridad

- Un error en el origen, o un código que ya ha perdido ceros finales en Excel, no puede corregirse mediante una comparación automática. Para `4.1` y `4.10`, almacena y comprueba valores textuales en Google Sheets.
- La aplicación mantiene Google como fuente de lectura predeterminada de la sesión incluso si existe una copia aprobada en Neon, para no alterar la experiencia actual sin acción explícita.
- El historial de incidencias/revisiones **no se copia ni sustituye**; permanece en sus tablas originales. Los códigos tienen que coincidir.
- La UI requiere acceso de Google autorizado y permisos de `DOCUMENT_EDITOR_EMAILS`. No publica contraseñas ni cadenas de conexión en el navegador.
- El cotejo y las pruebas automatizadas NO prueban la escritura real contra el Neon privado; debes validar el flujo en Development antes de producción.


## V1.15.1.1 · Corrección de longitud de bitácoras y controles de sincronización

- **Seguimiento!G (Estado situacional)** admite hasta **120.000 caracteres** por celda; no se trunca el texto, se preservan saltos de línea y se mantiene intacta la copia inmutable.
- **Seguimiento!M (Consideraciones)** admite hasta **60.000 caracteres**. Los campos breves tienen un límite de **12.000** y las demás columnas un límite seguro adaptado a su uso. Los otros módulos admiten hasta **24.000 caracteres** por celda, y el catálogo mantiene controles especiales para código y nombre.
- Se revisó el libro táctico actual: G8=4.589, G9=4.353, G17=3.994, G18=3.210 y G19=2.637 caracteres. Estas cinco celdas superaban el máximo antiguo de 1.800. Ninguna otra columna de Seguimiento superaba 1.800.
- El límite de carga total por importación se aumenta a **3,2 MB** (validación cliente/servidor), bajo el umbral de Vercel para solicitudes de funciones. Si el archivo supera el máximo, se informa de forma explícita y NO se recorta la información.
- **Comparar** y **Guardar copia en Neon** se habilitan cuando su hoja de origen está cargada, sin depender de una consulta previa de estado. **Historial** abre la consulta a Neon aunque no exista un estado precargado. Si fallan autorización/SQL/conexión, se muestra el error dentro de su módulo.
- Una importación guardada exitosamente **no se declara fallida** si únicamente falla la recarga posterior de indicadores.
- Se añade a Validar un diagnóstico del máximo de caracteres de G y M y del tamaño real de la copia.
- **No hay cambios de esquema SQL, credenciales, tablas o fuentes operativas.** Mantener los scripts de migración V1.15.0 y V1.15.1 ya aplicados en Neon Development. Google Sheets sigue siendo la fuente de lectura de los módulos no migrados.
