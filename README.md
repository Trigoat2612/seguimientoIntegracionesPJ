# Tablero de Integraciones PJ · V1.9.7 · Entidad desde la columna E en PowerPoint

## Propósito

Esta evolución incorpora **Resumen táctico**, inspirado en la lámina «Status Integraciones» de la presentación *STEJENP - Integraciones Especialidad Laboral*. No sustituye el Resumen ejecutivo ni altera el catálogo fijo de Laboral.

### Fuentes independientes

1. **Seguimiento técnico**: `SOFTPLAN - INTEGRACIONES PJ` en Google Drive privado (`1GWZBqm...`), configuración existente. Alimenta estados técnicos, sistemas, endpoints, observaciones GTI/SOFTPLAN y cálculos de desarrollo/validación.
2. **Seguimiento táctico**: hoja **`Seguimiento`** del libro privado (`1azR7BtPnoKM6H-2ADC5t9Pur04pFmD1y`). Se utiliza únicamente para la nueva pestaña. **No se mezclan automáticamente los estados tácticos con los estados técnicos**, porque sus metodologías son diferentes.
3. **Catálogo Laboral**: las 36 integraciones de `Lista_Integraciones.xlsx`, Sheet2, siguen fijas en `catalogo-fijo.js`.

Los archivos privados se leen desde el navegador del usuario autorizado y no se incorporan al repositorio ni se envían a un backend propio. El `client_id` público OAuth se reutiliza para ambas fuentes; no incluir un `client_secret`.

## Inicio rápido y sincronización

- Local: `python -m http.server 8080` y abrir `http://localhost:8080`.
- Vercel: desplegar los archivos estáticos como la V1.8.1. Comprobar que el dominio exacto de Vercel siga autorizado en Google Cloud.
- Iniciar sesión con la cuenta que **tenga acceso a ambos archivos** y esté autorizada en OAuth si el cliente se encuentra en modo de pruebas.
- Elegir **Fuentes → Autorizar y leer privado** para la carga técnica: al completarse, se intenta actualizar el táctico automáticamente utilizando el mismo token.
- También puede abrirse directamente **Resumen táctico → Actualizar resumen táctico**, incluso sin haber cargado la fuente técnica.
- El botón superior **Actualizar Google** vuelve a leer el archivo técnico y, a continuación, el táctico. El botón **Actualizar táctico** solo actualiza el segundo archivo.
- **Fuentes → Importar respaldo táctico .xlsx** permite probar sin Drive. No se almacena como catálogo fijo.
- Si no se actualiza el segundo documento por permisos, el primero continúa funcionando. La vista táctico muestra el error en su propio panel y conserva temporalmente los últimos datos de la sesión.

## Asignación de columnas: hoja Seguimiento

| Columna | Uso |
|---|---|
| B | Integración Laboral |
| D | Estado táctico: `Validado`, `Validada`, `Por validar`, `En Pruebas`, `En Desarrollo` |
| E | Área/entidad de dependencia |
| G | Estado situacional/hitos; se conserva texto completo y saltos de línea |
| H | Cierre desarrollo; fecha o texto libre |
| I | Cierre pruebas SOFTPLAN/GTI; fecha, rango o texto |
| J | Validación con GSJ; fecha o texto |
| L | Criticidad: **Alta** implica primer plano, cualquier otro valor o vacío implica no priorizada. Fondo verde directo = distintivo **Destacada en origen**, separado de la criticidad |
| M | Consideraciones |

## Comportamiento del resumen

- Los cuatro KPI y columnas principales muestran **solo las integraciones con criticidad Alta**, divididas en Validada, Por validar, En pruebas y En desarrollo.
- Estados `Validado` y `Validada` se agrupan como **Validada**.
- La sección secundaria **Integraciones no priorizadas** despliega los registros cuya columna L no dice `Alta`, sin eliminarlos.
- La marca de relleno verde se calcula a partir del formato de celda **L** del archivo Excel exportado de Drive; se presenta incluso en integraciones no priorizadas. **No significa validación, conformidad ni aprobación**.
- Pulsar una integración presenta dependencia, historial G completo, fechas H/I/J y consideraciones M, con la fila del Excel para auditoría.
- Permite búsqueda y filtro por estado mediante KPI, sin modificar los datos.
- Muestra advertencia si el número de filas del seguimiento difiere de las 36 integraciones del catálogo fijo. No se infiere cobertura por nombre ni se fusionan registros homónimos.

