-- Transformar o bucket 'pdfs' em privado
update storage.buckets set public = false where id = 'pdfs';

-- Remover acesso público
drop policy if exists "Public Access" on storage.objects;

-- Criar política onde apenas logados têm permissão de ler o PDF
create policy "Authenticated Read Access" on storage.objects for select using ( bucket_id = 'pdfs' AND auth.role() = 'authenticated' );
