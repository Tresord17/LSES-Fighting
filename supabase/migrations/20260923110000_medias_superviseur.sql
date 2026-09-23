-- =====================================================================
-- LSES Fighting — 6 : suppression des médias par le superviseur
-- Supabase n'efface un fichier (remove) que si l'appelant peut à la fois
-- le lire (SELECT) et le supprimer (DELETE). Le bucket public « media »
-- n'avait pas de règle de lecture, pour qu'on ne puisse pas en lister le
-- contenu : les suppressions du superviseur restaient donc sans effet et
-- laissaient des fichiers orphelins. La règle de lecture des comptes
-- connectés couvre désormais aussi ce bucket, pour le seul superviseur.
-- =====================================================================

drop policy if exists "fichiers: lecture des photos" on storage.objects;

create policy "fichiers: lecture" on storage.objects
  for select to authenticated
  using (
    (
      bucket_id = 'profile-photos'
      and (
        (storage.foldername(name))[1] = (select auth.uid())::text
        or (select private.is_reviewer())
        or exists (select 1 from public.athletes a where a.status = 'approved' and a.photo_path = objects.name)
        or exists (select 1 from public.coaches c where c.status = 'approved' and c.photo_path = objects.name)
      )
    )
    or (bucket_id = 'media' and (select private.is_superviseur()))
  );
