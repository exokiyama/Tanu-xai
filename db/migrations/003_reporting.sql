CREATE TABLE IF NOT EXISTS command_usage (
  id BIGSERIAL PRIMARY KEY,
  command_name TEXT NOT NULL,
  sender_jid TEXT,
  chat_id TEXT,
  group_id TEXT,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS command_usage_created_at_idx ON command_usage(created_at);
CREATE INDEX IF NOT EXISTS command_usage_command_idx ON command_usage(command_name);
