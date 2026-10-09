# Tablero de Integraciones PJ · V1.5.1 (OAuth privado)

**Base estable**: V1.4, sin cambios en el modelo, navegación Sistema → Integración → Endpoint, observaciones GTI/SOFTPLAN, atributos ni exportaciones.

## Corrección de errores locales

- Se elimina la llamada anónima `/api/drive` al abrir el tablero: el archivo es **privado** y debe solicitar acceso OAuth.
- El botón «Actualizar Google» utiliza el mismo acceso privado; si hay una sesión activa, vuelve a descargar el libro.
- El botón «Leer Drive público» se oculta mientras esta configuración privada está activa.
- El Client ID de Google OAuth Web se configuró en `config.js`. **Ningún Client Secret ni token fue incluido**.
- Favicon SVG integrado para evitar el 404 de `/favicon.ico`.

## Cómo ejecutarlo en localhost

1. En Google Cloud Console → Google Auth Platform → Clients, confirma que tu OAuth Web Client permita el origen `http://localhost:8080`.
2. Verifica que Google Drive API esté habilitada y tu cuenta esté en **Usuarios de prueba** si la app está en modo pruebas.
3. En esta carpeta, ejecuta `python -m http.server 8080`.
4. Abre **exactamente** `http://localhost:8080` (no `127.0.0.1`, salvo que también esté autorizado en Cloud).
5. Selecciona **Fuentes → Google Drive → Autorizar y leer privado** y concede permiso de lectura.
6. Comprueba el inventario, endpoints y observaciones. Las próximas actualizaciones, cada 15 minutos, dependen de que la pestaña permanezca abierta y el token siga vigente.

No necesita `vercel dev` ni la función `/api/drive` para la lectura privada: el navegador consulta Google Drive API directamente usando OAuth. El servidor Python sigue siendo válido para servir HTML/JS/CSS.

## Seguridad

**Revoca/regenera el Client Secret entregado en la conversación** desde Google Cloud. Este proyecto no lo necesita; evita incluir ese JSON en GitHub, Vercel o el frontend. La autenticación usa solamente `client_id` y un token temporal en memoria del navegador.

## Limitaciones

- No puede validar el consentimiento real ni leer el documento privado sin que el propietario otorgue acceso.
- No sincroniza observaciones manuales entre usuarios. Se guardan en localStorage y pueden exportarse a JSON.
- Un token vencido exige volver a autorizar. En Google Auth Platform deben estar habilitados los permisos solicitados `drive.readonly` y el usuario de prueba.
- El modo de prueba de Google OAuth no debe tratarse como un mecanismo de autenticación institucional permanente.

Para documentación del modelo y de las versiones anteriores, consulta `VERSIONES.md` y el README de la V1.5 original.

---

## Documentación técnica heredada V1.5

## Versiones y estabilidad

- **Base estable: V1.4 — Comentarios GTI/SOFTPLAN visibles**. Se conserva inalterada como respaldo y punto de recuperación: `tablero_integraciones_pj_v1_4_comentarios_visibles.zip`.
- **V1.5 — Fuente Google**: introduce únicamente configuración de fuente por defecto, recarga y soporte público de Google Sheets/.xlsx, además del acceso privado preexistente mediante OAuth. Los modelos `model.js`, `hierarchy.js`, `excel-observations.js`, `xlsx.js` permanecen sin modificaciones.

## Fuente Google configurada

Se preconfiguró en `config.js` el documento proporcionado:  
`https://docs.google.com/spreadsheets/d/1GWZBqmUx4Z5WvKWnnqjDfLVQ7LpGzPH6/edit?gid=1721163515#gid=1721163515`

La aplicación intenta **cargarlo al abrirse** y, tras una carga exitosa, lo vuelve a leer cada **15 minutos**, únicamente cuando la pestaña esté abierta y visible. El botón **Actualizar Google** fuerza la actualización. El parámetro `gid` identifica la pestaña abierta en Google, pero la aplicación **descarga el libro completo**, con `Sistemas`, todas las hojas de integraciones, `STORED PROCEDURES`, observaciones y demás pestañas. No lee únicamente el `gid`.

