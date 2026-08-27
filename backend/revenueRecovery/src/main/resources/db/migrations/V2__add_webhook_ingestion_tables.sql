-- V2: Webhook ingestion audit trail + DLQ table.
-- webhook_dlq_events already exists on the primary dev environment (originally
-- created by ddl-auto=update); CREATE TABLE IF NOT EXISTS makes this a safe
-- no-op there, while still provisioning fresh environments. Column types match
-- the JPA entities so Hibernate ddl-auto=validate passes.

CREATE TABLE IF NOT EXISTS webhook_event_log (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(255),
    payment_id      VARCHAR(255),
    raw_payload     TEXT NOT NULL,
    status          VARCHAR(255),
    processing_note TEXT,
    created_at      TIMESTAMP(6) WITH TIME ZONE,
    processed_at    TIMESTAMP(6) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_wehook_event_type_created ON webhook_event_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_wehook_payment_id ON webhook_event_log(payment_id);

CREATE TABLE IF NOT EXISTS webhook_dlq_events (
    id               BIGSERIAL PRIMARY KEY,
    event_type       VARCHAR(255),
    raw_payload      TEXT NOT NULL,
    exception_message TEXT,
    retry_count      INTEGER,
    max_retries      INTEGER,
    status           VARCHAR(255),
    next_retry_at    TIMESTAMP(6) WITH TIME ZONE,
    created_at       TIMESTAMP(6) WITH TIME ZONE,
    updated_at       TIMESTAMP(6) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dlq_status_next_retry ON webhook_dlq_events(status, next_retry_at);
