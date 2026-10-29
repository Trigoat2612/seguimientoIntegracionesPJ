# Versión 1.15.5.2 · Lectura sin inicio de sesión

Resumen táctico, Integraciones por vía, Flujo de actividades y Documentos Clave cargan las publicaciones directamente, sin solicitar Google OAuth. La edición de Documentos Clave, así como la sincronización y publicación de datos, requiere una cuenta autorizada. Las pantallas operativas solo muestran «Datos publicados» y «Recargar vista», sin referencias técnicas a Neon, origen ni columnas. Ver [`GUIA_LECTURA_DIRECTA_V1_15_5_2.md`](GUIA_LECTURA_DIRECTA_V1_15_5_2.md).

**Advertencia:** un despliegue público ofrece lectura pública de las API, incluyendo bitácoras. Proteger el acceso al sitio si contiene información privada. No hay cambios SQL.

---

# V1.15.5.1 · Identidad y lectura Neon sin permiso de Google Drive

La consulta de **Resumen táctico, Integraciones por vía, Flujo de actividades y Documentos Clave** utiliza solo un token de **identidad** (`openid email`). La autorización de lectura de archivos privados de Google Drive se solicita **por separado y únicamente** desde Sincronización de datos. `DOCUMENT_EDITOR_EMAILS` conserva las operaciones de edición; `DASHBOARD_VIEWER_EMAILS` es opcional para usuarios de consulta sin edición. No hay acceso anónimo a Neon ni migración SQL nueva. Consulta [`GUIA_AUTENTICACION_V1_15_5_1.md`](GUIA_AUTENTICACION_V1_15_5_1.md).

---

# Actualización V1.15.5 · Neon como única fuente operativa

Desde el inicio se abre Resumen táctico y se consultan las cuatro publicaciones de Neon (OAuth obligatorio). Google Sheets/Excel se utiliza únicamente dentro de **Sincronización de datos** para cargar, cotejar y publicar cambios. El catálogo de **Documentos Clave** conserva íntegra su bitácora, revisiones y comentarios. Los cinco módulos técnicos antiguos están en **En desarrollo**. Sin migración SQL adicional.

**Instalación:** conservar `.env.local` y `.vercel/`; ejecutar `npm install`, `npm test`, `npm run build` y `npx vercel dev`. Si el navegador bloquea la autorización automática, pulsar **Autorizar acceso a Neon**. La lectura no se hace anónima.

---

> **Versión 1.15.4.1:** Corrige el botón «Publicar flujo en Neon»; consulta `GUIA_MIGRACION_V1_15_4_1.md`. No requiere SQL adicional.

# V1.15.3 · Integraciones por vía en Neon (lectura opcional)

- **Guía de instalación:** [`GUIA_MIGRACION_V1_15_3.md`](GUIA_MIGRACION_V1_15_3.md).
- **SQL nuevo:** `integraciones-via-v1_15_3.sql`, aditivo sobre la V1.15.2.
- **API:** `api/integraciones-via.js`, consultas, cotejo, publicación reversible y restauración a Google Sheets.
- **Relaciones:** `route_integration_links` y `route_published_metadata` con procedencia, historial y estados derivados del Resumen táctico publicado.
- **Presentación:** selector Google Sheets/Neon en la pestaña Integraciones por vía; conserva los filtros y PowerPoint del modelo anterior.
- **Independencia:** Documentos Clave y Resumen táctico permanecen en Neon; Flujo de actividades continúa en Google Sheets.

---

# V1.15.2 · Resumen táctico en Neon (publicación reversible)

- **Guía de instalación, validación y reversión:** [`GUIA_MIGRACION_V1_15_2.md`](GUIA_MIGRACION_V1_15_2.md).
- **Migración SQL nueva, aditiva:** [`resumen-tactico-v1_15_2.sql`](resumen-tactico-v1_15_2.sql).
- **Nuevo endpoint:** `api/resumen-tactico.js`; consultas de estado, registros, cotejo, publicación y regreso a Google Sheets.
- **Modelos equivalentes:** `resumen-tactico-migracion.js` reutiliza `parseTactical`, bitácoras, estilos y reglas de severidad.
- **Alcance:** filas 1–36 de Seguimiento, sin borrar datos adicionales del lote auditado.
- **Compatibilidad:** Documentos Clave permanece en Neon; Integraciones por vía y Flujo de actividades siguen en Google Sheets. Las diapositivas tácticas continúan utilizando los modelos existentes.