### Limitación sobre el verde en Google Sheets

El lector analiza el **relleno de celda directo** exportado como XLSX (estilos `fillId` de `styles.xml`). Los colores generados **solo por formato condicional**, pero no materializados como relleno directo al exportar, pueden no detectarse. La aplicación avisa si encuentra reglas de formato condicional. Para un semáforo institucional robusto, se recomienda incorporar en el futuro una columna explícita de marca o una lectura de formato efectivo con Google Sheets API, debidamente autorizada.

### Fechas

Las fechas numéricas de Excel en H/I/J se muestran como `dd/mm/aaaa` cuando se identifican como fechas; el texto libre y los rangos quedan sin cambios. **No** se interpreta un rango como una fecha puntual ni se presume cumplimiento.

## Validaciones realizadas

- Verificación sintáctica con `node --check` de los módulos JavaScript.
- Pruebas unitarias del parser táctico con filas de muestra: cuatro estados, criticidad Alta/no priorizada, fechas textuales y numéricas, lectura de bandera verde.
- La prueba de navegador local fue bloqueada por política del entorno (`ERR_BLOCKED_BY_ADMINISTRATOR`), por lo que **queda pendiente verificar visualmente en Chrome/Edge y contrastar los conteos reales con el documento privado**.
- Ningún número de la diapositiva se deja fijo; el conteo de estados procede exclusivamente de la hoja táctica cargada.

## Versiones

- **V1.4**: base estable histórica, comentarios visibles GTI/SOFTPLAN.
- **V1.8.1**: base funcional de esta evolución, indicadores auditables.
- **V1.9**: incorporación del Resumen táctico, segunda fuente privada y distinción de criticidad y relleno verde.

## Correcciones V1.9.1

- La lectura de la hoja `Seguimiento` está limitada estrictamente a las **filas 1 a 36, inclusive**. Los registros posteriores no se importan ni se cuentan, independientemente de las filas disponibles en el archivo.
- Al expandir una integración, las etiquetas son únicamente **Dependencia**, **Cierre desarrollo**, **Cierre pruebas SOFTPLAN / GTI**, **Validación GSJ**, **Estado situacional / hitos** y **Consideraciones**. No se anexan letras de columna. La fila de origen se conserva para auditoría.
- En H, I y J, la aparición de **«Por informar»** o **«Revisión con…»**, sin importar mayúsculas ni acentos, genera una **alerta roja visible incluso con la integración contraída**. Al expandir, se destacan los campos afectados y se explica la causa.
- Las alertas son documentales, no una deducción automática de incumplimiento o de fechas vencidas. La marca verde de la fuente permanece independiente de la alerta roja.
- El resumen contabiliza cuántos registros contienen alertas de fecha, tanto en las integraciones priorizadas como en las no priorizadas.

### Pruebas de regresión

En la carpeta del proyecto, ejecuta `node tests/tactical.test.mjs`. Este test usa datos ficticios, no consulta Google y valida el límite de filas, los casos de alerta, el conteo y la separación por criticidad. Para comprobar los datos reales, abre la V1.9.1, autoriza la cuenta de Google y actualiza la fuente táctica privada.


## V1.9.2 · Filtros tácticos por severidad, ciclo y tipo

Dentro de **Resumen táctico** aparece el selector **Clasificar integraciones**. Sus opciones se calculan exclusivamente con la hoja `Seguimiento` (filas 1–36):

| Opción | Regla exacta |
|---|---|
| Todas las integraciones | Todos los registros tácticos válidos |
| Severidad Crítica | L = `Alta` y relleno de celda L verde |
| Severidad Alta | L = `Alta` y **sin** relleno verde de celda L |
| Ciclo 2 | D = `Ciclo 2` |
| Ciclo 2/3 | D = `Ciclo 2/3` |
| Funcionalidad para Ciclo 1 | D = `Funcionalidad para Ciclo 1` |
| Integraciones manuales | D = `manual` |
| No aplica integración | D = `No Aplica Integracion` |

