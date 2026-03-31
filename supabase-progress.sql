-- Create a table for user progress on flashcards
create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  flashcard_id uuid references public.flashcards not null,
  difficulty text not null check (difficulty in ('easy', 'hard')),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, flashcard_id)
);

-- Set up Row Level Security (RLS)
alter table public.user_progress enable row level security;

-- Create policies
create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

-- Admins can view all progress
create policy "Admins can view all progress"
  on public.user_progress for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and (
        auth.jwt() ->> 'email' = 'aspbarros2018@gmail.com'
      )
    )
  );