---

# V1.15.0 · Línea base de migración gradual a Neon

- **Hoja de ruta aprobada:** [`LINEA_BASE_DESARROLLO.md`](LINEA_BASE_DESARROLLO.md)
- **Instalación y operación:** [`GUIA_MIGRACION_V1_15_0.md`](GUIA_MIGRACION_V1_15_0.md)
- **Migración SQL adicional:** [`sincronizacion-v1_15_0.sql`](sincronizacion-v1_15_0.sql)
- **Novedad:** pestaña «Sincronización de datos» con validación, comparación, importación preliminar e historial por hoja.
- **Fuente operativa de todas las pestañas:** Google Sheets / Excel. No cambia en V1.15.0.
- **Nueva denominación del módulo documental:** «Documentos Clave». Se mantiene la hoja `CatalogoDocumentos` sin renombrarla.
- **Dependencias y servidor:** `npm install`, `npx vercel dev`, variables privadas existentes, Neon con migración aplicada.

---

# Tablero de Integraciones PJ · V1.11.0 — Flujo de actividades por vía

> **Base estable preservada: V1.10.3** (pendientes alineados en PowerPoint). Esta V1.11.0 es una evolución funcional que no altera la V1.10.3.

## Nueva pestaña: Flujo de actividades

Fuente: **mismo libro táctico privado** de Google Drive, hoja `EtapaActividadIntegracion`. No hay que agregar credenciales OAuth ni fuentes adicionales.

| Columna | Interpretación exacta |
|---|---|
| A | Vía procesal |
| B | Paso del flujo, en el orden de aparición del Excel |
| C | Etapa de la actividad |
| D | Actividad del paso |
| E | Integración asociada (opcional). Varias integraciones pueden escribirse en líneas separadas o separadas por `;`. |

La hoja **Seguimiento**, del mismo libro, suministra el estado y la criticidad de las integraciones. Una integración se clasifica **Lista** solo si está en estado `Validada/Validado`. Cualquier otro estado documentado se clasifica **Pendiente**. Una integración que no se corresponde con Seguimiento se muestra como **Sin correspondencia**, pendiente de verificar, nunca como lista.

### Visualización

1. Abre **Flujo de actividades** desde el menú lateral y pulsa **Actualizar desde Google** o importa el respaldo táctico .xlsx desde **Fuentes**.
2. Selecciona **Vía** y **Severidad** (Todas, Crítica, Alta, No priorizadas o Sin correspondencia).
3. Despliega un **paso del flujo** para ver las actividades y su etapa (columna C).
4. Despliega una **actividad** para ver integraciones **listas** y **pendientes** con su estado y dependencia.
5. Las actividades sin integración en E siguen apareciendo y se identifican expresamente: no cuentan como pendientes.

El resumen superior muestra solo dos indicadores para cada vía y filtro: **Integraciones listas** e **Integraciones pendientes**, contando cada integración una sola vez aunque intervenga en varias actividades. El filtro de severidad afecta solo a las integraciones: los pasos y actividades mantienen la estructura completa del flujo.

Se admiten celdas fusionadas exportadas con A, B, C o D vacías en filas de continuación: el lector hereda el contexto de la última fila válida sin trasladar etapas o actividades entre pasos diferentes. No se ordenan los pasos alfabéticamente, se conserva la secuencia del Excel.

### Comprobaciones y limitaciones

- Prueba del lector A–E, continuaciones, actividades sin integración, repetición de actividades, filtros y clasificación: `node --experimental-default-type=module tests/actividad-flujo.test.mjs`.
- Las pruebas originales de PowerPoint por vía y resumen táctico se mantienen y han sido ejecutadas satisfactoriamente.
- La hoja privada real `EtapaActividadIntegracion` no fue leída en este entorno; no se confirman nombres ni cantidades reales. Si cambian las columnas A–E, deberá ajustarse el parser. El tablero mostrará un error si la hoja falta o carece de registros legibles.
- La prueba visual con Chromium quedó bloqueada por la restricción del entorno a localhost; se requiere validar en Chrome/Edge tras cargar el documento privado.
- Los datos del libro se procesan en el navegador. El Excel privado no se incluye dentro del proyecto ni se publica como JSON.