Las comparaciones de texto ignoran mayúsculas, espacios exteriores y acentos. **Crítica y Alta son excluyentes**, por lo que una integración Crítica no se duplica al filtrar Alta. Los filtros de ciclo y tipo se basan independientemente en D; un registro con D = Ciclo 2 y L = Alta podría aparecer en ambos filtros correspondientes. Un valor `Ciclo 2/3` no se confunde con `Ciclo 2`.

La vista **Todas** conserva el esquema original: cuatro bloques por estado para las prioritarias y lista secundaria de no priorizadas. Los filtros **Crítica** y **Alta** conservan los cuatro bloques, mostrando solo los registros correspondientes. Los filtros por ciclo y tipo muestran directamente una lista con estado textual original, dependencia, hitos, fechas y consideraciones, aunque D ya no sea uno de los cuatro estados. La búsqueda y los detalles desplegables permanecen disponibles. El botón **Limpiar filtros** restablece la categoría, estado y búsqueda.

**Limitación documentada:** si la celda L parece verde en Google Sheets debido exclusivamente a formato condicional y ese color no aparece como relleno directo en el XLSX exportado, no podrá clasificarse como Crítica. En ese caso el registro `Alta` aparecerá en la clase Alta y se indicará la posible limitación cuando el libro incluya formato condicional. Para auditar la fuente se conserva el nombre de hoja y fila.

### Pruebas V1.9.2

Ejecutar desde la carpeta:

```sh
node tests/tactical.test.mjs
node tests/tactical-categories.test.mjs
```

Estas pruebas utilizan registros ficticios (no credenciales ni archivos privados) y verifican el rango hasta fila 36, reglas de verde, ocho opciones incluyendo Todas, exclusividad de severidades, variantes de escritura y distinción entre ciclos. La ejecución visual automatizada en Chromium quedó bloqueada por política del entorno; se recomienda una última inspección de interfaz al cargar el Google Sheets privado real.


## V1.9.3 · Exportación de diapositiva resumen

- Se incorpora el botón **Generar diapositiva resumen** en la pestaña **Resumen táctico**.
- La exportación genera un archivo PowerPoint (.pptx) con una lámina resumen basada en el filtro táctico visible.
- Cuando el filtro es **Todas las integraciones**, se incluye una segunda diapositiva para las no priorizadas.
- La presentación conserva la agrupación por estado: Validada, Por validar, En pruebas y En desarrollo.


## V1.9.5 · Diapositiva resumen alineada al formato objetivo

- La exportación a PowerPoint adopta el estilo del archivo de referencia `Diapo_Resumen(1).pptx`.
- Se ajustan colores, tipografía y distribución general para aproximarse a la lámina objetivo.
- El cuadro **Manual** siempre se muestra, incluso cuando no existan registros bajo el filtro activo.
- Se incorpora el fondo institucional del ejemplo en la diapositiva exportada.


## V1.9.6 · Exportación institucional y distribución automática

- La diapositiva generada replica **medidas, tipografía Calibri, colores y encabezado/pie institucional** del archivo `Diapo_Resumen(1).pptx`. El fondo institucional se incorpora como imagen propia del proyecto; las tarjetas y textos permanecen editables en PowerPoint.
- El botón **Generar diapositiva resumen** usa los filtros activos del Resumen táctico. Se mantiene una sola lámina cuando todo cabe; si no, se generan **láminas de continuación** con la misma plantilla, sin omitir registros.
- El bloque **Manual** siempre se incluye, independientemente del filtro de severidad o ciclo, utilizando todos los registros `D = Manual` de `Seguimiento` (hasta fila 36). Cuando no existan, muestra 0; en las páginas siguientes se mantiene el bloque.
- Los estados distintos de los cuatro principales, como `Ciclo 2`, se muestran en un bloque complementario **Otros estados / tipos fuera del flujo de pruebas**, en lugar de quedar invisibles.
- La biblioteca de exportación PPTX se distribuye localmente en `vendor/pptxgen.bundle.js` y no requiere CDN.
- `ppt-layout.js` calcula la paginación. Puede verificarse con `node tests/ppt-layout.test.mjs`. Se preserva la fuente privada por OAuth y no se incluyen libros originales en el ZIP.
- Los totales de las cuatro tarjetas reflejan el conjunto filtrado completo, **no únicamente la parte visible en la primera lámina**. Los datos tácticos del documento privado se mantienen fuera del código fuente.

