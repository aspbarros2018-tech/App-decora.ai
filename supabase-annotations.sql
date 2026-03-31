-- Create a table for PDF annotations
create table public.pdf_annotations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  material_id uuid references public.materials not null,
  annotations jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, material_id)
);

-- Set up Row Level Security (RLS)
alter table public.pdf_annotations enable row level security;

-- Create policies
create policy "Users can view their own annotations"
  on public.pdf_annotations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own annotations"
  on public.pdf_annotations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own annotations"
  on public.pdf_annotations for update
  using (auth.uid() = user_id);
