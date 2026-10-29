-- V1.15.3: tablas aditivas, no altera Seguimiento ni Documentos Clave.
BEGIN;
CREATE TABLE IF NOT EXISTS route_integration_links (
 relation_key TEXT PRIMARY KEY CHECK(length(relation_key) BETWEEN 3 AND 1200),
 source_row INTEGER NOT NULL CHECK(source_row>=1),
 link_position INTEGER NOT NULL CHECK(link_position BETWEEN 0 AND 15000),
 route_name TEXT NOT NULL CHECK(length(trim(route_name))>0),
 stage_name TEXT NOT NULL CHECK(length(trim(stage_name))>0),
 integration_name TEXT NOT NULL CHECK(length(trim(integration_name))>0),
 is_ready BOOLEAN NOT NULL DEFAULT FALSE,
 is_matched BOOLEAN NOT NULL DEFAULT FALSE,
 entry JSONB NOT NULL CHECK(jsonb_typeof(entry)='object'),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 tactical_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS route_integration_active_idx ON route_integration_links(is_active,link_position);
CREATE INDEX IF NOT EXISTS route_integration_route_idx ON route_integration_links(route_name,stage_name,is_active);
CREATE TABLE IF NOT EXISTS route_published_metadata (
 module_key TEXT PRIMARY KEY DEFAULT 'integraciones_via' CHECK(module_key='integraciones_via'),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 tactical_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 metadata JSONB NOT NULL CHECK(jsonb_typeof(metadata)='object'),
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS route_migration_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_type TEXT NOT NULL CHECK(event_type IN ('published','reverted_to_google')),
 batch_id UUID REFERENCES migration_batches(id),
 tactical_batch_id UUID REFERENCES migration_batches(id),
 actor_email TEXT NOT NULL,
 association_count INTEGER NOT NULL CHECK(association_count>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_allowed_sources_v1152;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='migration_source_controls_allowed_sources_v1153') THEN
  ALTER TABLE migration_source_controls ADD CONSTRAINT migration_source_controls_allowed_sources_v1153
   CHECK (
    (module_key IN ('documentos_clave','resumen_tactico','integraciones_via') AND
      ((active_source='google_sheets' AND neon_read_enabled=FALSE) OR (active_source='neon' AND neon_read_enabled=TRUE)))
    OR (module_key='flujo_actividades' AND active_source='google_sheets' AND neon_read_enabled=FALSE)
   );
 END IF;
END $$;
COMMIT;
