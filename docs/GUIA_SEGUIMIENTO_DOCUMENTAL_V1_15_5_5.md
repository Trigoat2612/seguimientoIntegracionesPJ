# V1.15.5.5 · Bitácora de seguimiento de Documentos Clave

## Alcance
La bitácora de incidencias deja de mostrarse en la interfaz (registro y cuatro indicadores), pero las tablas y el historial anteriores NO se eliminan. Se incorpora un seguimiento independiente y acumulativo `document_tracking_entries`, con columnas de negocio: código, fecha, estado, actividad, comentarios, responsable, equipo validador y etapa. Se mantiene el catálogo de 39 Documentos Clave y las demás pantallas.

## Fuente de sincronización
Añadir al libro privado de seguimiento la pestaña **`bitacoraDocumentosClave`** exactamente con este nombre. La estructura esperada es:

| Columna | Campo |
|---|---|
| A | Nro (referencial, no es clave) |
| B | Codigo de Documento (TEXTO, no número) |
| C | Fecha (Excel, dd/mm/aaaa o aaaa-mm-dd; puede estar vacía) |
| D | Estado |
| E | Actividad |
| F | Comentarios |
| G | Responsable |
| H | Equipo Validador (uno o varios, separados por coma) |
| I | Etapa |

No mezclar `4.10` y `4.1`. Antes de pegar códigos en Google Sheets, formatear B como **Texto sin formato**. Si Excel ya los almacenó numéricamente, solo es posible reconstruir los ceros finales cuando el formato los conserva.

Estados admitidos para nuevos registros: `Pendiente`, `Programado`, `En proceso de firma`, `Entregado`, `Validado`.
Equipos: `DP LABORAL`, `TRANSVERSALES`, `TODOS LOS DP`, `GTI`, `PEJENP`. Se permite asignar más de uno.

### Particularidades detectadas en la fuente adjunta
El libro original tiene **54 anotaciones para 33 códigos documentales**. Se confirmó que los 33 códigos existen en `key_documents` de Neon a la fecha de revisión. Hay **11 filas sin fecha**, preservadas sin inventar fechas; **1 fila «OBSERVADO»**, preservada como estado heredado **Observado (histórico)**, no seleccionable en el formulario; y **54 filas con Etapa vacía**, conservadas vacías. Los estados de origen se distribuyen en 7 Pendiente, 26 Programado, 11 Entregado, 9 Validado y 1 Observado histórico. Los campos vacíos siguen siendo opcionales, salvo código, estado y actividad para el registro manual.

## Instalación
1. Ejecutar `database/migrations/seguimiento-documental-v1_15_5_5.sql` en la **misma rama Neon** que `DATABASE_URL`. La migración es aditiva y no elimina ni modifica las tablas anteriores.
2. Actualizar el proyecto completo. Conservar `.env.local`, `.vercel/` y las variables del despliegue.
3. Ejecutar `npm install`, `npm test`, `npm run build`, `npx vercel dev`.
4. Añadir la hoja al libro que ya se carga en **Sincronización de datos**. Puede usarse `bitacoraDocumentosClave_preparada.xlsx` como fuente para copiar el contenido.
5. En **Sincronización de datos**, autorizar una cuenta editora y **Cargar fuente para sincronización**; importar el libro completo, no solamente una hoja suelta.
6. En **Bitácora de Documentos Clave**, ejecutar **Validar → Comparar → Guardar copia en Neon → Cotejar bitácora → Publicar bitácora**.
7. Comprobar el historial de los documentos, especialmente códigos `4.10` y `4.1`, las filas sin fecha y el estado histórico.

## Reglas de persistencia
- Se incorporan anotaciones como historial append-only. Se genera SHA-256 con los ocho campos normalizados y el índice de repetición de un evento idéntico; reimportar una hoja igual no duplica registros.
- Si una anotación cambia, aparece una nueva entrada; la anterior se conserva para trazabilidad. La fuente no elimina registros anteriores.
- Una publicación rechaza códigos ausentes del catálogo publicado y no ejecuta la importación hasta que se confirme.
- Los datos del seguimiento se consultan sin inicio de sesión, conforme a la política de lectura del tablero. Registrar una nueva anotación o publicar requiere cuenta editora Google, y cargar Drive requiere autorización separada.
- No se migran ni sobrescriben `document_reviews` ni tablas de incidencias existentes; el formulario antiguo de estado y versión no se utiliza en la interfaz nueva.

## Controles de cierre
Comprobar 54 anotaciones importadas inicialmente, 33 códigos relacionados y 0 errores de validación. Probar registro manual y que cinco estados y cinco equipos aparezcan en el formulario. Confirmar que **ningún contador ni formulario de incidencias** aparezca en Documentos Clave. Probar que una segunda publicación de la misma copia agregue 0 anotaciones y que las exportaciones PPT/otros módulos sigan funcionando.

## Advertencia
La actualización NO se ha ejecutado en Neon de producción desde esta entrega. El instalador contiene código y SQL; el Excel preparado se distribuye por separado y no se incluye dentro del ZIP del proyecto para evitar distribuir información privada en el repositorio.
