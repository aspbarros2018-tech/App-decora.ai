-- Add last_category and last_topic to profiles
alter table public.profiles add column last_category text;
alter table public.profiles add column last_topic text;
