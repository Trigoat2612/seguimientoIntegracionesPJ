# V1.15.5.4 · Ordenamiento y mantenimiento

## Cambios realizados

- Se extraen los modelos reutilizables a `src/shared/` (documentos, táctica, vías, flujo y sincronización).
- Los módulos visuales, funciones auxiliares, exportadores y recursos se agrupan bajo `src/client/`.
- Las funciones de Vercel siguen ubicadas en `api/`, separadas de `src/server/`.
- Scripts SQL reunidos en `database/migrations/`, sin modificaciones a la estructura de Neon.
- Guías históricas movidas a `docs/guides/`, análisis a `docs/analysis/` y README anterior preservado en `docs/historical/`.
- `public/` se genera de forma determinista con un listado de dependencias web; no se empaqueta como fuente.
- Se separaron formatos auxiliares y definición de navegación del archivo principal.
- Se ajustaron rutas del HTML, de módulos ES, de las pruebas y de los recursos de exportación PowerPoint.

## Compatibilidad

Se conservan los cuatro módulos con lectura desde las publicaciones de Neon, la sincronización manual, la protección de escritura, las exportaciones, las bitácoras y los tres estados de revisión documental. No se modifican tablas ni datos.

## Cómo comprobar

```powershell
npm install
npm test
npm run build
npx vercel dev
```

Revisar las cuatro pestañas, una ficha de Documentos Clave, el flujo de autorización de edición y dos exportaciones PPT. Estas últimas requieren validación visual en el navegador (la suite automatizada verifica rutas y contratos, pero no sustituye una inspección de la diapositiva exportada).

Si se actualiza una instalación que usaba archivos JavaScript en la raíz, reemplazar **toda la carpeta fuente**, no mezclar archivos antiguos con la nueva estructura. Mantener las variables privadas y configuración de despliegue propias del entorno.