---

# Historial y documentación técnica de versiones anteriores

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


## V1.11.1 · Flujo de actividades en cuadrícula
- Se elimina el resumen superior de integraciones listas y pendientes en la vista Flujo de actividades.
- Cada panel de paso muestra el rótulo “Paso N.° X”.
- Los pasos se distribuyen en cuadrícula responsive, en lugar de una columna vertical.


## V1.11.2 · Flujo refinado
- Se unifica el color visual de todos los pasos del flujo.
- La numeración de pasos se muestra como enteros.
- Se muestran etiquetas de etapa dentro de cada caja de paso.
- Las integraciones listas y pendientes se presentan como listados verticales, no como paneles contiguos.


## V1.11.3 · Resumen táctico no priorizado por estados
- La vista secundaria de integraciones no priorizadas ahora se separa por estado: Validada, Por validar, En pruebas, En desarrollo y Otros estados cuando corresponda.
- Se mantienen los contadores por estado y el comportamiento de filtros/búsqueda existente.


## V1.11.4 · Resumen táctico no priorizado con subgrupos
- En la vista secundaria de integraciones no priorizadas, cada estado ahora agrupa y separa sus registros por: Ciclo 2, Ciclo 2/3, Funcionalidad nativa del sistema (antes «Funcionalidad para Ciclo 1»), Manual, No aplica integración y Otras clasificaciones.
- Se conserva el agrupamiento principal por estado y los filtros existentes.


## V1.11.5 · Corrección de no priorizadas por grupo
- La vista secundaria deja de mostrar el bloque genérico “Otros estados” para los registros de columna D con clasificaciones específicas.
- Ahora esos registros se muestran como grupos propios: Ciclo 2, Ciclo 2/3, Funcionalidad nativa del sistema, Manual, No aplica integración y Otras clasificaciones solo como residual.


## V1.11.6 · Resumen rápido en no priorizadas
- La vista secundaria de integraciones no priorizadas incorpora un resumen general con totales rápidos para facilitar una lectura ejecutiva.
- El resumen muestra el total no priorizado y los conteos por estado y por grupo de clasificación aplicable.


## V1.11.7 · Totales visibles en encabezados
- Se retira el bloque de total general desde el interior del desplegable de integraciones no priorizadas.
- El total de “Integraciones no priorizadas” ahora se muestra en el encabezado derecho para lectura rápida.
- El bloque de “Otros estados” dentro de priorizadas también muestra su total en el encabezado derecho.


## V1.11.8 · Manual como grupo y totales estandarizados
- En el bloque superior de priorizadas, los registros con clasificación Manual ya no se muestran como “Otros estados”; ahora se presentan bajo el grupo “Manual”.
- Se estandariza la visualización de totales en encabezados con el formato “Total X”, tanto en no priorizadas como en los bloques superiores equivalentes.


## V1.11.9 · Ajustes de exportación PPT por vía
- Se corrigió la alineación vertical de las viñetas respecto del texto en las listas de integraciones.
- Los puntos de las listas usan de forma consistente el color de la columna/etapa donde se dibuja el ítem.
- En la exportación PowerPoint por vía, las integraciones con estado **Por validar** se consideran dentro del bloque **Integraciones listas**.


## V1.11.9.1 · Corrección final de viñetas en PPT
- En la exportación del **Resumen táctico**, las viñetas se alinean al mismo nivel vertical del texto de cada integración.
- Las viñetas respetan el color de la columna/panel (Validada, Por validar, En pruebas, En desarrollo) y ya no heredan color verde por registro.
- Se mantiene la mejora previa para exportación **por vía**: estado **Por validar** se considera como integración lista.


## V1.12.0 · Exportación de no priorizadas en nueva diapositiva
- La exportación del resumen táctico ahora incluye, cuando el filtro es **Todas las integraciones**, una **segunda diapositiva** para las **integraciones no priorizadas**.
- La nueva lámina usa el mismo esquema visual aplicado a críticas y altas: bloques por estado, cuadro manual y pie de fuente.
- La presentación conserva numeración de láminas cuando se genera más de una diapositiva en el mismo archivo PowerPoint.


