-- V1.15.0: infraestructura de sincronización. No modifica tablas de la bitácora
-- ni sustituye las lecturas operativas desde Google Sheets.
BEGIN;
CREATE TABLE IF NOT EXISTS migration_source_controls (
  module_key TEXT PRIMARY KEY CHECK (module_key IN ('documentos_clave','resumen_tactico','integraciones_via','flujo_actividades')),
  sheet_name TEXT NOT NULL,
  active_source TEXT NOT NULL DEFAULT 'google_sheets' CHECK (active_source = 'google_sheets'),
  neon_read_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (neon_read_enabled = FALSE),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO migration_source_controls (module_key,sheet_name)
VALUES ('documentos_clave','CatalogoDocumentos'),('resumen_tactico','Seguimiento'),
       ('integraciones_via','IntegracionesEtapa'),('flujo_actividades','EtapaActividadIntegracion')
ON CONFLICT (module_key) DO NOTHING;
CREATE TABLE IF NOT EXISTS migration_batches (
 id UUID PRIMARY KEY,
 module_key TEXT NOT NULL REFERENCES migration_source_controls(module_key),
 sheet_name TEXT NOT NULL,
 source_label TEXT NOT NULL,
 checksum TEXT NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
 status TEXT NOT NULL DEFAULT 'staged' CHECK (status = 'staged'),
 row_count INTEGER NOT NULL CHECK (row_count >= 0),
 previous_batch_id UUID REFERENCES migration_batches(id),
 comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
 warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
 imported_by TEXT NOT NULL,
 imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(module_key,checksum)
);
CREATE INDEX IF NOT EXISTS migration_batches_latest_idx ON migration_batches(module_key,imported_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS migration_batch_rows (
 batch_id UUID NOT NULL REFERENCES migration_batches(id) ON DELETE RESTRICT,
 row_number INTEGER NOT NULL CHECK (row_number>=1),
 cells JSONB NOT NULL CHECK (jsonb_typeof(cells)='array'),
 PRIMARY KEY (batch_id,row_number)
);
CREATE TABLE IF NOT EXISTS migration_audit_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 module_key TEXT NOT NULL REFERENCES migration_source_controls(module_key),
 batch_id UUID NOT NULL REFERENCES migration_batches(id),
 event_type TEXT NOT NULL CHECK (event_type IN ('imported')),
 actor_email TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
