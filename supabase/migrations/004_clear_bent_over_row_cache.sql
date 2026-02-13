-- Clear cached image for barbell bent-over row so new WorkoutLabs-style image can be generated
UPDATE exercise_cache
SET image_data_url = NULL, updated_at = now()
WHERE name_key IN (
  'barbell bent-over row',
  'barbell bent over row',
  'barbell bent-over rows',
  'barbell bent over rows'
)
OR name_key ILIKE 'barbell%bent%row%';