## V1.12.1 · No priorizadas con subpaneles de clasificación
- En la diapositiva de **integraciones no priorizadas**, la franja inferior ahora separa explícitamente las integraciones en:
  - **Ciclo 2**
  - **Ciclo 2/3**
  - **Funcionalidad nativa del sistema** (valor fuente: Funcionalidad para Ciclo 1)
  - **No aplica integración**
- Si existiera alguna clasificación adicional fuera de esos grupos, se muestra en un bloque residual de **Otros estados**.


## V1.12.2 · Mejora de legibilidad en la segunda diapositiva
- En la diapositiva de **no priorizadas** se retiró el bloque **Manual** para aprovechar mejor el espacio.
- Las clasificaciones adicionales (**Ciclo 2**, **Ciclo 2/3**, **Funcionalidad nativa del sistema**, **No aplica integración**) ahora se distribuyen en una retícula 2×2 de mayor tamaño, más legible.
- Se redujo la densidad tipográfica y se ajustó el número de columnas internas por panel para mejorar lectura.


## V1.13.0 · Control documental – Primera etapa

### Nueva pestaña «Control documental»
- Lee la pestaña **CatalogoDocumentos** de la fuente privada táctica, reutilizando la autorización OAuth configurada.
- Si `CatalogoDocumentos` está en **otro** Google Sheets o Excel almacenado en Google Drive, configura `window.DASHBOARD_DOCUMENTS_SOURCE.url` en `config.js` con la URL completa. Si la URL queda vacía, se reutiliza el archivo del Resumen táctico.
- Permite también **Importar .xlsx** de respaldo desde la vista documental, sin reemplazar las otras fuentes del tablero.
- Visualiza nombre, código, versión, tipo, estado, responsable, especialidad, fecha y enlace, cuando esos atributos existan. Las columnas no reconocidas se conservan como **otros atributos** en la ficha individual.
- Ofrece búsqueda general, filtros por estado, tipo, especialidad y responsable, y resúmenes de total de registros, documentos únicos, versiones registradas y estados validados *de origen*.
- Incorpora **diagnóstico de filas y columnas** y mapeo manual cuando los encabezados del Excel no coinciden con los nombres reconocidos. No modifica la hoja.
- Mantiene un identificador de registro `hoja:fila` para rastrear su origen. Los duplicados documentales no se borran automáticamente.
- **Solo lectura (fase 1)**: no registra incidencias, no almacena aprobaciones, no modifica Google Sheets ni usa Neon. El estado mostrado es el del Excel, no una conformidad emitida por la aplicación.

### Preparación de la hoja CatalogoDocumentos

El campo **Documento** (o «Nombre del documento») es el único obligatorio para presentar registros.
Se recomienda incorporar las siguientes columnas, de preferencia en la primera fila:

`Código | Documento | Versión | Tipo de documento | Estado | Responsable | Especialidad | Fecha | Enlace | Observaciones`

- Es una recomendación de esquema para la próxima etapa, no una exigencia de migración; puedes conservar los encabezados actuales y utilizar «Configurar columnas».
- Si no existen columnas de versión, estado o responsable, se muestran como no informadas; **nunca se inventa un estado de validación**.
- No se almacena el contenido privado del Excel en localStorage. El archivo se procesa en la memoria de la sesión del navegador.

### Uso

1. Abre **Control documental** desde el menú lateral.
2. Haz clic en **Actualizar documentos** y autoriza tu cuenta de Google cuando se solicite. Si `CatalogoDocumentos` está en el libro táctico, se actualizarán también sus demás hojas existentes.
3. Selecciona un registro con **Examinar** para consultar su ficha y los atributos de origen.
4. Si aparecen encabezados no reconocidos, abre **Configurar columnas**, vincula Documento y las demás columnas disponibles y aplica las correspondencias.
5. Para importar un respaldo, utiliza **Importar .xlsx** (debe contener la pestaña `CatalogoDocumentos`).

La siguiente etapa incorporará una bitácora persistente de incidencias y auditoría por documento/versión. No se crea ni simula esta funcionalidad en V1.13.0.


