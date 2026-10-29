-- V1.15.1 · Publicación controlada de Documentos Clave. Ejecutar DESPUÉS de sincronizacion-v1_15_0.sql.
-- Migración aditiva: NO modifica ni elimina document_incidents, document_incident_events,
-- document_reviews ni document_review_events.
BEGIN;
CREATE TABLE IF NOT EXISTS key_documents (
 document_code TEXT PRIMARY KEY CHECK (length(trim(document_code)) BETWEEN 1 AND 100),
 document_name TEXT NOT NULL CHECK (length(trim(document_name)) BETWEEN 1 AND 400),
 source_row INTEGER NOT NULL CHECK (source_row>=1),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS key_documents_active_idx ON key_documents(is_active,document_code);
CREATE TABLE IF NOT EXISTS key_document_migration_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_type TEXT NOT NULL CHECK (event_type IN ('published','reverted_to_google')),
 batch_id UUID REFERENCES migration_batches(id),
 actor_email TEXT NOT NULL,
 document_count INTEGER NOT NULL CHECK (document_count>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE migration_source_controls
 ADD COLUMN IF NOT EXISTS published_batch_id UUID REFERENCES migration_batches(id);
-- Se levanta la restricción de solo Google únicamente para Documentos Clave.
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_active_source_check;
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_neon_read_enabled_check;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='migration_source_controls_allowed_sources_v1151') THEN
  ALTER TABLE migration_source_controls
   ADD CONSTRAINT migration_source_controls_allowed_sources_v1151
   CHECK ((module_key='documentos_clave' AND
      ((active_source='google_sheets' AND neon_read_enabled=FALSE) OR
       (active_source='neon' AND neon_read_enabled=TRUE)))
     OR (module_key<>'documentos_clave' AND active_source='google_sheets' AND neon_read_enabled=FALSE));
 END IF;
END $$;
COMMIT;
