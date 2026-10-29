## V1.15.5.6 · Celdas vacías en comparación de origen
- `makeSheetSnapshot` usa materialización densa de filas y celdas XLSX omitidas, evitando huecos que se convierten en `null` al serializar JSON.
- `validateSheetSnapshot` interpreta `null` y `undefined` exclusivamente como celdas vacías, con validación estricta del resto de los tipos.
- Previene errores como `Fila 2, columna 6: el valor debe ser texto` al sincronizar `Seguimiento`, sin tocar el XLSX ni Neon.
- Pruebas de regresión para F2:F5, comparación idéntica, códigos documentales y filas vacías. No se requiere SQL nuevo.

## V1.15.5.5 · Bitácora documental desde hoja B:I
- Seguimiento documental acumulativo con cinco estados configurados, equipos validadores múltiples, fecha, actividad, comentarios, responsable y etapa.
- Importación de `bitacoraDocumentosClave` a Neon, vista histórica y registro manual con permisos de editor.
- Incidencias ocultas en la interfaz, datos históricos conservados; migración aditiva.
- Importaciones repetidas idempotentes; fechas vacías y estado histórico Observado conservados.

# V1.15.5.4 · Reorganización de la base de código

- Separación de `src/client`, `src/shared`, `src/server`, `api/`, `database/migrations`, `docs/`, `scripts/` y `tests/`.
- Publicación de `public/` generada, sin exponer módulos privados.
- Compatibilidad funcional con V1.15.5.3, incluidos Documentos Clave y sus tres estados.
- No requiere migración SQL adicional ni actualización de registros.
- Documentación: [`GUIA_REORGANIZACION_V1_15_5_4.md`](GUIA_REORGANIZACION_V1_15_5_4.md) y [`ARQUITECTURA.md`](ARQUITECTURA.md).

---

## V1.15.5.3 · Estados de revisión documental

- Estado de revisión del documento con **solo tres valores**: Validado, En proceso de firma y Programado.
- Formularios y API restringen los estados al mismo catálogo; se mantiene intacto el catálogo de estados de incidencias.
- Nuevos documentos: selección inicial Programado en formulario, sin marcar un estado como guardado antes de hacerlo.
- Estados previos de otras bases: visualización histórica y aviso para elegir un estado vigente; ninguna conversión automática.
- SQL `estados-revision-v1_15_5_3.sql` para sustituir `CHECK` y `DEFAULT` en `document_reviews`.
- No cambia navegación, consultas públicas, autorización de edición, exportaciones ni sincronización de datos.

## V1.15.5.2 · Lectura directa y simplificación de interfaz

- Inicio sin Google OAuth, consulta GET sin identidad de las cuatro publicaciones y bitácora documental.
- OAuth de identidad exclusivo para modificar Documentos Clave, sincronizar, cotejar o publicar; Drive OAuth solo al importar archivos privados.
- Identificadores de fuente, lote, hoja y columna ocultos en las vistas operativas. Eliminación del bloque «Fuente del Flujo de actividades».
- Controles visibles «Datos publicados» y «Recargar vista». Submenú En desarrollo sin cambios.
- Eliminación de bloqueos de lectura por cotejos locales de Excel: la comparación permanece en Sincronización de datos.
- API de escritura protegida; lectura pública exige protección externa del despliegue cuando los datos sean privados.
- Sin SQL nuevo. 97 pruebas automatizadas y build aprobados.

## V1.15.5.1 · Separación de identidad, lectura Neon y Drive

- Lecturas de Neon con `openid email`; sin permiso `drive.readonly`.
- Autorización independiente para lectura de Drive, únicamente en Sincronización de datos.
- Nueva API `api/sesion.js`, validación centralizada en `autorizacion-servidor.js`.
- Rol lector opcional con `DASHBOARD_VIEWER_EMAILS`; listas de editores intactas.
- APIs de lectura admiten lector; `status`/`preview`/publicación y edición permanecen reservados a editor.
- Documentos Clave y bitácora conservados; pantalla de revisión en solo lectura para lectores.
- Sin cambios SQL; 89 pruebas automatizadas y build aprobados antes del empaquetado.

