# Guía de instalación y validación · V1.15.2

## Alcance

Esta versión migra **únicamente Resumen táctico / Seguimiento** a Neon, conservando:

- Documentos Clave, sus 39 registros ya publicados, incidencias, revisiones y auditoría.
- Integraciones por vía y Flujo de actividades con sus lecturas desde el archivo Google Sheets existente.
- El modelo táctico anterior (`parseTactical`) y su generación de diapositiva PowerPoint, filtros y recuentos.
- Las filas originales 1–36 como **alcance funcional**. Otras filas del Excel permanecen íntegras en `migration_batch_rows` y **no** se publican en `tactical_tracking`.

Se mantienen: B = Integración, D = Estado, E = Dependencia, G = Estado situacional (bitácora histórica), H/I/J = fechas/textos, L = criticidad (Alta + relleno verde = Crítica), M = consideraciones. No se recortan saltos de línea ni textos históricos.

## Paso 1 · Copia de seguridad y SQL

1. Conserva un respaldo del proyecto V1.15.1.1 y utiliza una rama Neon Development para la primera prueba si cuentas con ella.
2. En el SQL Editor de Neon, selecciona **la misma rama y base de datos que utiliza `DATABASE_URL`** de Vercel Development. No compartas la cadena de conexión.
3. Ejecuta `resumen-tactico-v1_15_2.sql` **una sola vez**. Es aditivo e idempotente en sus elementos principales: crea `tactical_tracking`, `tactical_migration_events` y actualiza el control permitido de fuentes para Resumen táctico sin borrar filas previas.
4. La V1.15.1 debe estar aplicada previamente. No es necesario ejecutar de nuevo `documentos-clave-v1_15_1.sql` ni `sincronizacion-v1_15_0.sql`.

> La conexión Neon de este chat permitió validar el esquema y los registros existentes en `production`, pero **esta entrega de código no aplica el SQL ni publica registros automáticamente**.

## Paso 2 · Código y arranque local

Conserva `.env.local` y `.vercel/`, reemplaza los archivos fuente y ejecuta:

```powershell
npm install
npm test
npm run build
npx vercel dev
```

Abre `http://localhost:3000`. La carpeta `public/` se genera automáticamente y no debe crearse a mano.

## Paso 3 · Cotejo y publicación

1. Inicia sesión mediante la cuenta Google autorizada.
2. En **Fuentes**, actualiza el libro táctico privado que incluye la hoja `Seguimiento`.
3. En **Sincronización de datos → Resumen táctico**, pulsa **Consultar Neon** y comprueba el lote existente. En el proyecto se había detectado un lote preliminar de 1.000 filas, donde las filas 2–36 alojaban 35 integraciones, y 8 filas adicionales con nombres fuera de rango.
4. Si cambió la hoja, ejecuta **Validar → Comparar → Guardar copia en Neon**. El programa exige que la versión vigente coincida con la copia preliminar a publicar.
5. Pulsa **Cotejar Resumen táctico**. Compara datos y clasificación con el modelo de Google Sheets. Si hay diferencias, el botón de publicación permanecerá deshabilitado.
6. Pulsa **Publicar Resumen en Neon** y confirma. El backend valida de nuevo el checksum antes de publicar y registra evento/auditoría atómicamente.
7. Abre la pestaña **Resumen táctico** y alterna sus botones **Google Sheets** / **Neon**. Compara conteos, filtros, información desplegada, fechas e historial G, y genera el PowerPoint en ambos modos.
8. En cualquier momento, **Restaurar Google Sheets** cambia el control de lectura sin borrar lotes ni historiales en Neon.

La nueva fuente Neon se elige **por pestaña y en la sesión actual**; no se activa sola en la primera carga.

## Verificación SQL (solo lectura)

```sql
SELECT module_key,active_source,neon_read_enabled,published_batch_id
FROM migration_source_controls
ORDER BY module_key;

SELECT count(*) AS activos,
       count(*) FILTER(WHERE severity_green AND lower(criticality_raw)='alta') AS criticos,
       count(*) FILTER(WHERE NOT severity_green AND lower(criticality_raw)='alta') AS altos,
       max(length(situational_history)) AS longitud_maxima_G
FROM tactical_tracking WHERE is_active=TRUE;

SELECT source_row,integration_name,status_raw,status_group,
       criticality_raw,severity_green,length(situational_history) AS caracteres_G
FROM tactical_tracking WHERE is_active=TRUE ORDER BY source_row;

SELECT event_type,batch_id,integration_count,created_at
FROM tactical_migration_events ORDER BY id DESC LIMIT 10;
```

**Esperado tras publicar el lote vigente**: 35 registros, G de hasta 4.589 caracteres según la última copia auditada, `resumen_tactico` habilitado en Neon, `documentos_clave` sin cambios, `integraciones_via` y `flujo_actividades` aún en Google Sheets. Los conteos Crítica/Alta se deben contrastar con los resultados reales del lector Excel; no se presuponen ni se codifican fijos.

## Límites y precauciones

- La severidad Crítica sigue dependiendo del **relleno directo verde** de la celda L. Cuando el color proceda exclusivamente de formato condicional no exportado como relleno directo, el lector anterior y Neon tienen la misma limitación. No inventar una clasificación que el Excel no respalda.
- La copia de 1.000 filas conserva su auditoría. Solo se normalizan filas 1–36; las 8 filas adicionales con nombre deben revisarse antes de ampliar alcance en otra versión.
- Las tablas `document_incidents`, `document_reviews` y los eventos asociados no se modifican.
- Una prueba automatizada positiva no acredita una publicación real: ejecutar primero esta secuencia contra la rama configurada en Development.
