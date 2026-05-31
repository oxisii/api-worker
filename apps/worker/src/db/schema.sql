CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  type INTEGER NOT NULL DEFAULT 1,
  group_name TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  rate_limit INTEGER DEFAULT 0,
  models_json TEXT,
  metadata_json TEXT,
  test_time INTEGER,
  response_time_ms INTEGER,
  system_token TEXT,
  system_userid TEXT,
  checkin_enabled INTEGER NOT NULL DEFAULT 0,
  checkin_url TEXT,
  last_checkin_date TEXT,
  last_checkin_status TEXT,
  last_checkin_message TEXT,
  last_checkin_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_call_tokens (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  models_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_channel_call_tokens_channel_id
  ON channel_call_tokens (channel_id, priority, created_at, id);

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  token_plain TEXT,
  quota_total INTEGER,
  quota_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  allowed_channels TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_key_hash ON tokens (key_hash);

CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  token_id TEXT,
  channel_id TEXT,
  model TEXT,
  request_path TEXT,
  total_tokens INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost REAL,
  cache_read_input_tokens INTEGER,
  cache_write_input_tokens INTEGER,
  uncached_input_tokens INTEGER,
  billable_input_tokens INTEGER,
  charge_amount REAL,
  charge_currency TEXT,
  charge_status TEXT,
  charge_source TEXT,
  charge_detail_json TEXT,
  latency_ms INTEGER,
  first_token_latency_ms INTEGER,
  stream INTEGER,
  reasoning_effort TEXT,
  status TEXT,
  upstream_status INTEGER,
  error_code TEXT,
  error_message TEXT,
  failure_stage TEXT,
  failure_reason TEXT,
  usage_source TEXT,
  error_meta_json TEXT,
  call_token_id TEXT,
  call_token_name TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_channel_id ON usage_logs (channel_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_token_id ON usage_logs (token_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON usage_logs (model);
CREATE INDEX IF NOT EXISTS idx_usage_logs_status ON usage_logs (status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_upstream_status ON usage_logs (upstream_status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_token_created_at ON usage_logs (token_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_channel_created_at ON usage_logs (channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model_created_at ON usage_logs (model, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_upstream_status_created_at ON usage_logs (upstream_status, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_status_created_at ON usage_logs (status, created_at);

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

CREATE TABLE IF NOT EXISTS attempt_events (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  attempt_index INTEGER NOT NULL,
  channel_id TEXT,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL,
  error_class TEXT,
  error_code TEXT,
  http_status INTEGER,
  latency_ms INTEGER NOT NULL,
  upstream_request_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  raw_size_bytes INTEGER,
  raw_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempt_events_trace_attempt
  ON attempt_events (trace_id, attempt_index);

CREATE INDEX IF NOT EXISTS idx_attempt_events_created_at
  ON attempt_events (created_at);

CREATE INDEX IF NOT EXISTS idx_attempt_events_channel_created_at
  ON attempt_events (channel_id, created_at);

CREATE INDEX IF NOT EXISTS idx_attempt_events_status_created_at
  ON attempt_events (status, created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channel_model_capabilities (
  channel_id TEXT NOT NULL,
  model TEXT NOT NULL,
  last_ok_at INTEGER NOT NULL,
  last_err_at INTEGER,
  last_err_code TEXT,
  last_err_count INTEGER NOT NULL DEFAULT 0,
  cooldown_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (channel_id, model)
);

CREATE INDEX IF NOT EXISTS idx_channel_model_capabilities_model
  ON channel_model_capabilities (model);

CREATE INDEX IF NOT EXISTS idx_channel_model_capabilities_channel
  ON channel_model_capabilities (channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_model_capabilities_channel_ok
  ON channel_model_capabilities (channel_id, last_ok_at);

CREATE INDEX IF NOT EXISTS idx_channel_model_capabilities_model_err
  ON channel_model_capabilities (model, last_err_at);