## V1.15.5 — Consolidación Neon

- Resumen táctico como página principal y carga de datos de Neon en los cuatro módulos publicados.
- Eliminación de lectura de Google Sheets y selectores de fuentes en vistas operativas; actualización de hojas exclusivamente desde Sincronización de datos.
- Resumen ejecutivo, Sistemas, Integraciones, Endpoints y Datos técnicos agrupados en submenú En desarrollo.
- Conservación de la bitácora, incidencias, versiones y revisiones de Documentos Clave.
- OAuth obligatorio y autorización manual si el acceso silencioso está bloqueado por el navegador.
- Sin nuevas migraciones SQL ni alteración de tablas de Neon.

# V1.15.4.1 — Corrección de publicación de Flujo de actividades

- Botón de publicación siempre responde al clic (salvo operación en curso).
- Cotejo actual de Drive y copia Neon integrado en la misma acción, con confirmación posterior.
- Avisos de bloqueo y errores junto a la tarjeta de Flujo de actividades.
- Actualización del estado después de guardar copia; verificación de publicación efectiva en la API.
- Sin cambios de esquema ni de fuentes de las demás pestañas.

# V1.15.4 · Flujo de actividades en Neon

- Migración gradual de `EtapaActividadIntegracion` que preserva vías, pasos, etapas, actividades y enlaces, incluidas actividades sin integración.
- Modelo y relaciones auditables en Neon, con verificación de checksum y lote publicado de Resumen táctico.
- Cotejo y publicación explícitos, selector Google Sheets/Neon y reversión independiente.
- Conserva filtros de severidad (Crítica, Alta, No priorizadas y Sin correspondencia); no altera las demás pestañas.
- SQL aditivo `flujo-actividades-v1_15_4.sql` y guía de instalación `GUIA_MIGRACION_V1_15_4.md`.

---

# V1.15.3 · Integraciones por vía en Neon

- Tablas aditivas de asociaciones vía–etapa–integración, metadatos de publicación y auditoría.
- Cotejo de IntegracionesEtapa con su última instantánea, utilizando los estados de tactical_tracking de Neon.
- Publicación bajo autorización, verificación de checksum y versión del Resumen táctico; no duplica estados.
- Lectura opcional desde Neon; comparación paralela y cambio reversible a Google Sheets.
- Conserva orden de etapas, deduplicación por integración, severidad y diapositivas PowerPoint.
- Flujo de actividades mantiene su fuente anterior; no se modifican tablas documentales.

---

# V1.15.2 · Resumen táctico a Neon · 27/10/2026

- Tablas `tactical_tracking` y `tactical_migration_events` con migración SQL aditiva y control por módulo.
- Cotejo y publicación reversibles del seguimiento táctico desde una copia preliminar que coincida con el archivo Google actual.
- Los datos y formatos se interpretan con el parser original, se conservan las bitácoras extensas, las alertas y las clasificaciones.
- Vista Resumen táctico con elección Google Sheets / Neon y misma exportación PPT.
- Integraciones por vía y Flujo de actividades mantienen Google Sheets independientemente de la fuente del Resumen táctico.
- La nueva SQL se entrega para ejecutar en Neon Development; no se realiza publicación automática.

---

## V1.15.0 · Infraestructura de sincronización hacia Neon

