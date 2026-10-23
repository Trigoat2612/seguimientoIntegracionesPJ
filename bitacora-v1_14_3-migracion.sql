-- Migración ADITIVA V1.14.3. Conserva todas las incidencias existentes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- V1.14.3: estado de revisión y versión guardados en Neon, NO en CatalogoDocumentos.
CREATE TABLE IF NOT EXISTS document_reviews (
  document_code VARCHAR(100) PRIMARY KEY,
  document_name VARCHAR(350) NOT NULL,
  document_version VARCHAR(100) NOT NULL DEFAULT '',
  review_status VARCHAR(40) NOT NULL DEFAULT 'Pendiente de revisión'
    CHECK (review_status IN ('Pendiente de revisión','En revisión','Observado','En subsanación','En verificación')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_by VARCHAR(320) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS document_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(100) NOT NULL REFERENCES document_reviews(document_code) ON DELETE RESTRICT,
  actor_email VARCHAR(320) NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  before_snapshot JSONB,
  after_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS document_review_events_code_idx ON document_review_events(document_code,created_at DESC);