## V1.13.1 · Esquema actual de CatalogoDocumentos

La hoja inicial tiene únicamente dos columnas, con encabezados reconocidos automáticamente:

| Columna | Encabezado exacto | Función |
| --- | --- | --- |
| A | `Cod Documento` | Identificador documental para futuras incidencias |
| B | `Nombre Documento` | Nombre visible y seleccionable en el catálogo |

- La lista, búsqueda y ficha documental priorizan código y nombre.
- El resumen usa **Documentos registrados**, **Códigos únicos**, **Sin código** y **Códigos repetidos**.
- No se muestran indicadores de versión ni de validación mientras esos datos no existan en la fuente.
- La lectura avisa de códigos vacíos y repetidos, sin borrar filas ni corregir información por su cuenta.
- Se conservan los campos opcionales del lector por si la hoja se amplía en el futuro; no son obligatorios.
- La fase 1 sigue siendo **solo lectura**. La bitácora persistente de incidencias es una fase posterior.

## V1.14.0 — Etapa 2: bitácora de incidencias documentales

La pestaña **Control documental** mantiene `CatalogoDocumentos` (A: Cod Documento, B: Nombre Documento) como catálogo de solo lectura. Al seleccionar **Examinar** se carga una bitácora independiente, persistente y auditada en Neon, asociada por el código del documento (normalizado). Se pueden crear incidencias, asignar severidad y responsable, comprometer fechas, registrar enlaces de evidencias HTTPS, actualizar estados y consultar el historial inmutable de cambios y comentarios. **Cerrar una incidencia no valida el documento**.

### Activación obligatoria en Vercel / Neon

1. Crea o selecciona tu base PostgreSQL en Neon y ejecuta `bitacora-schema.sql` en el SQL Editor.
2. En Vercel → Project → Settings → Environment Variables, crea **solo del lado del servidor** `DATABASE_URL` (cadena Postgres SSL), `GOOGLE_OAUTH_CLIENT_ID` (el mismo identificador público de `config.js`) y `DOCUMENT_EDITOR_EMAILS` (correos permitidos separados por comas). Configúralas también en el entorno Preview si realizas pruebas allí. Nunca coloques `DATABASE_URL` en `config.js` ni lo incluyas en un repositorio.
3. Instala las dependencias (`npm install`) y despliega el proyecto. Vercel reconocerá `api/incidencias.js` como función de servidor.
4. En el navegador, autoriza Google de nuevo: ahora se solicitan los permisos `openid email` además de Drive de solo lectura. Selecciona un documento con código único, abre **Examinar** y entra en la bitácora.
5. Para desarrollo local, utiliza `vercel dev` y variables privadas de `.env.local` o `vercel env pull .env.local`; **`python -m http.server` no ejecuta las funciones `/api`**. El ejemplo `.env.example` no contiene credenciales válidas.

Sin base de datos, sin migración o sin lista de revisores, la bitácora mostrará un error y **no guardará nada**. Los documentos con códigos vacíos o duplicados no admiten creación de incidencias hasta su corrección. Google Sheets no se modifica.

### Campos de una incidencia

- Documento: código y nombre de origen.
- Incidencia: título, descripción, severidad (Crítica / Alta / Media / Baja).
- Seguimiento: estado (Abierta / En atención / Subsanada / En verificación / Cerrada / Reabierta), responsable / área, fecha compromiso, URL de evidencia.
- Trazabilidad: correo autenticado, fecha de alta y última actualización, revisión optimista, comentario obligatorio para cambios, eventos con imagen anterior y posterior.

**Controles de seguridad:** el backend comprueba un token OAuth válido del proyecto y un correo de la lista permitida en cada llamada, usa consultas parametrizadas y no recibe credenciales de base de datos desde el cliente. Los eventos no tienen rutas de borrado ni modificación. Para conservar los eventos ante acceso administrativo directo a la BD, limita permisos de escritura a un rol restringido y establece respaldos según las políticas institucionales. Las URLs de evidencia deben ser HTTPS y sus permisos siguen siendo responsabilidad de Google Drive.

