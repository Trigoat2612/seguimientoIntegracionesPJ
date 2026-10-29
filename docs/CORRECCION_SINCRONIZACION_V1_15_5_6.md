# Corrección V1.15.5.6 · Validación de origen de Excel

## Diagnóstico

La validación estricta exigía un `string` en cada posición de `rows`. El parser XLSX crea arrays dispersos cuando el archivo no contiene una celda física; `array.map()` conserva esos huecos y `JSON.stringify()` los convierte en `null`. El API rechazaba entonces la importación/ comparación, por ejemplo: `Fila 2, columna 6: el valor debe ser texto`.

Se revisó el archivo `Lista_Integraciones.xlsx` proporcionado por el usuario. Las cinco hojas requeridas existen. En esta copia concreta, F2:F5 de `Seguimiento` figuran como celdas vacías explícitas, de modo que **el mensaje original de F2:F5 no se reproduce exactamente**; sí se reprodujo el mismo defecto en la hoja `bitacoraDocumentosClave`, que la versión original rechaza en E43, E47, E48, E49, E51, E52 y E53. La corrección abarca ambos casos.

## Cambio de código

- `src/shared/sync/sincronizacion-modelo.js`: `makeSheetSnapshot()` densifica filas y celdas dispersas usando `Array.from` y representa las celdas omitidas como cadenas vacías. `validateSheetSnapshot()` también densifica las filas y acepta `null`/`undefined` **solo como vacío**, rechazando valores numéricos/booleanos indebidos en instantáneas entregadas directamente al servidor.
- `src/client/ui/sincronizacion-ui.js`: actualización del identificador visual a V1.15.5.6.
- `tests/sincronizacion-celdas-vacias.test.mjs`: regresiones de celdas F omitidas, celdas E vacías en bitácora, transporte JSON, códigos 4.1/4.10 y tipos inesperados.

## Resultado con el Excel recibido

| Módulo | Hoja | Resultado tras corrección |
| --- | --- | --- |
| Resumen táctico | `Seguimiento` | Válido; 44 filas no vacías, 1000 posiciones de hoja mantenidas. Aviso sobre filas posteriores a la 36. |
| Integraciones por vía | `IntegracionesEtapa` | Válido; 404 filas no vacías. |
| Flujo de actividades | `EtapaActividadIntegracion` | Válido; 81 filas no vacías. |
| Documentos Clave | `CatalogoDocumentos` | Válido; 40 filas no vacías. |
| Bitácora de Documentos Clave | `bitacoraDocumentosClave` | Válido; 55 filas no vacías. Se mantienen avisos sobre estados históricos y fechas vacías. |

Los conteos de esta tabla corresponden a posiciones de fila en la hoja (incluido el encabezado), **no** a cantidades de integraciones únicas ni registros publicados. La validación fue local con la fuente proporcionada, sin consultar ni modificar Neon.

## Pruebas y despliegue

- `npm test`: 116 pruebas aprobadas.
- `npm run build`: compila la interfaz estática y verifica la separación entre cliente y funciones de servidor.
- No se han alterado datos del Excel, registros Neon, scripts SQL, contratos API ni credenciales.
- Desplegar el proyecto corregido en Vercel y volver a cargar la fuente en **Sincronización de datos**. Ejecutar primero **Validar**, luego **Comparar**. La publicación en Neon continúa requiriendo autorización y confirmación.
- No se requiere ninguna migración SQL para esta corrección.
