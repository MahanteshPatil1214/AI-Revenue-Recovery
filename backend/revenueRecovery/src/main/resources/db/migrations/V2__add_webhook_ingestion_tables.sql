CREATE TABLE IF NOT EXISTS webhook_event_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    payment_id VARCHAR(100),
    raw_payload TEXT NOT NULL,
    status VARCHAR(50),
    processing_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_wehook_event_type_created ON webhook_event_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_wehook_payment_id ON webhook_event_log(payment_id);

CREATE TABLE IF NOT EXISTS webhook_dlq_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    raw_payload TEXT NOT NULL,
    exception_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(50),
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dlq_status_next_retry ON webhook_dlq_events(status, next_retry_at);
