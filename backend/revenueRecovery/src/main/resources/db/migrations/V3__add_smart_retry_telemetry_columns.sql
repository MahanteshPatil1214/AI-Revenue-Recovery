-- V3: Add smart-retry telemetry columns.
-- bank_code stores the normalized acquiring rail used by the radar and timing
-- engine (previously encoded as an error_code suffix). last_retry_at records the
-- timestamp of the most recent retry attempt for observability.

ALTER TABLE dunning_events
    ADD COLUMN IF NOT EXISTS bank_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP(6) WITH TIME ZONE;
