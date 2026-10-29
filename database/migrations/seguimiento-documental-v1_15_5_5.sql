-- V1.15.5.5 · Bitácora documental B:I. Aplicar ANTES de desplegar la nueva versión.
-- Aditivo: conserva document_reviews, incidencias y sus eventos históricos.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS document_tracking_entries (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 document_code VARCHAR(100) NOT NULL CHECK (btrim(document_code) <> ''),
 event_date DATE,
 status VARCHAR(40) NOT NULL CHECK (status IN ('Pendiente','Programado','En proceso de firma','Entregado','Validado','Observado')),
 source_status VARCHAR(100) NOT NULL DEFAULT '',
 activity TEXT NOT NULL DEFAULT '',
 comments TEXT NOT NULL DEFAULT '',
 responsible VARCHAR(250) NOT NULL DEFAULT '',
 validator_teams TEXT[] NOT NULL DEFAULT '{}'::text[],
 stage VARCHAR(250) NOT NULL DEFAULT '',
 origin VARCHAR(12) NOT NULL CHECK(origin IN ('manual','import')),
 source_key CHAR(64) UNIQUE,
 source_row INTEGER,
 source_batch_id UUID REFERENCES migration_batches(id) ON DELETE RESTRICT,
 created_by VARCHAR(320) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT document_tracking_source_consistency CHECK (
   (origin='manual' AND source_key IS NULL AND source_batch_id IS NULL AND source_row IS NULL)
   OR (origin='import' AND source_key IS NOT NULL AND source_batch_id IS NOT NULL AND source_row > 0))
);
CREATE INDEX IF NOT EXISTS document_tracking_by_code ON document_tracking_entries(document_code,event_date DESC NULLS LAST,created_at DESC);
CREATE INDEX IF NOT EXISTS document_tracking_by_batch ON document_tracking_entries(source_batch_id);
-- Se agrega un quinto módulo sin alterar las lecturas activas de los cuatro anteriores.
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_module_key_check;
ALTER TABLE migration_source_controls ADD CONSTRAINT migration_source_controls_module_key_check
 CHECK(module_key IN ('documentos_clave','resumen_tactico','integraciones_via','flujo_actividades','bitacora_documentos_clave'));
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_allowed_sources_v1154;
ALTER TABLE migration_source_controls ADD CONSTRAINT migration_source_controls_allowed_sources_v1154 CHECK (
  module_key IN ('documentos_clave','resumen_tactico','integraciones_via','flujo_actividades','bitacora_documentos_clave')
  AND ((active_source='google_sheets' AND neon_read_enabled=false) OR (active_source='neon' AND neon_read_enabled=true)));
INSERT INTO migration_source_controls(module_key,sheet_name,active_source,neon_read_enabled)
 VALUES('bitacora_documentos_clave','bitacoraDocumentosClave','neon',true)
 ON CONFLICT(module_key) DO NOTHING;
COMMIT;

-- Registro auditable de publicaciones, sin borrar entradas previas.
CREATE TABLE IF NOT EXISTS document_tracking_import_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id UUID NOT NULL REFERENCES migration_batches(id) ON DELETE RESTRICT,
 actor_email VARCHAR(320) NOT NULL,
 rows_read INTEGER NOT NULL CHECK(rows_read>=0),
 rows_added INTEGER NOT NULL CHECK(rows_added>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(batch_id)
);