**Pendiente de habilitación real:** al no contar con credenciales privadas de Neon ni con los correos autorizados no se ha probado escritura en tu base ni conexión externa OAuth; se requiere configurar esos servicios en tu despliegue. Esta fase no incluye aprobación documental formal ni carga de archivos adjuntos desde el navegador.

## V1.14.1 · Códigos documentales exactos (4.1 ≠ 4.10)

**Cod Documento** se considera un identificador textual, no una cantidad numérica. Por tanto `4.1`, `4.10`, `4.100` y `04.10` son códigos distintos. Esto afecta al catálogo, su diagnóstico, el control de duplicados, la búsqueda y la clave con la que se consultan y registran incidencias en Neon.

- Se conserva el código original cuando la celda A de `CatalogoDocumentos` es de tipo **texto**.
- Se recupera la representación visible cuando un número conserva un formato Excel de decimales fijos: por ejemplo, valor interno `4.1` con formato `0.00` se lee como `4.10`.
- Cuando la celda es numérica con formato general, **no** se intenta adivinar un cero ya perdido. Se presenta una advertencia y se bloquea la asociación de incidencias a ese código ambiguo, hasta corregir el catálogo.
- La API exige `documentCode` de tipo cadena de texto. El esquema existente `document_incidents.document_code VARCHAR(100)` ya es compatible; **no necesita migración**.

### Recomendación para Google Sheets

1. Selecciona la columna **A: Cod Documento** en `CatalogoDocumentos`.
2. Usa **Formato → Número → Texto sin formato** (en Excel, formato de celda **Texto**).
3. **Vuelve a introducir los valores originales**, especialmente `4.10`, `4.100` y códigos con ceros iniciales. Cambiar el formato después de una conversión numérica **no restaura** los ceros eliminados.
4. Actualiza `Control documental` y comprueba que `4.1` y `4.10` aparecen por separado.

**Registros anteriores:** si ya se guardaron incidencias bajo un código equivocado (`4.1` en vez de `4.10`), esta actualización no mueve registros existentes de forma automática, porque no es posible determinar a qué documento pertenecen sin revisar las evidencias. Es necesario conciliar esos casos antes de trasladar o corregir las relaciones en la base de datos.


## V1.14.2 · Bitácora accesible desde el inventario

- En **Control documental**, el botón **Examinar** despliega la ficha y bitácora inmediatamente **debajo de la fila seleccionada**. Se puede cerrar con **Ocultar ficha** o **Cerrar ficha**. No se desplaza el detalle al final del inventario.
- Al examinar un documento con código único, se abre el formulario **Registrar nueva incidencia** con título, severidad, responsable, fecha compromiso, descripción y enlace de evidencia opcional. El usuario puede redactar antes de autorizar Google; el guardado real exige una cuenta incluida en `DOCUMENT_EDITOR_EMAILS` y Neon configurado.
- Se retiró el aviso rojo que bloqueaba automáticamente los documentos cuyos códigos estaban almacenados en Excel como números con formato General. **Solo se impide asociar incidencias si el código está vacío o duplicado**.
- Los códigos de documento se pasan a la API **como texto**: `4.1` y `4.10` son diferentes cuando el origen conserva esa diferencia. **Si Excel transformó `4.10` en el número `4.1`, el sistema no puede recuperar ese cero perdido**; corrige la fuente para evitar asociaciones erróneas.
- El borrador del formulario de nueva incidencia permanece en memoria mientras se actualiza o autoriza la bitácora, y se limpia al cambiar de documento o después de guardar.
- No se modifican tablas SQL, variables de Neon ni permisos existentes. Continúa utilizando `npx vercel dev` para probar las rutas `/api`.


## V1.14.3 · Catálogo sin avisos innecesarios, diagnóstico de Vercel Dev y seguimiento documental en Neon

### A. Fuente documental

`CatalogoDocumentos` solo necesita dos columnas: **A: Cod Documento** y **B: Nombre Documento**. Ya no aparecen los avisos globales sobre 25 códigos numéricos ni por ausencia de columnas **Versión** y **Estado**. Los datos numéricos se leen tal como llegaron: el sistema **no puede reconstruir ceros que Excel eliminó**. Conserva códigos únicos y completos en el origen (ejemplo `4.10` debe permanecer como texto).

