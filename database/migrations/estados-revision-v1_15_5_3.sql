-- V1.15.5.3 · Solo tres estados de revisión documental.
-- Ejecutar en Neon SQL Editor, en la misma rama de DATABASE_URL, ANTES de desplegar el código.
-- NO modifica incidencias ni historiales; no convierte estados anteriores automáticamente.
-- Es transaccional e idempotente: si hay documentos con estados anteriores, cancela todo.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.document_reviews
    WHERE review_status NOT IN (
      'Validado',
      'En proceso de firma',
      'Programado'
    )
  ) THEN
    RAISE EXCEPTION 'Hay documentos con estados anteriores. Revisa SELECT document_code, review_status FROM public.document_reviews y define cómo reasignarlos antes de aplicar esta migración.';
  END IF;
END
$$;

ALTER TABLE public.document_reviews
  ALTER COLUMN review_status SET DEFAULT 'Programado';

ALTER TABLE public.document_reviews
  DROP CONSTRAINT IF EXISTS document_reviews_review_status_check;

ALTER TABLE public.document_reviews
  ADD CONSTRAINT document_reviews_review_status_check
    CHECK (review_status IN (
      'Validado',
      'En proceso de firma',
      'Programado'
    ));

COMMIT;

-- Comprobación posterior de la restricción:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.document_reviews'::regclass
--   AND conname = 'document_reviews_review_status_check';
