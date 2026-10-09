# Tablero de Integraciones PJ · V1.7 — Filtro de especialidad

## Qué cambia

- **Base de trabajo:** V1.6. Se conserva íntegro el comportamiento de OAuth privado con Google Drive, las observaciones GTI/SOFTPLAN y el catálogo fijo de Sheet2.
- **Filtro global:** en la parte superior, «Especialidad» permite elegir **Todas las integraciones** (predeterminado) o **Laboral · 36 integraciones**. No hace falta importar otra vez el Excel de Laboral.
- **Vista Todas:** tras autorizar Google o cargar el Excel técnico, muestra las **42 integraciones/sistemas** registrados en la fuente original, con los 94 endpoints/operaciones documentados. No se asigna una especialidad a los demás registros, pues solo Laboral está identificada explícitamente.
- **Vista Laboral:** muestra las **36 filas de Sheet2**, en su orden original, incluso sin conexión a Google. Vincula sus estados y operaciones con los 35 sistemas técnicos distintos del Excel SOFTPLAN. CONADIS y SUNAT comparten PIDE y **no se duplican sus componentes** en el progreso global.
- El filtro se aplica a **Resumen ejecutivo, Sistemas, Integraciones, Endpoints y Datos técnicos**. La exportación CSV de integraciones técnicas, endpoints, atributos y observaciones también respeta el filtro. Los datos del catálogo fijo no se alteran.
- **Progreso de Laboral:** indicador visible en Resumen ejecutivo e Integraciones. Promedio de etapas por **componente único** vinculado en `Sistemas`, excluyendo sin estado evaluable. Escala: pendiente 0 %, análisis 20 %, revisión 35 %, desarrollo 55 %, enviado a calidad 80 %, no requiere modificación 100 %.
- **Este porcentaje es referencial, NO equivale a pruebas aprobadas, implementaciones concluidas ni conformidad.** Las integraciones sin datos técnicos no se consideran 0 %.

## Validación contra archivo SOFTPLAN de referencia (09/10/2026)

| Indicador | Todas | Laboral |
|---|---:|---:|
| Integraciones en listado | 42 | 36 |
| Sistemas técnicos únicos | 42 | 35 |
| Endpoints y operaciones | 94 | 87 |
| Componentes | 58 | 48 |
| Componentes con etapa evaluable (Laboral) | — | 44 |
| Avance estimado Laboral | — | 54 % |

Estos valores dependen de la versión del Excel técnico que se cargue desde Google. Las 36 filas de Laboral no cambiarán mientras no se actualice expresamente `catalogo-fijo.js`.

## Puesta en marcha

1. `python -m http.server 8080` en esta carpeta y abrir `http://localhost:8080`.
2. En Fuentes → Google Drive, autorizar con la cuenta permitida; o cargar el Excel `.xlsx` localmente.
3. Ver **Todas las integraciones**, luego seleccionar **Laboral** en el filtro superior.
4. Comprobar la barra de progreso estimado y el listado de 36 en **Integraciones**.
5. Para Vercel, sustituir los archivos en GitHub y desplegar como sitio estático con la función `/api/drive` heredada.

## Seguridad y limitaciones

- Mantener el Excel privado; OAuth se efectúa en el navegador y el token queda solo en memoria.
- **No subir ningún Client Secret** a GitHub o Vercel. Solo es público el OAuth Client ID (en `config.js`).
- El catálogo fijo distribuido como JavaScript es visible para cualquier visitante del sitio. Protege el acceso a la aplicación si su contenido es reservado.
- Las observaciones manuales se guardan localmente por navegador, no en Drive.
- En el entorno de construcción se comprobó sintaxis JavaScript y lógica con el modelo extraído del Excel original; la prueba visual de Chromium no pudo ejecutarse porque el entorno bloquea conexiones localhost.

## Historial

- V1.4: base estable histórica (comentarios GTI y SOFTPLAN visibles).
- V1.5.1: fuente privada y OAuth.
- V1.6: catálogo fijo Laboral de 36 integraciones.
- **V1.7: selector global Todas/Laboral y avance agregado por especialidad.**
