# Tablero de Integraciones PJ · V1.8 — Desarrollo y validación documentada

## Objetivo

Se mantiene la V1.7 y se incorpora al filtro **Especialidad → Laboral** un panel con dos indicadores **separados** y un apartado desplegable «¿Cómo se calculan estos indicadores?».

**Indicador 1: Avance estimado de desarrollo**
- Fuente: hoja `Sistemas` del Excel técnico de SOFTPLAN, cargado desde Google Drive privado o por archivo.
- Unidad: componentes técnicos únicos de los sistemas vinculados al catálogo fijo de Laboral. PIDE se contabiliza una sola vez aunque CONADIS y SUNAT lo compartan.
- Se usan las etapas existentes y sus *pesos de referencia propios del tablero*:

  | Estado | Peso |
  |---|---:|
  | Pendiente | 0 % |
  | En análisis | 20 % |
  | En revisión | 35 % |
  | En desarrollo | 55 % |
  | Enviado a calidad | 80 % |
  | No requiere modificación | 100 % |

- Fórmula: `REDONDEAR(SUMA(n.º componentes por estado × peso) / n.º componentes con estado evaluable, 0)`.
- Se excluyen los componentes sin estado evaluable, se informa su cantidad y **no se les asigna 0 %**.
- No es un porcentaje certificado de desarrollo, ni acredita que pruebas o despliegues hayan concluido.

**Indicador 2: Validación con conformidad documentada**
- Fuente: **hoja opcional** `Validaciones` o `Validaciones Laboral` en el MISMO Excel técnico de Google.
- El archivo técnico compartido inicialmente no contiene una hoja con ese registro, así que el tablero muestra **N/D** (no calculable), **no** un 0 % que pueda interpretarse como ausencia de pruebas reales.
- Denominador fijo: 36 integraciones del catálogo de Laboral (`Lista_Integraciones.xlsx`, Sheet2, incorporado como `catalogo-fijo.js`).
- Numerador: integraciones que cumplan las **cuatro condiciones**: resultado de pruebas aprobado, referencia de evidencia de pruebas, conformidad otorgada, referencia de evidencia de conformidad.
- Fórmula una vez exista la hoja: `REDONDEAR(integraciones acreditadas / 36 × 100, 0)`.
- No se considera evidencia: «Enviado a calidad», datos/ambientes de prueba, disponibilidad, enlaces a análisis técnico, referencias vacías o «NO APLICA».
- Una hoja presente pero sin integraciones acreditadas mostraría `0 %` **de conformidades acreditadas por la fuente**, sin afirmar que no se hayan ejecutado pruebas.

### Formato opcional de «Validaciones»

Se puede copiar `plantilla_validaciones_laboral.csv` a Google Sheets como **una nueva pestaña** llamada `Validaciones` dentro del documento técnico privado. Mantener exactamente estas columnas (sin importar mayúsculas ni tildes):

`Integración`, `Resultado de pruebas`, `Evidencia de pruebas`, `Conformidad`, `Evidencia de conformidad`

- `Resultado de pruebas`: `APROBADA` / `APROBADO` (u `CONCLUIDA APROBADA`).
- `Evidencia de pruebas`: identificador de acta, ticket, enlace a documento de resultados u otra referencia comprobable.
- `Conformidad`: `CONFORME` / `APROBADA` / `APROBADO` / `CONFORMIDAD OTORGADA`.
- `Evidencia de conformidad`: enlace, acta o código documental verificable.
- `Integración`: nombre como figura en el catálogo fijo. Se evita asignar evidencias a otra integración por similitud de nombres.
- Los registros duplicados no se suman dos veces y se advierten en la leyenda.

**Seguridad:** el tablero muestra el *estado de acreditación* y la fila de origen; no publica el contenido de documentos de prueba ni secretos. La hoja sigue estando protegida por los permisos OAuth del Excel privado. Las evidencias no se editan en el navegador; se actualizan en el libro de Google y se pulsa «Actualizar Google».

## Prueba local y despliegue

1. Ejecutar `python -m http.server 8080` dentro de la carpeta del proyecto.
2. Abrir `http://localhost:8080` y autorizar la cuenta de Google mediante **Fuentes → Google Drive → Autorizar y leer privado**.
3. En **Especialidad**, seleccionar **Laboral** y abrir el panel «¿Cómo se calculan estos indicadores?».
4. Comprobar los subtotales por etapa, los componentes sin clasificación y el origen de la validación.
5. Desplegar el mismo directorio a GitHub/Vercel. Conserva `config.js` con **solo** el Client ID, nunca el Client Secret.

**No cambian:** OAuth privado, catálogo fijo de 36 integraciones, filtro Todas/Laboral, observaciones GTI/SOFTPLAN, endpoints, equivalencias y documentación técnica.

## Historial

- **V1.4:** base estable histórica.
- **V1.5.1:** lectura OAuth privada.
- **V1.6:** catálogo fijo Laboral.
- **V1.7:** filtro Todas/Laboral y avance estimado por etapas.
- **V1.8:** indicadores separados de desarrollo y validación acreditada, con fórmula auditada en pantalla.
