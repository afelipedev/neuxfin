-- Avatars: cada usuário só grava, altera e apaga na própria pasta (<uid>/arquivo).
-- O bucket é público: a imagem abre pela URL pública sem policy de SELECT; a policy de
-- SELECT fica restrita à própria pasta para não permitir listar arquivos (e ids) de outros.
alter policy "Allow authenticated uploads" on storage.objects
    to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "Allow individual update" on storage.objects
    to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "Allow individual delete" on storage.objects
    to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "Allow public select" on storage.objects
    to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Só imagens de até 2 MB
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 where id = 'avatars';
