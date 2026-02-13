-- Clear all cached exercise images so they can be regenerated (keeps steps)
UPDATE exercise_cache
SET image_data_url = NULL, updated_at = now()
WHERE image_data_url IS NOT NULL;
