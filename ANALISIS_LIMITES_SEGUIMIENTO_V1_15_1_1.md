# Evaluación de tamaño de las columnas de `Seguimiento`

## Origen

Se inspeccionó la hoja **Seguimiento** del libro privado `Lista_Integraciones.xlsx`, consultado el 27/10/2026. El recuento se realizó sobre los valores completos de las celdas del archivo XLSX (no sobre capturas ni textos truncados). No se modificó el archivo de origen.

## Columnas funcionales

| Columna | Uso | Máximo observado (caracteres) | Límite anterior | Nuevo límite de sincronización |
|:--:|---|---:|---:|---:|
| B | Integración | 71 | 1.800 | 12.000 |
| D | Estado / clasificación | 75 | 1.800 | 12.000 |
| E | Dependencia | 14 | 1.800 | 12.000 |
| G | Estado situacional, bitácora acumulativa | 4.589 | 1.800 | 120.000 |
| H | Cierre de desarrollo | 20 | 1.800 | 12.000 |
| I | Cierre de pruebas | 30 | 1.800 | 12.000 |
| J | Validación GSJ | 16 | 1.800 | 12.000 |
| L | Criticidad | 10 | 1.800 | 12.000 |
| M | Consideraciones | 272 | 1.800 | 60.000 |

Cinco celdas de G superaban el límite: **G8=4.589, G9=4.353, G17=3.994, G18=3.210, G19=2.637** caracteres.

## Criterios

- El Estado situacional es una **bitácora histórica**; los cambios deben preservar íntegros su contenido y los saltos de línea.
- El límite por celda se complementa con **3,2 MB para la copia completa**, calculados en UTF-8, por debajo del límite de carga de funciones Vercel. El tamaño total protege la API, no reemplaza un diseño futuro de importación paginada.
- La columna G del Excel sigue siendo texto en `migration_batch_rows.cells` (JSONB). **No se requiere ALTER TABLE ni cambio de tipo**, pues JSONB no tiene un límite de 1.800 caracteres para el campo de texto.
- El tablero operativo continúa procesando las **primeras 36 filas** del seguimiento, como en versiones anteriores. La copia preliminar guarda la hoja completa para auditoría.
- Las opciones Comparar y Guardar copia ya no esperan un GET previo para habilitarse. Si Neon requiere una migración SQL, aparecerá un error concreto en el bloque correspondiente.

**Estado de esta actualización:** corrección funcional implementada y probada por unidad/build; escritura real en la rama Neon Development pendiente de la ejecución en el entorno privado del usuario.
