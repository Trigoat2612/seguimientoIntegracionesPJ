# Versiones del tablero de integraciones PJ

## Base estable confirmada por el usuario

**V1.4 — Observaciones GTI/SOFTPLAN visibles.**

- Conservada en: `tablero_integraciones_pj_v1_4_comentarios_visibles.zip` (artefacto anterior).
- La base estable no fue modificada.
- Contiene la navegación Sistema → Integración técnica → Endpoint, observaciones de GTI/SOFTPLAN importadas y su trazabilidad de celdas.

## V1.5 — Lectura del documento Google

- Derivada exclusivamente de V1.4.
- `config.js` apunta al documento Google facilitado por el usuario.
- La aplicación intenta cargarlo al inicio y refrescarlo cada 15 minutos si la pestaña está abierta y visible.
- `api/drive.js` permite exportar el libro Google Sheets a `.xlsx` completo o descargar un `.xlsx` desde Drive público, con validación de ID y límite de 20 MB.
- Google privado: opción OAuth de V1.4 preservada. Necesita configuración y autorización explícita del usuario.
- No modificados: `model.js`, `xlsx.js`, `hierarchy.js`, `excel-observations.js`, `observations.js` ni `styles.css`.
- Conservada la carga local manual como respaldo.

### Pruebas efectuadas

- Sintaxis JavaScript validada con Node.
- Respuesta de descarga pública y respaldo `.xlsx` simuladas correctamente.
- Validación sin regresiones: 42 sistemas, 94 endpoints/operaciones, 554 observaciones sobre datos originales.
- No fue posible verificar permisos del enlace Google desde el entorno de desarrollo ni ejecutar una prueba E2E en Chromium (bloqueado por políticas de entorno).

## V1.5.1 - Acceso OAuth privado local

Se evita la llamada a /api/drive para el archivo privado en inicio/actualizacion; Client ID Web configurado sin secreto; acceso autorizado desde `http://localhost:8080`.