- Línea base acordada V1.15.0–V1.15.5 documentada en `LINEA_BASE_DESARROLLO.md`.
- Importación preliminar de las hojas `CatalogoDocumentos`, `Seguimiento`, `IntegracionesEtapa`, `EtapaActividadIntegracion` con validación, checksum, auditoría, historial y comparaciones de filas.
- Nueva pestaña «Sincronización de datos»; la pestaña documental pasa a denominarse «Documentos Clave».
- Neon contiene solo copias preliminares en nuevas tablas `migration_*`; las fuentes operativas siguen bloqueadas en Google Sheets.
- Se conserva la API y tablas preexistentes de incidencias y revisiones. No requiere nuevos secretos.
- Añadidos scripts `npm test` y `npm run build` (validación sintáctica de entrada).
- Ver `GUIA_MIGRACION_V1_15_0.md` para instalación, operación y recuperación.

---

# Historial de versiones

- **V1.4** · Referencia estable histórica. Observaciones GTI y SOFTPLAN visibles por niveles.
- **V1.5.1** · OAuth Google Drive privado.
- **V1.6** · Catálogo fijo de 36 integraciones Laboral.
- **V1.7** · Vista de todas las integraciones y filtro Laboral.
- **V1.8** · Indicadores independientes de desarrollo estimado y validación.
- **V1.8.1** · Leyenda de cálculo auditables, con operaciones explícitas.
- **V1.9 (por validar)** · Resumen táctico por criticidad Alta/no priorizada, segunda fuente de Google Drive y lectura de columna L con relleno verde.

- **V1.9.1**: límite de lectura Seguimiento hasta fila 36; fichas sin referencias de columna; alertas rojas por fechas «Por informar» o «Revisión con…».

- **V1.9.2**: filtro táctico Todas / Crítica / Alta / Ciclo 2 / Ciclo 2/3 / Funcionalidad para Ciclo 1 / Manual / No aplica integración; agrupación dinámica, contador por categoría, sin duplicar críticas en altas. No altera OAuth, Excel técnico ni alertas de fecha.


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


## V1.9.6 · Exportación fiel y sin recorte de listas

- Se ajustan las coordenadas, fuentes y colores a `Diapo_Resumen(1).pptx`.
- El bloque Manual permanece siempre e informa el total real de D = Manual, al margen del filtro elegido.
- Se generan láminas de continuación sin descartar nombres por límite fijo de registros.
- Se respeta la legibilidad de nombres largos y se muestran otros estados cuando corresponda.
- PptxGenJS se incluye localmente y se incorporan pruebas de paginación.


## V1.9.7 · Entidad literal desde Excel

- Se corrigió la leyenda Entidad en el PPTX: ahora procede de la columna E sin combinar valores de distintas filas ni dividir textos que contienen `/`.
- Si hay distintas entidades en un mismo panel, aparecen junto a cada integración y no se atribuyen todas a una cabecera común.
- Se quitó el valor por defecto `PJ` en el cuadro Manual.
- Se añadieron pruebas de correspondencia desde `Seguimiento!E` hasta la exportación.

## V1.9.8
- Exportación PowerPoint siempre de una sola diapositiva, sin paginación.
- Continuación de listas dentro de la misma lámina, usando zona inferior.
- Texto morado únicamente con categoría `critica`; no se aplica en Alta ni en otras categorías.
- Manual y Entidad desde Seguimiento!E preservados.


## V1.9.9 · Agrupación fiel al estado de Seguimiento

- El exportador ajusta fuente y distribución en cada bloque antes de mover un nombre por falta de espacio.
- El cálculo de altura respeta la leyenda Entidad: si todas las filas del cuadro comparten E, no se repite el texto en cada registro.
- «Estados sin clasificar» corresponde exclusivamente a estados D no contemplados entre Validada, Por validar, En pruebas, En desarrollo y Manual.
- Solo ante una lista físicamente demasiado extensa se muestra «Continuación por estado» (sin cambiar la clasificación ni el contador).
- Regresión específica: las siete Validadas, incluida MPE - Redireccionamiento, permanecen en su cuadro original.
- Se mantienen la diapositiva única, los colores por filtro, el cuadro Manual y la fuente E literal.