### B. Verificar `.env.local` en funciones Vercel

El error `Configura GOOGLE_OAUTH_CLIENT_ID y DOCUMENT_EDITOR_EMAILS` aparece cuando **el proceso de la API** no recibe una o ambas variables, incluso si el HTML funciona en localhost. Para verificarlo sin revelar secretos:

1. Detén `npx vercel dev`.
2. Abre **la carpeta raíz** donde está `package.json`; comprueba `.env.local` con las tres claves exactas `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `DOCUMENT_EDITOR_EMAILS`. No pegues ni publiques sus valores.
3. Si usas las variables del proyecto Vercel, entra a **Vercel → Settings → Environment Variables** y agrégalas al entorno **Development** del proyecto enlazado. Verifica su existencia con `npx vercel env ls development`. Ejecuta `npx vercel pull --environment=development` para actualizar el contexto local de `vercel dev` (sin sobrescribir a ciegas las variables privadas que ya hayas preparado en `.env.local`).
4. Vuelve a ejecutar `npx vercel dev`. Abre `http://localhost:3000/api/incidencias?diagnostico=1`. Verás `ready`, `variables` y `missing`, con valores booleanos solamente. Nunca devuelve URLs, contraseñas, correos ni tokens. **Este diagnóstico se deshabilita en producción**.
5. Si `ready` es `false`, comprueba que el directorio actual sea el enlazado, que los nombres coincidan exactamente y que las variables existan para **Development**. No repitas el guardado hasta obtener `ready: true`.
6. Si `ready: true`, pulsa **Autorizar Google** con un correo incluido en `DOCUMENT_EDITOR_EMAILS`; después crea una incidencia. Un error de Google o de conexión a Neon se muestra por separado.

### C. Nueva migración SQL (obligatoria para versión y estado documental)

Si ya ejecutaste `bitacora-schema.sql` de V1.14.0/1.14.2, **no elimines las tablas**. Ejecuta una sola vez en Neon SQL Editor (rama correspondiente a `DATABASE_URL`):

`bitacora-v1_14_3-migracion.sql`

Crea `document_reviews` y `document_review_events`. Son tablas independientes de `document_incidents` y `document_incident_events`; no modifican ni eliminan las incidencias existentes. Si partes desde cero, el archivo `bitacora-schema.sql` actualizado incluye las cuatro tablas.

Cada documento tiene los campos **Versión**, **Estado de revisión** (`Pendiente de revisión`, `En revisión`, `Observado`, `En subsanación`, `En verificación`) y **Motivo del cambio**. Se editan al pulsar **Examinar**, usando `Cod Documento` como clave, se guardan en Neon y cada modificación deja un evento de auditoría. **Validado** no se permite todavía, porque la aprobación formal pertenece a la etapa 3.

