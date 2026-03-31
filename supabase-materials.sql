-- Create a table for materials (PDFs)
create table public.materials (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  course text not null,
  file_url text not null,
  size text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.materials enable row level security;

-- Create a policy that allows anyone authenticated to read materials
create policy "Anyone authenticated can view materials." on public.materials
  for select using (auth.role() = 'authenticated');

-- Allow admins to insert materials
create policy "Admins can insert materials." on public.materials
  for insert with check ((auth.jwt() ->> 'email') = 'aspbarros2018@gmail.com');

-- Create a storage bucket for PDFs
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', true);

-- Allow public access to read PDFs
create policy "Public Access" on storage.objects for select using ( bucket_id = 'pdfs' );

-- Allow authenticated users to upload PDFs
create policy "Auth Uploads" on storage.objects for insert with check ( bucket_id = 'pdfs' AND auth.role() = 'authenticated' );
