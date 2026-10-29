# V1.15.4.1 — Corrección de Publicar flujo en Neon

## Diagnóstico confirmado

En V1.15.4, el botón **Publicar flujo en Neon** permanecía deshabilitado cuando no había un cotejo válido en el estado temporal del navegador (`flowMigrationStatus.preview.canPublish`). No respondía al clic ni informaba el requisito pendiente. Además, la acción Guardar copia no actualizaba `flowMigrationStatus` de inmediato.

## Correcciones

1. El botón **Comprobar y publicar flujo en Neon** es interactivo cuando no hay una operación en curso. Indica qué falta si no se cargó `EtapaActividadIntegracion`, si no se guardó una copia o si falta un Resumen táctico publicado.
2. Al pulsarlo, el tablero actualiza Google Drive privado, valida y coteja la hoja frente a la última copia de Neon, y verifica la equivalencia del modelo del flujo.
3. **Solo si pasa el cotejo**, aparece una confirmación explícita antes de enviar el POST de publicación.
4. Si hubo cambios desde la última copia, falta autorización OAuth, hay diferencias de flujo o el esquema está incompleto, la interfaz muestra el error dentro del mismo módulo. No publica datos parciales.
5. Una vez guardada la copia de Flujo de actividades, se actualiza su estado directamente.
6. La API comprueba el estado realmente almacenado después de cada intento de publicar, para evitar comunicar éxito si hubo un conflicto simultáneo de lotes.
7. Si la publicación terminó pero falla la posterior actualización del resumen, mantiene el mensaje de publicación y agrega una advertencia de refresco.

## Aplicación

Reemplaza el proyecto usando `EJE_PJ_V1.15.4.1.zip`, conservando `.env.local` y `.vercel/`, si existen en tu equipo.

```powershell
npm install
npm test
npm run build
npx vercel dev
```

**No requiere migración SQL nueva.** No cambia la estructura de las tablas de Neon ni elimina datos publicados.

## Secuencia de uso

1. En **Sincronización de datos → Flujo de actividades**, actualiza la fuente privada y utiliza **Guardar copia en Neon** si el lote no está actualizado.
2. Pulsa **Comprobar y publicar flujo en Neon**. Ya no se exige que hayas realizado un cotejo previamente en la misma sesión.
3. Si se solicita OAuth, autoriza el acceso a la hoja; si aparece un error de versión, guarda nuevamente la copia y repite.
4. Cuando aparezca el cuadro de confirmación, verifica el número de actividades y enlaces y confirma.
5. Comprueba que la tarjeta muestre **Neon habilitado**, alterna Google Sheets/Neon en **Flujo de actividades**, y verifica los filtros y actividades sin integración.

## Alcance de pruebas

Se ejecutaron las pruebas automatizadas del proyecto y las específicas de botón clicable, mensaje de requisitos, cotejo en el clic, confirmación condicionada y actualización de estado. La publicación real mediante OAuth/Vercel contra tu Neon debe comprobarse en tu instalación.