**AVISO SOBRE PERMISOS:** esta configuración no concede acceso por sí sola. Los navegadores no pueden obtener un documento privado sin permisos. No fue posible confirmar los permisos reales del enlace desde este entorno.

- **Google Sheets / Excel público:** en Vercel la función `/api/drive?id=...&kind=spreadsheet` intenta exportar a `.xlsx` todas las hojas, y si no corresponde prueba descargar el Excel de Drive. El archivo nunca se guarda en el repositorio ni se cachea en la función. El requisito de lector público solo es aceptable si no hay datos institucionales sensibles.
- **Google privado (RECOMENDADO para archivos judiciales):** configure `window.DASHBOARD_GOOGLE_CLIENT_ID` en `config.js` con un OAuth Web Client autorizado y habilite Google Drive API. Después de desplegar, pulse **Fuentes → Google Drive → Autorizar y leer privado** e inicie sesión con una cuenta autorizada. La importación y las actualizaciones posteriores usan el token de acceso **solo en memoria del navegador**. La autorización inicial no se puede realizar desatendidamente ni mantener cuando el token vence. La lectura pública inicial fallará hasta que una cuenta autorizada se identifique.
- **Para autenticación automática de múltiples usuarios sin clic:** se necesita otro diseño con backend seguro, sesiones, almacenamiento de credenciales/servicio en servidor y control de acceso al sitio. Esa funcionalidad **no está implementada**.

**Local:** si usa `python -m http.server`, la URL `/api/drive` no existe y la carga pública automática fallará. Para probar el conector público ejecuta `vercel dev` o despliega en Vercel. La carga manual local `.xlsx` sigue funcionando sin backend.

**Fallo de sincronización:** no elimina los datos previamente cargados; el tablero advierte que la última lectura no está sincronizada.

# Tablero de integraciones PJ | Versión 1.5 (Google como fuente predeterminada)

Dashboard estático sin librerías ni CDN externas para leer el archivo **SOFTPLAN - INTEGRACIONES PJ.xlsx** y sus siguientes versiones. Su interfaz permite filtrar integraciones, consultar endpoints/operaciones, equivalencias y atributos con trazabilidad hasta la hoja y fila original, y exportar CSV de integraciones, endpoints y atributos.

## Ejecutarlo localmente

1. Descomprimir el ZIP.
2. En la carpeta del proyecto, ejecutar `python -m http.server 8080` (también sirve VS Code Live Server).
3. Abrir `http://localhost:8080` y presionar **Cargar Excel**.
4. Seleccionar el archivo original `.xlsx`. Los indicadores se calculan al instante.

> Abre por `http://localhost`, **no** con doble clic `file://`, porque el navegador bloquea importaciones JS de módulos.

No necesitas Node.js, npm ni servicios externos para la carga manual.

## Desplegar en Vercel

Sube el contenido del proyecto a GitHub. En Vercel importa el repositorio como proyecto **Other** (framework sin especificar); directorio raíz del repositorio, **Output directory** vacío, sin `npm run build`. Vercel servirá `index.html`, `styles.css`, `app.js`, `model.js`, `xlsx.js` y la función serverless `api/drive.js`.

**No subas el Excel original al repositorio ni a una carpeta `public/`: contiene ejemplos de solicitudes/respuestas y potencial información personal/credenciales.** El tablero inicial es intencionalmente vacío.

## Google Drive público

1. Sube el `.xlsx` a Drive.
2. Comparte como **Cualquier persona con el enlace / Lector**. Esto expone el archivo a quien conozca su enlace, así que NO se recomienda si contiene información judicial o credenciales.
3. En el tablero selecciona **Cargar Excel → Google Drive**, pega el enlace y usa **Leer Drive público**.
4. La función `/api/drive` solamente opera en Vercel; para probarla en local usa `vercel dev` con Vercel CLI y autenticación correspondiente.
5. Puedes activar actualización cada 15 minutos **mientras la pestaña permanezca abierta**.