### V1.10 · Integraciones por vía
- Nueva pestaña con integración, vía y etapa; listas y pendientes (Seguimiento), filtro de severidad y trazabilidad de coincidencias.
- Exportación de PowerPoint: una diapositiva por vía, individual o conjunta, con el estilo institucional de `Integracionxvia.pptx`.
- Conserva Resumen táctico y la exportación de estados de la V1.9.9.

### V1.10.1 · Recuperación guiada del mapeo
- Diagnóstico de cabeceras y primeras filas cuando `IntegracionesEtapa` no se reconoce.
- Mapeo manual local de columnas/encabezado sin volver a solicitar OAuth.
- Soporte adicional para matrices por etapa, vías como columnas y secciones.
- Errores visibles, conservando el PowerPoint por vía, estados y filtros de la V1.10.

### V1.10.2 · Indicadores claros por vía
- Se ordena «Conflicto de autoridad»: Recepción antes de Trámite.
- Se eliminan cantidades repetidas en los encabezados de las etapas web y PowerPoint.
- Se exponen únicamente dos totales de integraciones únicas: listas y pendientes, para la vía y filtro de severidad seleccionados.


## V1.10.3 · Encabezados de pendientes alineados

- En el PowerPoint de **Integraciones por vía**, la línea divisoria y el título **«Integraciones Pendientes»** se ubican en una altura común para todas las etapas de una misma fila.
- La posición deja de depender del volumen de integraciones listas de cada etapa.
- Se conservan las listas originales, los dos indicadores globales, los filtros, la secuencia de etapas y el fondo institucional.
- Se agrega la prueba de regresión `tests/via-pending-alignment.test.mjs` para presentaciones de una y dos filas de etapas.


## V1.11.0 · Nueva vista de flujo por actividades

- La V1.10.3 queda identificada como **base estable**, preservada sin cambios.
- Se agrega la pestaña **Flujo de actividades** alimentada por `EtapaActividadIntegracion`, columnas A (Vía), B (Paso), C (Etapa), D (Actividad) y E (Integración opcional).
- Navegación por paneles desplegables **Vía → Paso → Actividad → Integraciones**.
- Las integraciones se clasifican en **Listas** y **Pendientes** utilizando únicamente el estado de `Seguimiento`, con filtros de severidad heredados.
- Actividades sin integración E permanecen visibles, sin contabilizarse como pendientes.
- Totales únicos por vía, sin duplicar una integración asociada a varios pasos o actividades.
- Se conserva todo el flujo funcional y PowerPoint por vías de V1.10.3.
- Prueba específica: `tests/actividad-flujo.test.mjs`.


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


## V1.13.0 – Catálogo documental (fase 1)
- Nueva pestaña Control documental.
- Lector flexible y diagnóstico para CatalogoDocumentos.
- Búsqueda, filtros, ficha de atributos, controles de calidad de fuente y lectura privada/reaprovechamiento OAuth.
- Carga local alternativa del catálogo. Preserva el resto de las funcionalidades y la V1.10.3 como referencia estable histórica.
- No se implementa todavía la edición de incidencias o aprobación de documentos.


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

### V1.14.0 — Etapa 2, bitácora documental
- API `/api/incidencias`: consulta por código, creación y actualización con control de acceso OAuth y lista de editores.
- Persistencia Neon y `bitacora-schema.sql`, historial de eventos de creación, comentario y modificación.
- Formulario de observaciones por documento, filtro por código, responsables, fechas compromiso y evidencias HTTPS.
- Mantiene catálogo documental de A/B, resto del tablero y exportaciones PowerPoint existentes.
- Requiere configurar variables privadas y ejecutar migración en Neon antes de su uso real.

## V1.14.1 · Corrección de Cod Documento
- `Cod Documento` conserva la distinción `4.1` / `4.10` / `4.100` cuando el origen es texto o contiene un formato numérico recuperable.
- Importación XLSX: lectura de formatos de celda de `CatalogoDocumentos`, incluidos los formatos numéricos estándar de Excel.
- Aviso y bloqueo preventivo de bitácora para códigos numéricos ambiguos (ceros originales irrecuperables).
- API de bitácora: exige que `documentCode` se envíe como cadena y no como número.
- Esquema Neon y OAuth sin cambios.


