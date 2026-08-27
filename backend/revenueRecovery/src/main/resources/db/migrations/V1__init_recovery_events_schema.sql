-- V1: Initial recovery events schema.
-- NOTE: On the primary dev/persistence environment this schema was originally
-- materialised by Hibernate (ddl-auto=update). Flyway is baselined at V2 in that
-- environment, so this file runs only on fresh environments where no legacy
-- schema exists. It is kept in lockstep with the DunningEvent entity (including
-- implicit camelCase -> snake_case physical naming) so Hibernate's
-- ddl-auto=validate passes.
CREATE TABLE IF NOT EXISTS dunning_events (
    id               BIGSERIAL PRIMARY KEY,
    payment_id       VARCHAR(255) NOT NULL,
    amount           DOUBLE PRECISION,
    customer_email   VARCHAR(255),
    customer_contact VARCHAR(255),
    error_code       VARCHAR(255),
    error_reason     VARCHAR(255),
    category         VARCHAR(255),
    strategy_applied VARCHAR(255),
    reasoning_trace  VARCHAR(1000),
    recovery_url     VARCHAR(255),
    status           VARCHAR(255),
    retry_count      INTEGER,
    max_retries      INTEGER,
    next_retry_at    TIMESTAMP(6) WITH TIME ZONE,
    created_at       TIMESTAMP(6) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS dunning_events_payment_id_key ON dunning_events(payment_id);

CREATE INDEX IF NOT EXISTS idx_dunning_payment_id ON dunning_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_dunning_category ON dunning_events(category);
CREATE INDEX IF NOT EXISTS idx_dunning_created_at ON dunning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_dunning_status_retry ON dunning_events(status, next_retry_at);
