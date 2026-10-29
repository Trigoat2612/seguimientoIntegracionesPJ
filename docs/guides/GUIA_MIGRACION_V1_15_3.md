# Guía de migración · V1.15.3 Integraciones por vía

## Alcance

La V1.15.3 migra **Integraciones por vía** (`IntegracionesEtapa`) sin modificar Documentos Clave, Resumen táctico ni el Flujo de actividades. Mantiene el lector `parseVias` y su lógica de secciones, matrices o listas, el orden especial de Conflicto de autoridad, las asociaciones por etapa y los conteos de integraciones únicas para los filtros Todas, Crítica, Alta y No priorizadas.

Las asociaciones guardan nombre de vía, etapa, integración, fila y posición original. La clasificación se obtiene de la **versión publicada del Resumen táctico en Neon** y se guarda como instantánea de referencia junto al identificador de lote. Si se publica un seguimiento táctico más reciente, las vías deben cotejarse y publicarse otra vez antes de volver a consultarlas desde Neon. No se crean validaciones ni estados adicionales.

## Instalación y preparación

1. Conserva el respaldo del proyecto V1.15.2 y una copia de la base. No incluyas `.env.local` en el ZIP ni en Git.
2. Selecciona en Neon la misma rama/base que utiliza `DATABASE_URL` de Vercel Development. Es recomendable una rama Development separada de `production`.
3. Ejecuta **solo** `integraciones-via-v1_15_3.sql` en el SQL Editor de esa rama. Es aditivo y respeta las versiones SQL anteriores.
4. Actualiza el código fuente y ejecuta:

```powershell
npm install
npm test
npm run build
npx vercel dev
```

La carpeta `public` se genera con `npm run build` y no requiere creación manual.

## Cotejo y publicación

1. Comprueba que `Resumen táctico` se encuentre publicado en Neon y que las 35 integraciones de Seguimiento estén actualizadas.
2. Abre **Fuentes** y carga el documento táctico privado que contiene `IntegracionesEtapa` y `Seguimiento`. Si la hoja usa formato no estándar, entra en **Integraciones por vía → Examinar columnas**, aplica su correspondencia y comprueba las vías.
3. En **Sincronización de datos → Integraciones por vía** ejecuta **Validar → Comparar → Guardar copia en Neon**. Si ya hay una copia idéntica, se reutilizará.
4. Pulsa **Cotejar integraciones por vía**. La API reconstruye el modelo usando la copia exacta y los estados de `tactical_tracking`. La interfaz compara las asociaciones y los conteos con el modelo Google Sheets de la sesión.
5. Si no aparecen diferencias, pulsa **Publicar vías en Neon**. Se volverá a cargar el Excel privado; una alteración del contenido desde el último lote bloquea la publicación hasta guardar una copia nueva. La publicación es explícita y registra auditoría.
6. En la pestaña **Integraciones por vía**, alterna **Google Sheets** / **Neon**. Compara nombres, etapas, número de listas y pendientes y filtros `Todas`, `Crítica`, `Alta`, `No priorizadas`. Genera **PPT de una vía** y **PPT todas las vías** desde ambas fuentes usando los mismos filtros.
7. Si aparece una diferencia funcional, vuelve a **Sincronización de datos → Integraciones por vía → Restaurar Google Sheets**. Se conservan todas las importaciones, relaciones y eventos en Neon.

## Consulta SQL de verificación, solo lectura

```sql
SELECT module_key,active_source,neon_read_enabled,published_batch_id
FROM migration_source_controls ORDER BY module_key;

SELECT count(*) AS asociaciones,
       count(DISTINCT route_name) AS vias,
       count(DISTINCT (route_name,stage_name)) AS pares_via_etapa,
       count(*) FILTER (WHERE is_ready) AS asociaciones_listas,
       count(*) FILTER (WHERE NOT is_ready) AS asociaciones_pendientes,
       count(*) FILTER (WHERE NOT is_matched) AS sin_correspondencia
FROM route_integration_links WHERE is_active=TRUE;

SELECT count(*) AS enlaces_sin_lote
FROM route_integration_links r
LEFT JOIN migration_batches b ON b.id=r.source_batch_id
WHERE r.is_active AND (b.id IS NULL OR b.module_key<>'integraciones_via');

SELECT e.event_type,e.batch_id,e.tactical_batch_id,e.association_count,e.created_at
FROM route_migration_events e ORDER BY e.id DESC LIMIT 10;
```

Los totales de vías y asociaciones **no están predeterminados**: dependen de la hoja real y de la configuración de mapeo aplicada. El lote preliminar original puede no estar creado todavía, y se debe importar antes del cotejo.

## Limitaciones y criterios de cierre

- No se ha ejecutado esta migración SQL contra `production` en la entrega del ZIP. La base de datos se mantiene sin cambios hasta que el usuario aplique la migración en su ambiente.
- Las pruebas automáticas verifican modelos, categorías, relaciones, orden de etapas y build; la prueba de conexión, publicación SQL y PowerPoint desde la interfaz se realizará en el ambiente real.
- Los estados mostrados son una instantánea asociada a `tactical_batch_id`. Si la versión publicada de Seguimiento cambia, la lectura desde Neon de vías se bloquea hasta recotejarla. Evita mostrar información obsoleta como vigente.
- **Cierre funcional V1.15.3:** igualdad de asociaciones, vías, etapas, totales únicos, filtros de severidad, diapositivas PPT y regresión sin alteraciones en los demás módulos.