El endpoint `api/drive.js` solo admite IDs Google Drive y limita el tamaño; no actúa como proxy de URL arbitraria.

## Google Drive privado (recomendado)

1. Crear un proyecto en Google Cloud, habilitar **Google Drive API**, configurar pantalla de consentimiento de OAuth y un cliente tipo **Aplicación web**.
2. Configurar los orígenes JavaScript autorizados, por ejemplo `http://localhost:8080` y `https://tu-proyecto.vercel.app`.
3. En `config.js` definir `window.DASHBOARD_GOOGLE_CLIENT_ID = '...apps.googleusercontent.com';` (el Client ID no es un secreto, nunca coloques Client Secret en frontend).
4. En el tablero pegar enlace del archivo, pulsar **Autorizar y leer privado**, iniciar sesión y dar consentimiento.
5. El navegador descarga el XLSX directamente desde Google Drive con un token en memoria. Ni el archivo ni el token quedan guardados en el servidor del tablero.
6. También permite exportar una **hoja de cálculo Google Sheets nativa** a XLSX usando el mismo flujo privado.

**Nota de seguridad:** `drive.readonly` es un alcance amplio y puede requerir verificación de OAuth/seguridad según el público objetivo. Para una implantación institucional, prioriza OAuth restringido con Google Picker (`drive.file`) y cuentas autorizadas, así como políticas de acceso al sitio.

## Reglas de normalización

- **Sistemas**: inventario y estado por *componente*. Si el estado del componente no está disponible, el tablero hereda el estado de integración **únicamente si no hay varios estados distintos**.
- **Expedientes Judiciales**: separa operaciones `/suprema/` hacia `CEJ Supremo`; el resto se clasifica en `Expedientes Judiciales`.
- **CEJ SUPERIOR**: agrupa por operación API; conserva múltiples métodos legacy asociados y atributos comparados.
- **NFC/NFQ (SERNOT)**: dos componentes y operaciones de lectura/escritura. Filas repetidas de un mismo endpoint se agrupan sin duplicar el conteo.
- **Presidencia Te Atiende, Interoperabilidad PNP, SICMEP, Agenda Móvil Suprema**: rutas, equivalencias, y nombres de atributos cuando los ejemplos permiten inferirlos.
- **Guía de Programación de Audiencias, SIGEM y Estadísticas de Audiencias**: métodos u operaciones sin ruta API verificable permanecen categorizados como tales, no se contabilizan como rutas verificadas.
- **CASILLERO** y **STORED PROCEDURES**: se consultan en «Datos técnicos»; tablas, columnas y procedimientos no se cuentan como endpoints.
- Una equivalencia **No existe** es distinta de **No documentado**. Ni una equivalencia ni el estado «Enviado a calidad» certifican funcionamiento o conformidad.
- Ficha de endpoint conserva referencia `Hoja!Fila` para contraste con archivo original.

## Limitaciones actuales

- No permite colaboración multiusuario, historial/versiones centralizadas ni edición de estados. Para eso se requiere backend, base de datos (PostgreSQL/Neon/Supabase) y autenticación con roles.
- Calcula **avance referencial por etapa** (ver V1.1) pero no conformidad sin actas o resultados de pruebas. Separa *estado del componente*, *equivalencia documentada* y *brecha de atributos*.
- Los atributos de algunas operaciones se **infieren solo como nombres** a partir de estructuras de ejemplo. No se publican los valores, credenciales, cuerpos request/response ni IPs.
- La importación `.xlsx` funciona con ZIP estándar y algoritmos `deflate` o `stored`, en Chrome/Edge actuales; no incluye soporte ZIP64, macros, `.xls` ni evaluador de fórmulas.
- Drive público requiere Vercel y los permisos de lectura adecuados; Google puede bloquear descargas automatizadas en algunos tipos de enlaces.
- El alcance privado usa OAuth en navegador. La actualización automática opera únicamente con la pestaña abierta y un token vigente.

