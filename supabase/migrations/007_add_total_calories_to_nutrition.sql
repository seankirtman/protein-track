alter table nutrition
  add column if not exists total_calories numeric default 0;

update nutrition
set total_calories = 0
where total_calories is null;
