-- V1.15.4: tablas aditivas; preserva Documentos Clave, Resumen táctico y Vías.
BEGIN;
CREATE TABLE IF NOT EXISTS activity_flow_activities (
 activity_key TEXT PRIMARY KEY CHECK(length(activity_key) BETWEEN 1 AND 1500),
 source_row INTEGER NOT NULL CHECK(source_row>=1),
 activity_position INTEGER NOT NULL CHECK(activity_position BETWEEN 0 AND 15000),
 route_name TEXT NOT NULL CHECK(length(btrim(route_name))>0),
 step_name TEXT NOT NULL CHECK(length(btrim(step_name))>0),
 stage_name TEXT NOT NULL CHECK(length(btrim(stage_name))>0),
 activity_name TEXT NOT NULL CHECK(length(btrim(activity_name))>0),
 no_integration BOOLEAN NOT NULL DEFAULT TRUE,
 detail JSONB NOT NULL CHECK(jsonb_typeof(detail)='object'),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 tactical_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_flow_active_order_idx ON activity_flow_activities(is_active,activity_position);
CREATE TABLE IF NOT EXISTS activity_flow_links (
 link_key TEXT PRIMARY KEY CHECK(length(link_key) BETWEEN 1 AND 2000),
 activity_key TEXT NOT NULL REFERENCES activity_flow_activities(activity_key),
 source_row INTEGER NOT NULL CHECK(source_row>=1),
 link_position INTEGER NOT NULL CHECK(link_position BETWEEN 0 AND 20000),
 entry JSONB NOT NULL CHECK(jsonb_typeof(entry)='object'),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 tactical_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_flow_links_order_idx ON activity_flow_links(is_active,activity_key,link_position);
CREATE TABLE IF NOT EXISTS activity_flow_published_metadata (
 module_key TEXT PRIMARY KEY DEFAULT 'flujo_actividades' CHECK(module_key='flujo_actividades'),
 source_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 tactical_batch_id UUID NOT NULL REFERENCES migration_batches(id),
 metadata JSONB NOT NULL CHECK(jsonb_typeof(metadata)='object'),
 updated_by TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS activity_flow_migration_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_type TEXT NOT NULL CHECK(event_type IN ('published','reverted_to_google')),
 batch_id UUID REFERENCES migration_batches(id),
 tactical_batch_id UUID REFERENCES migration_batches(id),
 actor_email TEXT NOT NULL,
 activity_count INTEGER NOT NULL CHECK(activity_count>=0),
 link_count INTEGER NOT NULL CHECK(link_count>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE migration_source_controls DROP CONSTRAINT IF EXISTS migration_source_controls_allowed_sources_v1153;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='migration_source_controls_allowed_sources_v1154') THEN
  ALTER TABLE migration_source_controls ADD CONSTRAINT migration_source_controls_allowed_sources_v1154
   CHECK (module_key IN ('documentos_clave','resumen_tactico','integraciones_via','flujo_actividades')
    AND ((active_source='google_sheets' AND neon_read_enabled=FALSE) OR (active_source='neon' AND neon_read_enabled=TRUE)));
 END IF;
END $$;
COMMIT;