## Estructura de archivos

```
index.html      Interfaz principal
styles.css      Diseño responsive
app.js          Navegación, jerarquía, observaciones, CSV y Google Drive
hierarchy.js    Modelo Sistema > Integración técnica > Endpoint
observations.js Registro de seguimiento manual y validación de respaldos
excel-observations.js Lectura y vinculación de observaciones importadas del Excel
model.js        Reglas para normalizar las 14 pestañas heterogéneas
xlsx.js         Lector XLSX nativo en navegador
config.js       ID de cliente OAuth opcional
api/drive.js    Función serverless pública Vercel
vercel.json     Cabeceras del despliegue
```

## Cambios de V1.1 (correcciones anteriores)

- **Estado por componente:** cuando una integración tiene varios estados, ya no se muestra "Estado mixto"; se enumeran los estados y su número de componentes, según la hoja `Sistemas`.
- **Avance referencial (%):** media simple de los componentes de la misma integración con estado reconocido, aplicando esta escala convencional y **no oficial**:

  | Estado registrado en `Sistemas` | Ponderación de etapa |
  |---|---:|
  | Pendiente | 0 % |
  | En análisis | 20 % |
  | En revisión | 35 % |
  | En desarrollo | 55 % |
  | Enviado a calidad | 80 % |
  | No requiere modificación | 100 % |

  Se omiten del denominador los componentes `Sin estado` y se muestra su cobertura; si ninguno tiene estado reconocido, figura `N/D`. El 100 % de «No requiere modificación» solo indica que el componente no demanda adecuación de desarrollo según ese registro, **no** que el endpoint esté validado, probado o en producción. La escala es un *indicador estimado de etapa* hasta que el proyecto defina hitos formales de aceptación. Los responsables pueden ajustar esta tabla en `model.js` (`STAGE_PROGRESS`).
- **Catálogo de endpoints:** corregido el error de filtrado que descartaba todos los registros por falta de `return true`; adicionalmente, el filtro compara nombres normalizados y, al examinar un sistema, reinicia la búsqueda y los estados anteriores. Es la vista para examinar endpoint, equivalencia, atributos y fila de origen; la opción «Examinar» abre la vista filtrada.
- **Datos técnicos:** corregida la función de deduplicación ausente que provocaba una excepción de JavaScript y dejaba la página vacía. Se visualizan ahora todas las operaciones de la hoja `STORED PROCEDURES` con aplicación, integración vinculada, acción, base de datos, nombre del SP, presencia de SQL y número de fila; también las tablas de `CASILLERO`. Se filtran por integración. No se revelan cuerpos de consultas SQL.
- **Integraciones:** nueva columna «Dependencias BD» para acceder a los procedimientos o consultas SQL relacionados con un sistema. Ni estos registros ni los atributos se cuentan como endpoints HTTP.
- **Exportación CSV:** agrega desglose de estado, avance estimado y dependencias BD.

**Observación importante:** no hay en el Excel evidencia uniforme de pruebas ejecutadas, conformidad ni despliegue por endpoint. Por tanto, este porcentaje **no debe presentarse como porcentaje real o certificado de implementación**.

**Vista de componentes (Sistemas):** en «Resumen ejecutivo» y «Integraciones», pulsa «Ver componentes» para consultar el nombre y tipo, estado original y normalizado, encargado, equipo que atenderá, dependencia SOFTPLAN, GLPI y fila de origen. Los campos no registrados se muestran como no indicados; el indicador de etapa se calcula solo desde los estados normalizados.


## Versión 1.2 · Jerarquía y observaciones de seguimiento

### Interpretación del modelo

