# Tablero de Integraciones PJ · V1.9.2 · Resumen táctico y clasificación

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
