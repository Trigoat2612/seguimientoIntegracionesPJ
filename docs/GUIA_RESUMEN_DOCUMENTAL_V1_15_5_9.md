# V1.15.5.9 · Resumen documental por estado

La vista muestra el total de documentos activos. La distribución renderiza solamente estados con cantidad > 0. Esto incluye «Sin estado» cuando se contabilizan documentos sin estado. Si no hay estados positivos, muestra un aviso de ausencia de datos.

No se muestran indicadores de seguimiento, anotaciones, alertas, filtros ni listas de fichas. Los valores son dinámicos y provienen del catálogo y la bitácora publicados en Neon.

Para verificar: `npm test` y `npm run build`. No requiere cambios en la base de datos.