| Nivel | Fuente y criterio |
|---|---|
| Sistema | Columna F («Sistema») de `Sistemas`, complementada con integraciones detectadas únicamente en hojas de detalle |
| Integración técnica | Columna G («Componente») de `Sistemas`, dentro del sistema correspondiente; se agrupan registros que tengan el mismo nombre de componente; las filas sin componente explícito no cuentan como integraciones técnicas identificadas |
| Endpoint u operación | Hojas específicas; se vincula a una integración técnica por igualdad de componente, por equivalencia unívoca del nombre base del servicio (p. ej., `-ws` frente a `-ws-rest`) o por prefijo unívoco de ruta |

Los endpoints sin vinculación confirmada se mantienen **dentro del sistema**, en el grupo explícito **«Pendiente de asociación»**, sin presentarlos como integraciones oficialmente registradas. Con el Excel analizado: 42 sistemas, 44 integraciones técnicas con componente nombrado, 94 operaciones/endpoints y 47 sin correspondencia técnica acreditada en la hoja Sistemas. El resultado evita presentar como integraciones técnicas las filas sin nombre de componente. Puede haber sistemas sin rutas detalladas, y no debe inferirse que carecen de servicios.

### Uso

1. Carga un Excel y abre **Sistemas**. Expande el sistema, luego cada integración técnica para desplegar sus endpoints; pulsa **Ficha** para equivalencias, atributos y fuente original.
2. En cualquier nivel pulsa **Ver / añadir seguimiento** (o **Ver comentarios** en los endpoints). Registra descripción, categoría, estado (Abierta / En seguimiento / Resuelta), responsable opcional y fecha automática.
3. En el historial puedes avanzar el estado (Abierta → En seguimiento → Resuelta → Abierta) y eliminar una entrada con confirmación. Los comentarios documentados **en el Excel** se mantienen separados y en solo lectura.
4. Usa **Respaldar observaciones JSON** para descargar las anotaciones y **Importar observaciones JSON** para incorporar un respaldo anterior, conservando por ID las entradas existentes.
5. Una nueva carga de Excel conserva las anotaciones locales, vinculadas por identificadores estables basados en nombre de sistema, componente y ruta; si cambian estos identificadores, los comentarios quedan en el respaldo, pero el nuevo registro no se asocia automáticamente a un nombre diferente.

### Restricciones de persistencia

- Las observaciones se guardan mediante **localStorage**: permanecen entre recargas en el **mismo navegador y perfil**, pero **no** se sincronizan entre usuarios, navegadores o equipos, ni modifican el archivo Excel o Google Drive.
- La exportación JSON es un respaldo y medio manual para intercambiar anotaciones; no existe todavía una fuente de datos compartida o un historial central auditable.
- Al limpiar el almacenamiento del sitio o cambiar de dominio podrían perderse las anotaciones no exportadas. Evita registrar información reservada si el navegador/equipo no está autorizado a conservarla.
- Para trabajo colaborativo institucional, la siguiente evolución debe persistirlas en servidor/BD con permisos, auditoría y usuarios autenticados.

**Validación pendiente:** realizar una prueba de aceptación completa en el navegador con el XLSX original, después del despliegue local; el cálculo de avance sigue siendo solo referencial.


## Versión 1.3 · Observaciones extraídas del Excel