**Limitación visual:** en los casos con nombres muy extensos, la letra puede reducirse dentro del cuadro; al superar la capacidad se crea una nueva lámina. Los elementos editables reproducen el diseño, sin prometer identidad píxel a píxel entre diferentes versiones de PowerPoint o LibreOffice.


## V1.9.7 · Entidad exacta de Seguimiento!E

- El campo **Entidad** del PPT se alimenta exclusivamente del contenido de **columna E** de la hoja `Seguimiento` (campo `dependency` del modelo táctico).
- No se separan los valores por `/`, no se fusionan entidades de filas distintas y no se inventa `PJ` para el cuadro Manual.
- Cuando un bloque contiene una única entidad E común a todos sus registros, se muestra `Entidad: <valor E>` en la cabecera del bloque.
- Si hay entidades diferentes o valores vacíos, no se atribuye una sola entidad al bloque: la exportación incluye `Entidad: <valor E>` junto a cada integración que tenga E informada.
- Los valores vacíos permanecen vacíos; no se sustituyen por etiquetas presumidas.
- El cuadro Manual, los colores, la plantilla institucional, los filtros y la paginación automática siguen como en V1.9.6.
- Pruebas reproducibles: `node tests/ppt-entities.test.mjs` y `node tests/ppt-layout.test.mjs`.


## V1.9.8 · Una sola diapositiva y morado exclusivo para Crítica

- El botón **Generar diapositiva resumen** exporta **exactamente una diapositiva PowerPoint**, independientemente del número de integraciones filtradas.
- Si alguna lista excede su cuadro original, sus registros se colocan en **Integraciones adicionales / otros estados**, dentro de la misma diapositiva. El número de registros no se reduce.
- **Color de texto morado (`#7030A0`):** solo cuando el filtro seleccionado es **Severidad Crítica**. Con Alta, Todas, Ciclo 2, etc., los nombres utilizan el color normal (`#1A1F2B`).
- Se mantiene el cuadro **Manual** y los valores literales de **Entidad** obtenidos exclusivamente de la columna E.
- Densidades extremas pueden reducir la legibilidad debido a la restricción de una sola diapositiva. Las listas adicionales usan distribución compacta.


### V1.9.9 · Corrección del cuadro «Integraciones adicionales / otros estados»

**Causa corregida:** las estimaciones de altura repetían el texto de Entidad aunque existiera una única entidad común; por ello la exportación podía enviar un registro válido a «Otros estados». Ahora se optimiza el espacio antes de reubicar nombres y se respeta la clasificación de la columna D de `Seguimiento`.

- Registros `Validada`, `Por validar`, `En pruebas` y `En desarrollo` permanecen en sus bloques cuando hay espacio suficiente.
- El cuadro de otros estados solo contiene valores de D diferentes de esos cuatro y de `Manual`.
- Para casos extraordinarios donde la cantidad de nombres no puede caber físicamente en su cuadro, la zona inferior se identifica como **«Continuación por estado»** en la misma diapositiva, sin atribuirles un estado distinto.
- El cuadro `Manual` permanece siempre visible.

Prueba: `node --test tests/ppt-state-grouping.test.mjs tests/ppt-layout.test.mjs`.

## V1.10 · Integraciones por vía y etapa

- Se incorpora **Integraciones por vía** en el menú lateral.
- La nueva vista se alimenta de la pestaña **IntegracionesEtapa** del **mismo Excel privado del seguimiento táctico**, que contiene la pestaña **Seguimiento**. Reutiliza OAuth y el botón de actualización del Resumen táctico.
- Soporta dos esquemas identificados por **cabeceras** (independientemente de la posición de las columnas):
  1. Lista: columnas **Vía / Etapa / Integración**. Cada fila relaciona una integración con su vía y etapa. Se permiten celdas fusionadas (vía y etapa se heredan de la última celda no vacía).
  2. Matriz: columnas **Vía / Integración** y varias columnas de etapa (**Registro demanda**, **Calificación**, **Trámite**, **Ejecución**), marcadas con valores afirmativos.
