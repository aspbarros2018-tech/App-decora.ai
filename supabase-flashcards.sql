-- Create a table for flashcards
create table public.flashcards (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  topic text not null,
  question text not null,
  answer text not null,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.flashcards enable row level security;

-- Create a policy that allows anyone to read flashcards (since they are study materials)
-- If you want to restrict this to only logged-in users, you can use:
-- create policy "Anyone authenticated can view flashcards." on public.flashcards for select using (auth.role() = 'authenticated');
create policy "Anyone can view flashcards." on public.flashcards
  for select using (true);

-- Only admins (or specific roles) should be able to insert/update/delete, 
-- but for now, we'll restrict it so no one can modify them from the app directly,
-- you will manage them via the Supabase Dashboard.
