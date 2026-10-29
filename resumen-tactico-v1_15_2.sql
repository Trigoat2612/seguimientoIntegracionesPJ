-- V1.15.2 · Publicación reversible del Resumen táctico.
-- Ejecutar DESPUÉS de V1.15.0 y V1.15.1. No modifica Documentos Clave ni bitácoras.
BEGIN;
CREATE TABLE IF NOT EXISTS tactical_tracking (
 source_row INTEGER PRIMARY KEY CHECK (source_row BETWEEN 2 AND 36),
 integration_name TEXT NOT NULL CHECK (length(trim(integration_name)) BETWEEN 1 AND 500),
 status_raw TEXT NOT NULL,
 status_group TEXT NOT NULL,
 dependency TEXT NOT NULL DEFAULT '',
 situational_history TEXT NOT NULL DEFAULT '',
 development_close TEXT NOT NULL DEFAULT '',
 tests_close TEXT NOT NULL DEFAULT '',
 gsj_validation TEXT NOT NULL DEFAULT '',
 criticality_raw TEXT NOT NULL DEFAULT '',
 severity_green BOOLEAN NOT NULL DEFAULT FALSE,
 severity_fill_color TEXT NOT NULL DEFAULT '',
 considerations TEXT NOT NULL DEFAULT '',
 entry JSONB NOT NULL CHECK (jsonb_typeof(entry)='object'),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tactical_tracking_active_idx ON tactical_tracking(is_active,source_row);
CREATE INDEX IF NOT EXISTS tactical_tracking_status_idx ON tactical_tracking(status_group,is_active);
CREATE TABLE IF NOT EXISTS tactical_migration_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_type TEXT NOT NULL CHECK (event_type IN ('published','reverted_to_google')),
 batch_id UUID REFERENCES migration_batches(id),
 actor_email TEXT NOT NULL,
 integration_count INTEGER NOT NULL CHECK (integration_count>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Conservar el control de Documentos Clave y permitir Neon SOLO para Resumen táctico.
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_allowed_sources_v1151;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='migration_source_controls_allowed_sources_v1152') THEN
  ALTER TABLE migration_source_controls ADD CONSTRAINT migration_source_controls_allowed_sources_v1152
   CHECK (
    (module_key IN ('documentos_clave','resumen_tactico') AND
       ((active_source='google_sheets' AND neon_read_enabled=FALSE)
        OR (active_source='neon' AND neon_read_enabled=TRUE)))
     OR (module_key IN ('integraciones_via','flujo_actividades')
         AND active_source='google_sheets' AND neon_read_enabled=FALSE)
   );
 END IF;
END $$;
COMMIT;