- Al importar Excel o leer una actualización desde Drive, se vuelven a cargar todas las observaciones documentadas. **No hace falta registrarlas a mano**.
- En la pestaña **Sistemas**, las columnas **N: Observaciones GTI** y **O: Observaciones Softplan** se capturan por separado. Cada comentario pertenece al componente de su fila (nivel integración técnica); si la fila no tiene componente, pertenece al sistema. En la ficha del sistema se puede abrir un resumen de las observaciones correspondientes a sus integraciones y endpoints.
- En las hojas de detalle se localizan las columnas llamadas `Observación`, `Observaciones` o `Nueva Observación`: en `expedientes-judiciales-query-ws`, por ejemplo, se leen **G (Nueva Observación)** y **J (Observacion)**; `CEJ SUPERIOR`, `Estadísticas de Audiencias en Línea` y las hojas con tabla de mapeo usan sus columnas de observaciones cuando estén pobladas. Se asocian al **endpoint/operación** y se indica el atributo cuando existe.
- `CASILLERO!L` (Nota) se conserva como observación técnica del sistema Casillero Digital, asociada a su campo de BD. `STORED PROCEDURES` no tiene una columna de observación y sus consultas SQL no se interpretan como comentarios.
- El panel distingue **Observaciones del Excel (solo lectura)** de **Seguimiento manual** (editable por el usuario en localStorage). Los conteos indican ambos orígenes, el autor/origen, la referencia de celda `Hoja!ColumnaFila` y el atributo afectado cuando aplica.
- La vista **Sistemas** permite exportar `observaciones_excel_pj.csv`, con nivel, sistema, integración técnica, endpoint, responsable/origen, atributo, referencia y texto.
- Los comentarios importados se **reemplazan al cargar una nueva versión del archivo**. No forman parte del respaldo JSON de comentarios manuales, no se mezclan con estos ni se les asigna artificialmente un estado de cierre.
- Por seguridad, no se ingieren solicitudes, respuestas, valores de ejemplo ni consultas SQL como observaciones. Las celdas que parezcan incluir credenciales se ocultan y deben consultarse directamente en el Excel autorizado.

**Limitación:** la asignación depende de la correspondencia de componente descrita en la versión 1.2. Observaciones sin un componente identificable en `Sistemas` se muestran a nivel de sistema; endpoints sin vínculo técnico quedan en «Pendiente de asociación» sin atribuirlos arbitrariamente.

**Contraste con el archivo del 09/10/2026:** 554 celdas de observación: 32 GTI y 8 SOFTPLAN en `Sistemas`, 496 en `expedientes-judiciales-query-ws`, 10 en `CEJ SUPERIOR`, 6 en las matrices de Presidencia/PNP/SICMEP y 2 notas de `CASILLERO`. En el inventario jerárquico se distribuyen en 19 del nivel sistema, 23 del nivel integración y 512 del nivel endpoint. No son 554 incidencias independientes ni necesariamente abiertas: se cuentan celdas comentadas, sin deduplicar su contenido por significado.


## Versión 1.4 · Observaciones GTI y SOFTPLAN visibles

**Corrección de interfaz:** en la pestaña **Sistemas**, al desplegar un sistema ahora se muestran automáticamente debajo de cada integración técnica las observaciones registradas en las columnas `N` (GTI) y `O` (SOFTPLAN) de la hoja `Sistemas`. Cada observación presenta el responsable, el texto completo y la celda original (por ejemplo `Sistemas!N8`), incluso cuando los endpoints de dicha integración están contraídos.

- Las observaciones genuinamente a nivel sistema se muestran justo debajo de la cabecera del sistema.
- Los indicadores ahora identifican por separado los conteos de GTI, SOFTPLAN, demás observaciones importadas y seguimiento manual.
- El botón **Ver / añadir seguimiento** abre la ficha lateral y muestra **primero** los comentarios existentes del Excel, antes del formulario para crear nuevas anotaciones.
- Cuando un endpoint tiene observaciones de su hoja de detalle, el botón se llama **Ver comentarios** y permite consultar el texto y la celda correspondiente.
- No se modifican ni la extracción ni el almacenamiento de los comentarios: se leen de nuevo al cargar una versión del Excel y no se confunden con el seguimiento editable.

**Prueba focalizada con el Excel original:** al desplegar SERNOT, se muestran 3 tarjetas: GTI en `Sistemas!N10`, GTI en `Sistemas!N8` y SOFTPLAN en `Sistemas!O8`. La comprobación automatizada del HTML generado confirmó la presencia de los tres textos. La prueba visual automatizada con Chromium no concluyó, por lo que se recomienda validar la presentación final localmente en el navegador.
