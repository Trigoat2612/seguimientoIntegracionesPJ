# V1.15.5.3 · Estados de revisión de Documentos Clave

## Alcance

La única lista de opciones del campo **Estado de revisión** es:

1. Validado
2. En proceso de firma
3. Programado

No se cambian los estados de incidencias, los historiales, los códigos de documento, el resto del tablero ni las exportaciones. La selección inicial de una ficha sin seguimiento es **Programado**; no se guarda hasta que el editor envíe el formulario con un comentario.

## Orden de instalación

1. Comprueba la rama conectada a `DATABASE_URL`. La base verificada el 29/10/2026 tenía **0 registros** en `document_reviews`, por lo que no se requiere conversión en esa rama.
2. Ejecuta `estados-revision-v1_15_5_3.sql` en Neon SQL Editor. Se aborta si hay registros que todavía conservan estados anteriores. No convierte ni elimina registros.
3. Despliega el proyecto V1.15.5.3 conservando `.env.local` y `.vercel/`.
4. Ejecuta `npm install`, `npm test`, `npm run build`, `npx vercel dev`.
5. En Documentos Clave, abre una ficha con permisos de editor, comprueba el desplegable y guarda un estado con comentario. Recarga y verifica que el estado persista.

## Si aparecen estados anteriores en otra rama

Ejecuta `SELECT document_code, document_name, review_status FROM public.document_reviews WHERE review_status NOT IN ('Validado','En proceso de firma','Programado');`. Define la nueva clasificación según el significado real de cada documento, sin asignarla automáticamente. El script no modifica la tabla mientras existan esos valores.

## Comprobación

```sql
SELECT review_status, COUNT(*) AS documentos
FROM public.document_reviews
GROUP BY review_status
ORDER BY review_status;
```

El SQL debe quedar aplicado **antes** de intentar registrar los nuevos estados. El código informa si aún está instalada la restricción anterior.
