-- spec 019: Enable Supabase Realtime CDC for settings sync
-- Required for subscribeSettingsChanges() in services/realtime/familyChannel.ts
-- Allows child device to receive profile and category_preferences changes via postgres_changes

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE category_preferences;

-- Set REPLICA IDENTITY FULL so CDC payloads include old row values (needed for DELETE/UPDATE)
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE category_preferences REPLICA IDENTITY FULL;
