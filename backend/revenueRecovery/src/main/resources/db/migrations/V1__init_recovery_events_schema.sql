CREATE TABLE IF NOT EXISTS dunning_events (
    id BIGSERIAL PRIMARY KEY,
    payment_id VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    customer_email VARCHAR(255),
    customer_contact VARCHAR(50),
    error_code VARCHAR(100),
    error_reason TEXT,
    category VARCHAR(50) NOT NULL,
    strategy_applied VARCHAR(100) NOT NULL,
    reasoning_trace TEXT,
    recovery_url TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dunning_payment_id ON dunning_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_dunning_category ON dunning_events(category);
CREATE INDEX IF NOT EXISTS idx_dunning_created_at ON dunning_events(created_at);