- Las integraciones se cruzan con **Seguimiento** por su nombre normalizado. «Lista» equivale a estado **Validada/Validado**. Otros estados se consideran pendientes. Si el nombre no coincide, se indica *Sin vincular con Seguimiento* y no se afirma que esté validada ni que tenga severidad conocida.
- Filtros: **Todas, Crítica** (Alta + relleno verde), **Alta** (Alta sin relleno verde) y **No priorizadas** (únicamente coincidencias de Seguimiento cuya criticidad es distinta de Alta).
- Incluye exportación PowerPoint con una sola diapositiva **por vía**, tanto para una vía individual como para todas las vías, y conserva los textos editables, la tipografía Calibri y el fondo institucional del ejemplo `Integracionxvia.pptx`.
- El PowerPoint **no inventa registros**. En listas extraordinariamente extensas, en lugar de omitir nombres, avisa que la vía supera la capacidad de lectura de una diapositiva.

**Importante:** no se ha proporcionado en esta conversación un ejemplar exportado de la hoja privada «IntegracionesEtapa». Se verificaron el lector y los filtros con datos de prueba, pero es necesaria una prueba real contra los encabezados del documento de Google. Si la fuente usa un diseño distinto, el tablero mostrará un diagnóstico de estructura no reconocida, sin generar asociaciones incorrectas.


## V1.10.1 · Diagnóstico y mapeo de IntegracionesEtapa

Corrige el caso en que Google Drive descarga correctamente la hoja `IntegracionesEtapa`, pero sus encabezados no coinciden con los nombres esperados. El tablero ahora:

1. Muestra un error destacado, diferenciando una hoja ausente de encabezados no reconocidos.
2. Presenta una vista previa de las primeras filas con sus referencias A, B, C, etcétera, sin subir esos datos a terceros.
3. Permite configurar en la misma pestaña las columnas de **Vía**, **Etapa** e **Integración**, así como el número de fila de encabezados.
4. Admite lista vertical, matriz de etapas, vías como columnas y secciones encabezadas por vía y etapa.
5. Reprocesa el Excel ya cargado, sin volver a iniciar OAuth; mantiene estados y severidad desde `Seguimiento`.
6. Incluye pruebas reproducibles en `tests/vias-diagnostics.test.mjs`.

### Qué hacer si aparece «Encabezados no reconocidos»

En **Integraciones por vía**, abre **Diagnóstico de la hoja y configuración**. Lee la vista previa y selecciona los encabezados reales de las columnas. Para una tabla convencional, usa «Filas: Vía · Etapa · Integración», indica la fila donde aparecen los encabezados y asigna las tres columnas. Pulsa «Aplicar correspondencias».

No se ha podido contrastar el mapeo con las filas reales del Google Sheets privado; si la estructura es más compleja, adjunta una exportación de la pestaña `IntegracionesEtapa` o una captura que incluya encabezados y algunas filas de ejemplo. Evita enviar datos judiciales personales.


## V1.10.2 · Orden y totalización de integraciones por vía

- Para **Conflicto de autoridad** se fuerza la secuencia **Recepción → Trámite**, respetando el orden de las demás vías.
- La pestaña **Integraciones por vía** muestra solo **dos indicadores**: integraciones listas (validadas) e integraciones pendientes (demás estados) para la vía y severidad elegidas.
- Cada integración se contabiliza una sola vez en esos totales aunque aparezca en distintas etapas. Las listas continúan mostrando su ubicación por etapa.
- En la presentación de PowerPoint por vía se utilizan los mismos dos totales globales y se eliminan los contadores de las etapas; se conserva una diapositiva por vía y el detalle de las listas.
- Los datos siguen procediendo de las pestañas **IntegracionesEtapa** y **Seguimiento**. No se modifican OAuth ni el catálogo fijo.


## V1.10.3: Alineación de integraciones pendientes en PowerPoint

En las diapositivas de **Integraciones por vía**, todos los títulos «Integraciones Pendientes» de una misma fila de etapas se muestran a la misma altura. Se alinea también su separador horizontal. La vista web y los datos fuente no cambian.

Prueba: `node tests/via-pending-alignment.test.mjs`.
