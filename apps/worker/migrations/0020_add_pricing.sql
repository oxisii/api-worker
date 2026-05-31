CREATE TABLE IF NOT EXISTS model_prices (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_pattern TEXT NOT NULL,
  model_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  input_price_per_1m REAL NOT NULL DEFAULT 0,
  cache_read_price_per_1m REAL NOT NULL DEFAULT 0,
  cache_write_price_per_1m REAL NOT NULL DEFAULT 0,
  output_price_per_1m REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  sync_status TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_model_prices_source_provider_pattern
  ON model_prices (source, provider, model_pattern);

CREATE INDEX IF NOT EXISTS idx_model_prices_model_pattern
  ON model_prices (model_pattern);

DELETE FROM model_prices WHERE source = 'builtin';

ALTER TABLE usage_logs ADD COLUMN cache_read_input_tokens INTEGER;
ALTER TABLE usage_logs ADD COLUMN cache_write_input_tokens INTEGER;
ALTER TABLE usage_logs ADD COLUMN uncached_input_tokens INTEGER;
ALTER TABLE usage_logs ADD COLUMN billable_input_tokens INTEGER;
ALTER TABLE usage_logs ADD COLUMN charge_amount REAL;
ALTER TABLE usage_logs ADD COLUMN charge_currency TEXT;
ALTER TABLE usage_logs ADD COLUMN charge_status TEXT;
ALTER TABLE usage_logs ADD COLUMN charge_source TEXT;
ALTER TABLE usage_logs ADD COLUMN charge_detail_json TEXT;
