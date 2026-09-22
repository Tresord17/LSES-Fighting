-- =====================================================================
-- LSES Fighting — 4/4 : stockage des fichiers
-- profile-photos : bucket PRIVÉ. Une photo n'est lisible par le public
--   qu'une fois la fiche en ligne, et seulement s'il s'agit de la photo
--   déclarée sur la fiche. Le site sert ces photos par URL signée.
-- media : bucket PUBLIC pour les images et vidéos des pages disciplines
--   et des actualités, alimenté par le superviseur général uniquement.
-- Rangement : profile-photos/<id du compte>/<fichier>
--             media/<sambo|mma|actualites>/<fichier>
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photos', 'profile-photos', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  -- 50 Mo : plafond par fichier du plan gratuit de Supabase
  ('media', 'media', true, 52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Une règle par action et par rôle, qui couvre les deux buckets.
-- « Son dossier » : premier segment du chemin égal à l'identifiant du compte.

create policy "fichiers: dépôt" on storage.objects
  for insert to authenticated
  with check (
    (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
    or (bucket_id = 'media' and (select private.is_superviseur()))
  );

create policy "fichiers: remplacement" on storage.objects
  for update to authenticated
  using (
    (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
    or (bucket_id = 'media' and (select private.is_superviseur()))
  )
  with check (
    (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
    or (bucket_id = 'media' and (select private.is_superviseur()))
  );

create policy "fichiers: suppression" on storage.objects
  for delete to authenticated
  using (
    (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
    or (bucket_id = 'media' and (select private.is_superviseur()))
  );

-- Lecture des photos de profil. Le bucket media, public, n'a pas besoin de
-- règle de lecture : ses fichiers se téléchargent par URL publique, et
-- l'absence de règle empêche d'en lister le contenu.
create policy "fichiers: lecture publique des photos en ligne" on storage.objects
  for select to anon
  using (
    bucket_id = 'profile-photos'
    and (
      exists (select 1 from public.athletes a where a.status = 'approved' and a.photo_path = objects.name)
      or exists (select 1 from public.coaches c where c.status = 'approved' and c.photo_path = objects.name)
    )
  );

create policy "fichiers: lecture des photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_reviewer())
      or exists (select 1 from public.athletes a where a.status = 'approved' and a.photo_path = objects.name)
      or exists (select 1 from public.coaches c where c.status = 'approved' and c.photo_path = objects.name)
    )
  );
