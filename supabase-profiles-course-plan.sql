-- Add course and plan to profiles
alter table public.profiles add column if not exists course text;
alter table public.profiles add column if not exists plan text;

-- Update the trigger function to include course and plan
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, cpf, phone, course, plan)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'plan'
  );
  return new;
end;
$$ language plpgsql security definer;
