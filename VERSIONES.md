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
