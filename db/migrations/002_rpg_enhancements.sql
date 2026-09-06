-- Add transactions table for RPG economy tracking
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);

-- Add last_crime column to economy if not exists
ALTER TABLE economy ADD COLUMN IF NOT EXISTS last_crime TIMESTAMPTZ;

-- Add items master table
CREATE TABLE IF NOT EXISTS items (
  item_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'misc',
  buy_price INTEGER NOT NULL DEFAULT 0,
  sell_price INTEGER NOT NULL DEFAULT 0,
  usable BOOLEAN NOT NULL DEFAULT false,
  tradeable BOOLEAN NOT NULL DEFAULT true,
  effects JSONB DEFAULT '{}'::jsonb
);

-- Insert default items
INSERT INTO items (item_key, name, description, category, buy_price, sell_price, usable, tradeable) VALUES
  ('potion_health', 'Health Potion', 'Restores 50 HP', 'consumable', 100, 50, true, true),
  ('potion_mana', 'Mana Potion', 'Restores 30 MP', 'consumable', 80, 40, true, true),
  ('sword_iron', 'Iron Sword', 'Basic weapon for beginners', 'weapon', 500, 250, false, true),
  ('sword_steel', 'Steel Sword', 'A sturdy steel blade', 'weapon', 1500, 750, false, true),
  ('shield_wood', 'Wooden Shield', 'Simple wooden shield', 'armor', 300, 150, false, true),
  ('shield_iron', 'Iron Shield', 'Durable iron shield', 'armor', 800, 400, false, true),
  ('food_bread', 'Bread', 'Fresh baked bread', 'food', 20, 10, true, true),
  ('food_meat', 'Cooked Meat', 'Delicious cooked meat', 'food', 50, 25, true, true),
  ('tool_pickaxe', 'Pickaxe', 'For mining ores', 'tool', 200, 100, false, true),
  ('tool_axe', 'Axe', 'For chopping wood', 'tool', 150, 75, false, true),
  ('material_wood', 'Wood', 'Basic building material', 'material', 10, 5, false, true),
  ('material_stone', 'Stone', 'Common stone', 'material', 15, 7, false, true),
  ('material_iron', 'Iron Ore', 'Raw iron ore', 'material', 50, 25, false, true),
  ('treasure_chest', 'Treasure Chest', 'Contains random rewards', 'special', 1000, 0, true, false),
  ('diamond', 'Diamond', 'Precious gemstone', 'treasure', 0, 500, false, true),
  ('gold_bar', 'Gold Bar', 'Pure gold ingot', 'treasure', 0, 1000, false, true)
ON CONFLICT (item_key) DO NOTHING;

-- Create achievements table with proper structure
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);
CREATE INDEX IF NOT EXISTS achievements_key_idx ON achievements(achievement_key);

-- Default achievement catalog
CREATE TABLE IF NOT EXISTS achievement_catalog (
  achievement_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);
INSERT INTO achievement_catalog (achievement_key, name, description) VALUES
  ('ach_first_steps', 'First Steps', 'Reach level 5'),
  ('ach_rich', 'Getting Rich', 'Accumulate 10,000 coins'),
  ('ach_worker', 'Hard Worker', 'Work 100 times'),
  ('ach_criminal', 'Wanted', 'Commit 50 crimes'),
  ('ach_explorer', 'Explorer', 'Complete 100 adventures'),
  ('ach_collector', 'Collector', 'Own 50 different items'),
  ('ach_legend', 'Legend', 'Reach level 100')
ON CONFLICT (achievement_key) DO NOTHING;

-- Cooldowns table for fine-grained cooldown tracking
CREATE TABLE IF NOT EXISTS cooldowns (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, action_key)
);

CREATE INDEX IF NOT EXISTS cooldowns_expires_at_idx ON cooldowns(expires_at);

-- RPG profile registration metadata
ALTER TABLE users ADD COLUMN IF NOT EXISTS registered BOOLEAN NOT NULL DEFAULT FALSE;

-- Correct achievement catalog: achievements are unlocked per user; catalog is stored as items for compatibility.
-- No destructive migration is performed here.
