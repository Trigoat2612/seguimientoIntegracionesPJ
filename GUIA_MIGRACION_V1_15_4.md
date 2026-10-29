# Guía de migración V1.15.4 · Flujo de actividades

## Objetivo y alcance

Migrar la pestaña **Flujo de actividades** desde `EtapaActividadIntegracion` a Neon, conservando la interpretación anterior de las columnas **A: Vía, B: Paso, C: Etapa, D: Actividad y E: Integración opcional**. Se conserva el orden de vías, pasos y actividades, incluidas las actividades que no tienen ninguna integración. Una actividad sin integración no se cuenta como integración pendiente.

La criticidad, dependencia y el estado de cada integración se obtienen exclusivamente del **Resumen táctico publicado** en Neon. No se inventan validaciones y se conservan las integraciones sin correspondencia como pendientes sin conformidad. El módulo es independiente de `IntegracionesEtapa`: no requiere volver a publicar Integraciones por vía, pero requiere que la versión publicada de `Seguimiento` esté vigente.

## Instalación

1. Guarda la versión estable anterior, las variables `.env.local` y el vínculo `.vercel/`; **no subas secretos al repositorio ni al ZIP**.
2. Asegúrate de haber aplicado las migraciones V1.15.0, V1.15.1, V1.15.2 y V1.15.3 **en la misma base/branch** que utiliza `DATABASE_URL`. Utiliza preferentemente una rama Development antes de Production.
3. Ejecuta únicamente el SQL **`flujo-actividades-v1_15_4.sql`**. Es aditivo: crea `activity_flow_activities`, `activity_flow_links`, `activity_flow_published_metadata` y `activity_flow_migration_events`, y amplía el control de fuentes.
4. Instala y ejecuta el proyecto:

```powershell
npm install
npm test
npm run build
npx vercel dev
```

`public/` se genera en el build. No crees una carpeta vacía ni publiques `.env.local`.

## Cotejo y publicación controlada

1. Comprueba en **Resumen táctico** que Neon contiene el lote vigente y que las clasificaciones están aprobadas.
2. En **Fuentes**, autoriza Google y pulsa **Actualizar táctico** para leer el archivo privado que contiene `EtapaActividadIntegracion`.
3. En **Sincronización de datos → Flujo de actividades**, ejecuta **Validar**, **Comparar** y **Guardar copia en Neon**. Una copia idéntica puede reutilizarse.
4. Pulsa **Cotejar Flujo de actividades**. El backend reconstruye vías, pasos, actividades, integraciones y actividades sin integración utilizando la versión **publicada** de `Seguimiento` y el checksum de la copia. La interfaz verifica el resultado respecto a la interpretación Google Sheets.
5. Si el cotejo es conforme, pulsa **Publicar flujo en Neon**. Antes de publicar, la aplicación vuelve a descargar el Excel privado. Si cambió desde la última copia, bloquea la publicación.
6. En **Flujo de actividades**, alterna **Google Sheets** / **Neon** y comprueba vías, pasos, etiquetas de etapa, actividades sin integración, listas/pendientes y los filtros `Todas`, `Crítica`, `Alta`, `No priorizadas` y `Sin correspondencia`.
7. Si aparece alguna discrepancia, en **Sincronización de datos → Flujo de actividades** pulsa **Restaurar Google Sheets**. No se borran las copias ni el historial de Neon.

## SQL de auditoría después de publicar (solo lectura)

```sql
SELECT module_key, active_source, neon_read_enabled, published_batch_id
FROM migration_source_controls ORDER BY module_key;

SELECT COUNT(*) AS actividades,
 COUNT(*) FILTER (WHERE no_integration) AS actividades_sin_integracion,
 COUNT(DISTINCT route_name) AS vias,
 COUNT(DISTINCT (route_name,step_name)) AS pasos
FROM activity_flow_activities WHERE is_active;

SELECT COUNT(*) AS asociaciones,
 COUNT(*) FILTER (WHERE entry->>'matched'='false') AS sin_correspondencia
FROM activity_flow_links WHERE is_active;

SELECT COUNT(*) AS enlaces_sin_actividad_activa
FROM activity_flow_links l
LEFT JOIN activity_flow_activities a ON a.activity_key=l.activity_key AND a.is_active
WHERE l.is_active AND a.activity_key IS NULL;

SELECT e.event_type,e.batch_id,e.tactical_batch_id,e.activity_count,e.link_count,e.created_at
FROM activity_flow_migration_events e ORDER BY e.id DESC LIMIT 10;
```

**No se predeterminan cantidades de vías, pasos ni actividades**: las cifras deben salir de la hoja real. Las consultas no deben reportar enlaces huérfanos.

## Criterio de cierre de V1.15.4

- 100 % de coincidencia entre Google Sheets y Neon para vías, pasos, actividades, etapas y asociaciones.
- Los pasos preservan el orden original y las actividades sin integración se conservan y no suman a pendientes.
- Los filtros por severidad y `Sin correspondencia` producen conteos iguales para ambas fuentes.
- Las integraciones derivan sus estados de la publicación vigente de Resumen táctico; si este lote cambia se bloquea la lectura Neon hasta recotejar.
- Cambio de fuente y reversión funcionan sin afectar Documentos Clave, Resumen táctico ni Integraciones por vía.
- Consola/API sin errores durante las pruebas. Se mantiene la opción de recuperar Google Sheets.

## Limitaciones de esta entrega

El proyecto incluye el SQL, API, UI y pruebas automatizadas. **El SQL no se ejecutó automáticamente sobre Neon**, no se publicó un lote real y no se verificó visualmente la UI autenticada ni su tráfico API contra el servidor del usuario. Esas pruebas se completan con la instalación en el entorno Development, antes de declarar la versión validada.
