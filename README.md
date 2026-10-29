# V1.15.5.7 · Resumen documental integrado

**Nueva opción del menú principal: «Resumen documental».** La pantalla permite visualizar el estado actual por documento, indicadores de catálogo/seguimiento, la distribución por estados, pendientes prioritarios, anotaciones y acceso directo a la ficha con el historial completo. Incluye búsqueda y filtros por estado o equipo validador.

Los resultados se construyen **a partir del catálogo activo y de las anotaciones ya publicadas en Neon**, no de cifras fijas del Excel. Una anotación nueva o la publicación de una bitácora invalida el resumen anterior. Las fechas no informadas permanecen en blanco en los datos y se muestran como «Sin fecha». El estado Validado es declarativo y no prueba por sí solo la ausencia de pendientes.

**Instalación:** descomprime la nueva versión, conserva `.env.local` y las variables de Vercel, ejecuta `npm test`, `npm run build` y despliega. **No se requiere SQL nuevo ni modificaciones al Excel** si ya están aplicadas las migraciones de V1.15.5.5. El nuevo endpoint de lectura `/api/seguimiento-documental?action=dashboard` responde con los datos de seguimiento de los documentos activos; utiliza la misma política de lectura que la ficha documental. Protege el sitio a nivel de Vercel/red si contiene datos sensibles.

---

# V1.15.5.6 · Corrección de celdas vacías en la sincronización

Se corrigió la validación de origen al comparar o guardar copias preliminares de `Lista_Integraciones.xlsx` o exportaciones de Google Sheets. Los vacíos de XLSX pueden originar arrays dispersos; antes, al serializarse como JSON, aparecían `null` y eran rechazados (por ejemplo, `Seguimiento!F2:F5`). Ahora se materializan como `""` en el cliente y se aceptan como celdas vacías en la validación del servidor. Se preservan las posiciones, el contenido de las bitácoras y los códigos documentales, y se siguen rechazando números y booleanos inesperados en instantáneas recibidas directamente por API.

**Instalación:** reemplazar el código y desplegar en Vercel; **no se requiere SQL nuevo**, no se modifica el Excel fuente ni se alteran registros existentes en Neon. Ejecutar `npm test` y `npm run build`. La corrección afecta al flujo de importación/validación de los cinco módulos de Sincronización de datos.

---

# V1.15.5.5 · Seguimiento documental B:I

Se agregó el módulo `bitacoraDocumentosClave`: importar desde Sincronización de datos, cotejar y publicar anotaciones en Neon. En Documentos Clave, registrar y consultar seguimiento por actividad, fecha, estado, comentarios, responsable, equipo y etapa. Se oculta la interfaz de incidencias sin borrar sus tablas.

**Instalación:** primero ejecutar `database/migrations/seguimiento-documental-v1_15_5_5.sql`, luego actualizar código. Consultar `docs/GUIA_SEGUIMIENTO_DOCUMENTAL_V1_15_5_5.md` para los pasos y las 54 anotaciones del Excel original.

# Tablero de Integraciones PJ · V1.15.5.4

**Proyecto EJE No Penal · Consolidación y ordenamiento de la base de código.**

Esta versión reorganiza físicamente los módulos, las funciones API, los modelos reutilizables, las migraciones, las pruebas y las guías. **No modifica el esquema de Neon, sus registros, las reglas de cálculo ni el contenido funcional de las pantallas.** Continúa la V1.15.5.3, incluidos los tres estados documentales: Validado, En proceso de firma y Programado.

## Inicio rápido

1. Descomprime el proyecto completo en una carpeta nueva.
2. Conserva las variables privadas en `.env.local` y la configuración de Vercel de tu instalación anterior. **No copies credenciales al código ni al ZIP.**
3. Comprueba que las migraciones de las versiones anteriores ya estén aplicadas, especialmente `database/migrations/estados-revision-v1_15_5_3.sql`. **Esta versión no requiere SQL adicional.**
4. Desde la raíz del proyecto:

```powershell
npm install
npm test
npm run build
npx vercel dev
```

> No modifiques directamente `public/`: se regenera desde `src/client/` durante `npm run build`.

## Estructura

```text
api/                         Endpoints públicos de Vercel (lectura y administración protegida)
src/
  client/
    app.js                    Coordinador de las vistas y eventos
    index.html                Plantilla del dashboard
    config.js                 Configuración pública (sin client_secret)
    styles.css                Estilos
    assets/                   Plantilla e implementación de PPTX
    core/                     Modelos de presentación, formatos, Excel y observaciones
    ui/                       Menús, Documentos Clave y Sincronización de datos
    presentations/            Exportaciones PowerPoint
  shared/
    documents/                Validaciones, catálogo y revisión documental
    tactical/                 Resumen táctico y modelo de migración
    routes/                   Integraciones por vía y modelo de migración
    flow/                     Flujo de actividades y modelo de migración
    sync/                     Contratos y validaciones de sincronización
  server/                     Autorización y configuración privadas
database/migrations/          Scripts SQL históricos por versión
data/templates/               Plantillas auxiliares
docs/                         Arquitectura, guías y versiones anteriores
scripts/                      Generación y verificación de public/
tests/                        Regresión funcional y estructural
public/                       Salida generada; NO editar ni subir al repositorio
```

## Responsabilidades y permisos

- **Lecturas operativas:** Resumen táctico, Integraciones por vía, Flujo de actividades y Documentos Clave leen desde las API sin OAuth. El acceso al sitio debe estar limitado a los usuarios permitidos si los datos son confidenciales.
- **Escrituras documentales:** requieren editor autorizado. Se conserva la bitácora, estados de revisión, incidencias, comentarios y el historial.
- **Importación y publicación:** exclusivamente en **Sincronización de datos**, con autorización de editor y, cuando corresponde, permisos de Google Drive.
- **Neon:** la conexión se mantiene en funciones del servidor mediante `DATABASE_URL`, nunca en JavaScript público.

Consulta [Arquitectura](docs/ARQUITECTURA.md), [Reorganización V1.15.5.4](docs/GUIA_REORGANIZACION_V1_15_5_4.md) e [Historial de versiones](docs/VERSIONES.md).
