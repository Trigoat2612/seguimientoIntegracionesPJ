# V1.15.5.8 · Resumen documental simplificado

## Vista
En «Resumen documental» se presenta exclusivamente:
1. **Total de documentos:** cantidad de documentos activos del catálogo publicado.
2. **Documentos por estado:** distribución por el último estado de la bitácora publicada (Observado, Pendiente, Programado, En proceso de firma, Entregado y Validado). Si un documento aún no tiene un estado publicado, aparece en «Sin estado» para conservar el total.

Ya no se muestran los indicadores «Con seguimiento», «Atención prioritaria» o «Sin seguimiento», ni anotaciones, alertas, filtros, listado o detalles.

Los datos siguen consultándose en Neon con el endpoint existente. No se modifican ni el catálogo ni los registros de seguimiento. El botón «Actualizar» vuelve a consultar la publicación. No requiere SQL adicional.
