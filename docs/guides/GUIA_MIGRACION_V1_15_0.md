# V1.15.0 · Despliegue seguro de la infraestructura de sincronización

## 1. Antes de actualizar

1. Conservar un respaldo del proyecto V1.14.4.
2. Verificar que la bitácora de incidencias funciona actualmente en Neon.
3. Trabajar primero sobre la rama Development de Neon, no sobre la rama production.
4. Mantener el archivo `.env.local` fuera del control de versiones.

## 2. Migración SQL (una única vez por rama)

En la consola **Neon → SQL Editor**, seleccionar la rama vinculada a `DATABASE_URL` y ejecutar **`sincronizacion-v1_15_0.sql`**.

El script usa `CREATE TABLE IF NOT EXISTS`, agrega únicamente cuatro tablas nuevas y **no altera las tablas actuales** de bitácora ni documentos.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE 'migration_%'
ORDER BY table_name;
```

Resultado esperado: `migration_audit_events`, `migration_batch_rows`, `migration_batches`, `migration_source_controls`.

```sql
SELECT module_key,sheet_name,active_source,neon_read_enabled
FROM migration_source_controls ORDER BY module_key;
```

Resultado esperado: cuatro módulos, todos con `active_source='google_sheets'` y `neon_read_enabled=false`.

## 3. Levantar el proyecto

Conservar las mismas variables privadas existentes: `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `DOCUMENT_EDITOR_EMAILS`. **No se añaden credenciales**. El servidor debe contar con ellas en Development, como la bitácora.

```powershell
npm install
npm test
npm run build
npx vercel dev
```

El `npm run build` de esta versión valida la sintaxis y los archivos de entrada estáticos y serverless, sin producir una carpeta `dist`: Vercel sigue utilizando la raíz como salida. Para una prueba completa de integración con Neon es necesario ejecutar `npx vercel dev` con credenciales válidas.

## 4. Uso de la nueva pestaña

1. Actualizar el libro táctico desde Google Drive privado o importar un Excel autorizado.
2. Actualizar **Documentos Clave** si la hoja `CatalogoDocumentos` está en un libro distinto.
3. Abrir **Sincronización de datos**.
4. Pulsar **Consultar Neon** para verificar credenciales/autorización y obtener el historial.
5. Por módulo, ejecutar **Validar** y corregir observaciones. 
6. Ejecutar **Comparar**: compara los datos actuales contra la última copia importada, sin escribir.
7. Ejecutar **Guardar copia en Neon**: crea un lote inmutable con sus filas, checksum, diferencias y auditoría.
8. Consultar **Historial** para ver los últimos 15 lotes por módulo.

La primera importación no tiene una copia anterior: el contador de filas nuevas representa la **línea base inicial**, no modificaciones frente a las tablas definitivas de Neon. No confundir esta operación con una validación final de las integraciones.

## 5. Seguridad y limitaciones

- API de importación `/api/sincronizacion` usa la misma verificación OAuth y la lista `DOCUMENT_EDITOR_EMAILS` que la bitácora.
- No se envía a Neon la cuenta OAuth ni los tokens de Google; solo contenido de la hoja explícitamente seleccionada y metadatos de auditoría.
- Actualización V1.15.1.1: 3.000 filas, 100 columnas, límites por tipo de columna (120.000 caracteres para Seguimiento!G, 60.000 para M) y hasta 3,2 MB por importación. Volúmenes mayores requerirán importación paginada sin perder historial.
- Los cambios entre copias se cuentan por **posición de fila**, no por identidad relacional. Una inserción intermedia puede registrar muchas filas como modificadas. En V1.15.1+ se incorporará cotejo por identificadores estables.
- Las hojas `Seguimiento` conservan su contenido original en la copia. El dashboard actual sigue evaluando solo las primeras 36 filas.
- Los códigos documentales ambiguos en Excel deben ser revisados; un cero ya perdido en el archivo no puede reconstruirse de forma segura.
- La importación no sustituye los archivos originales ni altera el estado de validación documental.

## 6. Recuperación

**Recuperación inmediata de la aplicación:** el tablero actual continúa leyendo Google Sheets/Excel. Si falla la nueva API, basta con no usar la pestaña de sincronización; las otras vistas y la bitácora se mantienen.

**Recuperación de código:** regresar al ZIP V1.14.4 y redeplegar, sin tocar las tablas de Neon.

**No borrar tablas de migración** durante el retorno de aplicación; los lotes son evidencia de auditoría. Antes de cualquier limpieza explícita, respaldar esos datos y verificar que no se estén utilizando.

## 7. Pendiente para completar validación en tu instalación

Verificar con credenciales privadas reales una importación de cada una de las cuatro hojas y repetir la misma importación para probar idempotencia. Después corroborar filas y auditoría desde SQL Editor:

```sql
SELECT module_key,source_label,row_count,imported_at,imported_by
FROM migration_batches ORDER BY imported_at DESC LIMIT 20;

SELECT module_key,event_type,actor_email,created_at
FROM migration_audit_events ORDER BY created_at DESC LIMIT 20;
```
