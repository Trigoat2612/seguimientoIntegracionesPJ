-- Ejecútalo una sola vez en Neon (SQL Editor). No contiene datos ni credenciales.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS document_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code VARCHAR(100) NOT NULL,
  document_name VARCHAR(350) NOT NULL,
  title VARCHAR(250) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('Crítica','Alta','Media','Baja')),
  status VARCHAR(24) NOT NULL CHECK (status IN ('Abierta','En atención','Subsanada','En verificación','Cerrada','Reabierta')) DEFAULT 'Abierta',
  assigned_to VARCHAR(200) NOT NULL DEFAULT '',
  due_date DATE,
  evidence_url TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
  created_by VARCHAR(320) NOT NULL,
  updated_by VARCHAR(320) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS document_incidents_code_idx ON document_incidents(document_code, created_at DESC);
CREATE TABLE IF NOT EXISTS document_incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES document_incidents(id) ON DELETE RESTRICT,
  event_type VARCHAR(24) NOT NULL CHECK (event_type IN ('creacion','actualizacion','comentario')),
  actor_email VARCHAR(320) NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  before_snapshot JSONB,
  after_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS document_incident_events_incident_idx ON document_incident_events(incident_id,created_at,id);
-- No se ofrecen DELETE ni UPDATE de eventos desde el backend.

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