## V1.14.2 · Detalle en línea y edición habilitada de la bitácora
- Ficha documental expandida bajo la fila del inventario, sin desplazamiento al pie.
- Formulario editable visible al examinar; autorización Google necesaria solo para consultar/guardar.
- Eliminado bloqueo preventivo por formato numérico ambiguo cuando el código es único; se conserva detección de duplicados y lectura textual de códigos completos.
- Borrador conservado durante recargas del panel y autenticación; estilos adaptables al espacio disponible.


## V1.14.3 · Configuración real de bitácora y seguimiento en Neon

- El catálogo de dos columnas omite avisos informativos genéricos por códigos numéricos y columnas inexistentes de estado o versión; permanece la protección contra códigos duplicados.
- Nuevo diagnóstico local `/api/incidencias?diagnostico=1` con presencia booleana de las tres variables de servidor, sin exponer secretos y deshabilitado en producción.
- La API distingue variables faltantes de los errores de autenticación de Google, migración SQL y conexión a Neon. El formulario muestra el error al lado de la ficha, sin deshabilitar permanentemente los botones.
- Se incorporan `document_reviews` (versión/estado por `Cod Documento`) y `document_review_events` (auditoría); migración aditiva idempotente incluida.
- La validación formal del documento queda fuera del alcance de esta etapa.


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


## V1.15.1 · Documentos Clave en Neon (publicación opcional)
- Catálogo normalizado y trazable con comparación por código y nombre.
- API autenticada para previsualizar, publicar y regresar a Google Sheets.
- Lectura seleccionable desde la pestaña Documentos Clave, por defecto Google Sheets.
- Conservación de bitácora, versiones y estado documental en tablas existentes.
- La migración SQL de esta versión es adicional a la de V1.15.0.


## V1.15.1.1 · Corrección de longitud de bitácoras y controles de sincronización

- **Seguimiento!G (Estado situacional)** admite hasta **120.000 caracteres** por celda; no se trunca el texto, se preservan saltos de línea y se mantiene intacta la copia inmutable.
- **Seguimiento!M (Consideraciones)** admite hasta **60.000 caracteres**. Los campos breves tienen un límite de **12.000** y las demás columnas un límite seguro adaptado a su uso. Los otros módulos admiten hasta **24.000 caracteres** por celda, y el catálogo mantiene controles especiales para código y nombre.
- Se revisó el libro táctico actual: G8=4.589, G9=4.353, G17=3.994, G18=3.210 y G19=2.637 caracteres. Estas cinco celdas superaban el máximo antiguo de 1.800. Ninguna otra columna de Seguimiento superaba 1.800.
- El límite de carga total por importación se aumenta a **3,2 MB** (validación cliente/servidor), bajo el umbral de Vercel para solicitudes de funciones. Si el archivo supera el máximo, se informa de forma explícita y NO se recorta la información.
- **Comparar** y **Guardar copia en Neon** se habilitan cuando su hoja de origen está cargada, sin depender de una consulta previa de estado. **Historial** abre la consulta a Neon aunque no exista un estado precargado. Si fallan autorización/SQL/conexión, se muestra el error dentro de su módulo.
- Una importación guardada exitosamente **no se declara fallida** si únicamente falla la recarga posterior de indicadores.
- Se añade a Validar un diagnóstico del máximo de caracteres de G y M y del tamaño real de la copia.
- **No hay cambios de esquema SQL, credenciales, tablas o fuentes operativas.** Mantener los scripts de migración V1.15.0 y V1.15.1 ya aplicados en Neon Development. Google Sheets sigue siendo la fuente de lectura de los módulos no migrados.
