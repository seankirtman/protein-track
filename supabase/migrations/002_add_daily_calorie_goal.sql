-- Add daily_calorie_goal to profiles (optional override for estimated calorie target)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_calorie_goal numeric;
