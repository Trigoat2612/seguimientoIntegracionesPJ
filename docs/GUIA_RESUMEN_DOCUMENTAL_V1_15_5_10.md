# V1.15.5.10 · Paneles resumen de documentos

La vista presenta, en una fila responsiva, los cinco indicadores originales: Documentos registrados, Con seguimiento, Atención prioritaria, Validados y Sin seguimiento. El total general se mantiene visible incluso cuando es cero; los otros paneles se renderizan solamente con cantidad > 0. Se mantiene debajo la distribución de documentos por estado, mostrando únicamente categorías no vacías.

Los datos provienen de Neon y se recalculan al actualizar la vista, sin introducir números fijos. No se reintroduce la tabla ni los filtros ni alertas.

**Verificación:** `npm test` y `npm run build`. **Despliegue:** actualizar en Vercel conservando variables de entorno; no se necesita SQL.
