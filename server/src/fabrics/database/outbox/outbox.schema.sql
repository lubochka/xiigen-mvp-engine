-- file: server/src/fabrics/database/outbox/outbox.schema.sql
-- EP-5 Transactional Outbox table.
-- Stores events that must be delivered atomically with business record mutations.

CREATE TABLE IF NOT EXISTS xiigen_outbox (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID          NOT NULL,
  event_type    TEXT          NOT NULL,
  payload       JSONB         NOT NULL,
  status        TEXT          NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  delivered_at  TIMESTAMPTZ,
  retry_count   INTEGER       NOT NULL DEFAULT 0,
  last_error    TEXT
);

CREATE INDEX idx_xiigen_outbox_tenant_status
  ON xiigen_outbox (tenant_id, status, created_at)
  WHERE status = 'PENDING';
