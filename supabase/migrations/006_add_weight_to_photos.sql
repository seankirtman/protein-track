-- Add weight (lbs) to photos for progress tracking and comparison
alter table photos add column if not exists weight numeric;