**Comprobación de migración:**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
('document_incidents','document_incident_events','document_reviews','document_review_events')
ORDER BY table_name;
```

Deben aparecer cuatro nombres de tabla. Para verificar una escritura real, guarda un estado en el tablero y consulta `SELECT document_code, document_version, review_status FROM document_reviews;`.

**Pruebas:** `npm test` valida reglas y UI con datos simulados. No sustituye una prueba real con tu OAuth y Neon; para esa prueba usa `npx vercel dev` y comprueba que aparecen registros en SQL Editor.


## V1.14.4 · Avisos de bitácora en el contexto del registro
- La confirmación de nueva incidencia se muestra junto a la incidencia recién creada.
- Los avisos de comentarios y atención aparecen dentro de la incidencia afectada; versión y estado documental muestran sus mensajes en el formulario correspondiente.
- Los errores de guardado se muestran en el mismo contexto del formulario, sin redireccionar al aviso general del encabezado.
- Al regenerar el inventario después de una operación se mantiene la posición de la fila expandida y se desplaza la vista lo mínimo para mostrar la notificación.
- No se modifica el esquema SQL, las variables de Vercel ni la configuración de Neon.


## V1.15.0.1 · Corrección del Output Directory de Vercel

**Causa anterior:** `npm run build` solo verificaba sintaxis y no generaba los archivos estáticos que Vercel buscaba en `public`. Crear la carpeta vacía a mano no bastaba.

**Corrección:** `npm run build` ejecuta `scripts/verify-build.mjs` y `scripts/build-static.mjs` para regenerar automáticamente `public/` con el HTML, CSS, módulos JavaScript del navegador, fondo institucional y librería PowerPoint. `vercel.json` declara explícitamente `outputDirectory: public` y `buildCommand: npm run build` para evitar discrepancias con ajustes anteriores del proyecto Vercel. Las funciones de servidor **siguen** en `api/*`, fuera de `public`.

1. Sustituir los archivos del proyecto por esta versión, **sin eliminar tu `.env.local`** ni la configuración `.vercel/` enlazada. Si ya creaste una carpeta `public` vacía, puedes dejarla: el build la regenerará.
2. En la carpeta raíz del proyecto ejecutar `npm install`, `npm run build`, `npm test` y `npx vercel dev`.
3. Comprobar que existen `public/index.html`, `public/app.js`, `public/styles.css` y `public/vendor/pptxgen.bundle.js`; abrir la app en la URL local indicada y verificar `/api/incidencias?diagnostico=1`.
4. Para producción, publicar los cambios en GitHub; Vercel ejecutará el mismo build. La carpeta generada `public/` está en `.gitignore` y no debe subirse al repositorio.

**Seguridad:** no se publican archivos `.env*`, código servidor, esquemas SQL, pruebas, README ni `package.json` dentro de `public`. Las variables `DATABASE_URL`, `GOOGLE_OAUTH_CLIENT_ID` y `DOCUMENT_EDITOR_EMAILS` deben seguir configuradas en Development/Production según el entorno. No se requieren cambios en Neon ni nuevos comandos SQL.


## V1.15.1 · Migración de Documentos Clave
Sigue `GUIA_MIGRACION_V1_15_1.md`. Ejecuta `documentos-clave-v1_15_1.sql` después de `sincronizacion-v1_15_0.sql`; el catálogo pasa a Neon solo después de una publicación confirmada. Las incidencias y el resto de pestañas continúan sin cambios.


## V1.15.1.1 · Corrección de longitud de bitácoras y controles de sincronización

- **Seguimiento!G (Estado situacional)** admite hasta **120.000 caracteres** por celda; no se trunca el texto, se preservan saltos de línea y se mantiene intacta la copia inmutable.
- **Seguimiento!M (Consideraciones)** admite hasta **60.000 caracteres**. Los campos breves tienen un límite de **12.000** y las demás columnas un límite seguro adaptado a su uso. Los otros módulos admiten hasta **24.000 caracteres** por celda, y el catálogo mantiene controles especiales para código y nombre.
- Se revisó el libro táctico actual: G8=4.589, G9=4.353, G17=3.994, G18=3.210 y G19=2.637 caracteres. Estas cinco celdas superaban el máximo antiguo de 1.800. Ninguna otra columna de Seguimiento superaba 1.800.
- El límite de carga total por importación se aumenta a **3,2 MB** (validación cliente/servidor), bajo el umbral de Vercel para solicitudes de funciones. Si el archivo supera el máximo, se informa de forma explícita y NO se recorta la información.
- **Comparar** y **Guardar copia en Neon** se habilitan cuando su hoja de origen está cargada, sin depender de una consulta previa de estado. **Historial** abre la consulta a Neon aunque no exista un estado precargado. Si fallan autorización/SQL/conexión, se muestra el error dentro de su módulo.
- Una importación guardada exitosamente **no se declara fallida** si únicamente falla la recarga posterior de indicadores.
- Se añade a Validar un diagnóstico del máximo de caracteres de G y M y del tamaño real de la copia.
- **No hay cambios de esquema SQL, credenciales, tablas o fuentes operativas.** Mantener los scripts de migración V1.15.0 y V1.15.1 ya aplicados en Neon Development. Google Sheets sigue siendo la fuente de lectura de los módulos no migrados.


## V1.15.4 · Flujo de actividades a Neon

Consulta `GUIA_MIGRACION_V1_15_4.md` para ejecutar `flujo-actividades-v1_15_4.sql`, importar `EtapaActividadIntegracion` desde el libro privado y realizar el cotejo antes de publicar. Los módulos anteriores mantienen sus fuentes y tablas existentes.
