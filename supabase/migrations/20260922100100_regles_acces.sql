-- =====================================================================
-- LSES Fighting — 2/4 : règles d'accès
-- Principe : Supabase accorde par défaut tous les droits sur les tables
-- du schéma public aux rôles anon et authenticated. Nous retirons ces
-- droits, puis nous rendons uniquement ce qui est nécessaire, colonne
-- par colonne pour les écritures. La sécurité au niveau des lignes (RLS)
-- filtre ensuite ce que chacun voit. Les changements de statut (publier,
-- refuser, valider un coach) ne passent jamais par une écriture directe :
-- ils passent par les fonctions de la migration 3.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Réglages métier, modifiables en une ligne
-- ---------------------------------------------------------------------
-- Âge à partir duquel l'autorisation d'un responsable légal n'est plus requise
create or replace function private.majority_age()
returns integer language sql immutable set search_path = '' as $$ select 18 $$;

-- Délai laissé aux coachs avant l'escalade vers le superviseur général
create or replace function private.review_delay()
returns interval language sql immutable set search_path = '' as $$ select interval '7 days' $$;

-- ---------------------------------------------------------------------
-- Fonctions d'aide (SECURITY DEFINER : elles lisent les tables sans
-- déclencher récursivement les règles RLS ; search_path vide contre le
-- détournement de fonctions)
-- ---------------------------------------------------------------------
create or replace function private.current_app_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function private.is_superviseur()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role = 'superviseur' from public.profiles where id = (select auth.uid())),
    false
  )
$$;

-- Coach référencé : fiche de coach validée. Le superviseur général peut
-- aussi avoir une fiche de coach (c'est le cas du client).
create or replace function private.is_approved_coach()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.coaches c
    join public.profiles p on p.id = c.id
    where c.id = (select auth.uid())
      and c.status = 'approved'
      and p.role in ('coach', 'superviseur')
  )
$$;

-- Peut vérifier des fiches d'athlètes : coach référencé ou superviseur
create or replace function private.is_reviewer()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_superviseur() or private.is_approved_coach()
$$;

create or replace function private.is_minor(p_birth_date date)
returns boolean
language sql stable set search_path = ''
as $$
  select p_birth_date is null
      or p_birth_date > (current_date - make_interval(years => private.majority_age()))
$$;

create or replace function private.athlete_is_minor(p_athlete_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_minor(
    (select birth_date from public.athlete_private where athlete_id = p_athlete_id)
  )
$$;

-- Nom affiché dans le journal d'audit
create or replace function private.display_name(p_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select nullif(trim(concat_ws(' ', first_names, last_name)), '') from public.coaches where id = p_id),
    (select nullif(trim(concat_ws(' ', first_names, last_name)), '') from public.athletes where id = p_id)
  )
$$;

-- Écriture dans le journal d'audit (seul chemin d'écriture autorisé)
create or replace function private.log(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_details jsonb default '{}'::jsonb,
  p_automatic boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := case when p_automatic then null else (select auth.uid()) end;
begin
  insert into public.audit_log (actor_id, actor_label, automatic, action, target_type, target_id, target_label, details)
  values (
    v_actor,
    private.display_name(v_actor),
    p_automatic,
    p_action,
    p_target_type,
    p_target_id,
    private.display_name(p_target_id),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

-- Variante limitée pour les déclencheurs exécutés avec les droits de
-- l'utilisateur : on ne peut journaliser qu'une action sur sa propre fiche,
-- choisie dans une liste fermée.
create or replace function private.log_self(p_action text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_action not in ('athlete.consent_withdrawn', 'coach.consent_withdrawn') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.log(p_action, split_part(p_action, '.', 1), (select auth.uid()));
end;
$$;

-- Aucune de ces fonctions n'est appelable depuis l'API : le schéma private
-- n'est pas exposé. Les règles RLS ont besoin des quatre fonctions d'aide,
-- les déclencheurs de log_self et de check_own_photo (plus bas).
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_superviseur(),
  private.is_approved_coach(),
  private.is_reviewer(),
  private.current_app_role()
to anon, authenticated;

-- ---------------------------------------------------------------------
-- Journal d'audit immuable : aucune ligne ne peut être modifiée ni
-- supprimée, y compris par le superviseur ou la clé de service.
-- ---------------------------------------------------------------------
create or replace function private.forbid_audit_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'audit_log_is_append_only'
    using errcode = '42501', hint = 'Le journal d''audit est en écriture seule.';
end;
$$;

create trigger audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function private.forbid_audit_change();
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.forbid_audit_change();

-- ---------------------------------------------------------------------
-- Contrôles d'intégrité à l'écriture
-- ---------------------------------------------------------------------

-- Photo : le chemin doit pointer dans le dossier de la personne elle-même,
-- sinon on pourrait rendre publique la photo de quelqu'un d'autre.
create or replace function private.check_own_photo(p_owner uuid, p_path text)
returns void
language plpgsql immutable set search_path = ''
as $$
begin
  if p_path is not null and split_part(p_path, '/', 1) <> p_owner::text then
    raise exception 'invalid_photo_path'
      using errcode = '42501', hint = 'La photo doit se trouver dans votre propre dossier.';
  end if;
end;
$$;

revoke all on function private.check_own_photo(uuid, text) from public;
grant execute on function private.check_own_photo(uuid, text), private.log_self(text) to authenticated;

-- Athlètes : verrouillage de l'identité après publication, signalement
-- « modifiée, à revoir », consentement horodaté par le serveur.
create or replace function private.athletes_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- Ces contrôles visent les écritures faites depuis le site (rôle
  -- authenticated). Les fonctions du circuit de validation s'exécutent avec
  -- les droits de leur propriétaire : elles ne sont pas concernées.
  if current_user <> 'authenticated' then
    return new;
  end if;

  perform private.check_own_photo(new.id, new.photo_path);

  if new.coach_id is not null and new.coach_id is distinct from old.coach_id
     and not exists (select 1 from public.coaches where id = new.coach_id and status = 'approved') then
    raise exception 'coach_not_approved'
      using errcode = '23514', hint = 'Le coach choisi n''est pas référencé.';
  end if;

  -- consentement : l'horodatage vient toujours du serveur
  if new.publication_consent_at is not null then
    new.publication_consent_at := coalesce(old.publication_consent_at, now());
  end if;

  if old.status = 'approved' then
    if new.last_name is distinct from old.last_name
       or new.first_names is distinct from old.first_names
       or new.discipline is distinct from old.discipline
       or new.sex is distinct from old.sex then
      raise exception 'identity_locked'
        using errcode = '42501', hint = 'Nom, prénoms, sexe et discipline ne changent plus après publication.';
    end if;

    if new.publication_consent_at is null then
      -- retrait du consentement : la fiche quitte immédiatement le site
      new.status := 'draft';
      new.modified_since_review := false;
      perform private.log_self('athlete.consent_withdrawn');
    elsif row(new.weight_class, new.city, new.bio, new.photo_path, new.practice_since, new.fights_count, new.coach_id)
          is distinct from
          row(old.weight_class, old.city, old.bio, old.photo_path, old.practice_since, old.fights_count, old.coach_id) then
      -- la fiche reste en ligne, mais son coach la voit « modifiée, à revoir »
      new.modified_since_review := true;
    end if;
  end if;

  return new;
end;
$$;

create trigger athletes_guard before update on public.athletes
  for each row execute function private.athletes_guard();

-- Date de naissance : verrouillée une fois la fiche publiée
create or replace function private.athlete_private_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.birth_date is not null and new.birth_date > current_date then
    raise exception 'invalid_birth_date' using errcode = '23514';
  end if;

  if new.birth_date is distinct from old.birth_date
     and exists (select 1 from public.athletes where id = new.athlete_id and status = 'approved') then
    raise exception 'identity_locked'
      using errcode = '42501', hint = 'La date de naissance ne change plus après publication.';
  end if;

  return new;
end;
$$;

create trigger athlete_private_guard before update on public.athlete_private
  for each row execute function private.athlete_private_guard();

-- Coachs : même logique d'identité et de consentement
create or replace function private.coaches_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  perform private.check_own_photo(new.id, new.photo_path);

  if new.publication_consent_at is not null then
    new.publication_consent_at := coalesce(old.publication_consent_at, now());
  end if;

  if old.status = 'approved' then
    if new.last_name is distinct from old.last_name
       or new.first_names is distinct from old.first_names then
      raise exception 'identity_locked'
        using errcode = '42501', hint = 'Nom et prénoms ne changent plus après validation.';
    end if;

    if new.publication_consent_at is null then
      new.status := 'draft';
      perform private.log_self('coach.consent_withdrawn');
    end if;
  end if;

  return new;
end;
$$;

create trigger coaches_guard before update on public.coaches
  for each row execute function private.coaches_guard();

-- Audit des changements de rôle (y compris ceux faits depuis la console SQL)
create or replace function private.audit_role_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    perform private.log(
      'profile.role_changed', 'profile', new.id,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit_role after update of role on public.profiles
  for each row execute function private.audit_role_change();

-- Audit des médias et des actualités (écrits directement par le superviseur)
create or replace function private.audit_media()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log('media.created', 'media', new.id,
      jsonb_build_object('discipline', new.discipline, 'kind', new.kind, 'title', new.title_fr));
    return new;
  else
    perform private.log('media.deleted', 'media', old.id,
      jsonb_build_object('discipline', old.discipline, 'kind', old.kind, 'title', old.title_fr));
    return old;
  end if;
end;
$$;

create trigger media_audit after insert or delete on public.media
  for each row execute function private.audit_media();

create or replace function private.news_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    perform private.log('news.published', 'news', new.id, jsonb_build_object('title', new.title_fr));
  end if;
  return new;
end;
$$;

create trigger news_before_write before insert or update on public.news
  for each row execute function private.news_before_write();

-- ---------------------------------------------------------------------
-- Index des clés étrangères de traçabilité (recommandation du conseiller
-- de performance Supabase)
-- ---------------------------------------------------------------------
create index coaches_reviewed_by_idx on public.coaches (reviewed_by);
create index athletes_reviewed_by_idx on public.athletes (reviewed_by);
create index athlete_private_attested_by_idx on public.athlete_private (guardian_attested_by);
create index review_requests_decided_by_idx on public.review_requests (decided_by);
create index palmares_entries_reviewed_by_idx on public.palmares_entries (reviewed_by);
create index media_created_by_idx on public.media (created_by);
create index news_created_by_idx on public.news (created_by);

-- ---------------------------------------------------------------------
-- Privilèges : on retire tout, puis on rend le strict nécessaire
-- ---------------------------------------------------------------------
revoke all on
  public.profiles, public.coaches, public.athletes, public.athlete_private,
  public.review_requests, public.palmares_entries, public.media, public.news,
  public.audit_log
from anon, authenticated;

-- Lecture (la RLS filtre les lignes)
grant select on public.athletes, public.coaches, public.palmares_entries, public.media, public.news
  to anon, authenticated;
grant select on public.profiles, public.athlete_private, public.review_requests, public.audit_log
  to authenticated;

-- Écritures des athlètes et des coachs sur leur propre fiche, colonne par
-- colonne : statut, slug et champs de vérification restent hors d'atteinte.
grant update (
  last_name, first_names, sex, discipline, weight_class, city, bio, photo_path,
  practice_since, fights_count, coach_id, publication_consent_at
) on public.athletes to authenticated;

grant update (birth_date) on public.athlete_private to authenticated;

grant update (
  last_name, first_names, disciplines, city, dojo_name, experience_years, bio,
  photo_path, publication_consent_at
) on public.coaches to authenticated;

grant insert (athlete_id, competition, year, location, weight_class, result),
      update (competition, year, location, weight_class, result),
      delete
  on public.palmares_entries to authenticated;

-- Suppression d'une fiche (retrait demandé via les mentions légales) : superviseur
grant delete on public.athletes, public.coaches to authenticated;

-- Médias et actualités : écriture réservée au superviseur (voir RLS)
grant insert, update, delete on public.media, public.news to authenticated;

-- La clé de service elle-même ne peut ni modifier ni vider le journal
revoke update, delete, truncate on public.audit_log from service_role;

-- ---------------------------------------------------------------------
-- Sécurité au niveau des lignes (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.athletes enable row level security;
alter table public.athlete_private enable row level security;
alter table public.review_requests enable row level security;
alter table public.palmares_entries enable row level security;
alter table public.media enable row level security;
alter table public.news enable row level security;
alter table public.audit_log enable row level security;

-- Une seule règle par table, par action et par rôle : c'est plus lisible
-- et évite l'évaluation de plusieurs règles cumulées à chaque requête.

-- profiles
create policy "profiles: lecture" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_superviseur()));

-- coaches
create policy "coaches: lecture publique" on public.coaches
  for select to anon
  using (status = 'approved');
create policy "coaches: lecture" on public.coaches
  for select to authenticated
  using (
    status = 'approved'
    or id = (select auth.uid())
    or (select private.is_superviseur())
  );
create policy "coaches: modification de sa fiche" on public.coaches
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "coaches: suppression par le superviseur" on public.coaches
  for delete to authenticated
  using ((select private.is_superviseur()));

-- athletes
create policy "athletes: lecture publique" on public.athletes
  for select to anon
  using (status = 'approved');
create policy "athletes: lecture" on public.athletes
  for select to authenticated
  using (
    status = 'approved'
    or id = (select auth.uid())
    or (status <> 'draft' and (select private.is_reviewer()))
  );
create policy "athletes: modification de sa fiche" on public.athletes
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "athletes: suppression par le superviseur" on public.athletes
  for delete to authenticated
  using ((select private.is_superviseur()));

-- athlete_private : l'athlète et le superviseur uniquement. Les coachs ne
-- lisent pas la date de naissance : ils obtiennent l'âge des athlètes en
-- attente par la fonction pending_athlete_ages().
create policy "athlete_private: lecture" on public.athlete_private
  for select to authenticated
  using (athlete_id = (select auth.uid()) or (select private.is_superviseur()));
create policy "athlete_private: modification de ses données" on public.athlete_private
  for update to authenticated
  using (athlete_id = (select auth.uid()))
  with check (athlete_id = (select auth.uid()));

-- review_requests : ses propres demandes ; la file des athlètes est visible
-- par tous les coachs référencés ; tout est visible du superviseur
create policy "review_requests: lecture" on public.review_requests
  for select to authenticated
  using (
    athlete_id = (select auth.uid())
    or coach_id = (select auth.uid())
    or (kind <> 'coach_account' and (select private.is_approved_coach()))
    or (select private.is_superviseur())
  );

-- palmares_entries
create policy "palmares: lecture publique" on public.palmares_entries
  for select to anon
  using (
    status = 'approved'
    and exists (select 1 from public.athletes a where a.id = athlete_id and a.status = 'approved')
  );
create policy "palmares: lecture" on public.palmares_entries
  for select to authenticated
  using (
    athlete_id = (select auth.uid())
    or (
      status = 'approved'
      and exists (select 1 from public.athletes a where a.id = athlete_id and a.status = 'approved')
    )
    or (
      (select private.is_reviewer())
      and exists (select 1 from public.athletes a where a.id = athlete_id and a.status <> 'draft')
    )
  );
create policy "palmares: ajout à son palmarès" on public.palmares_entries
  for insert to authenticated
  with check (
    athlete_id = (select auth.uid())
    and exists (select 1 from public.athletes a where a.id = athlete_id)
  );
create policy "palmares: modification d'une entrée non vérifiée" on public.palmares_entries
  for update to authenticated
  using (athlete_id = (select auth.uid()) and status = 'pending')
  with check (athlete_id = (select auth.uid()));
create policy "palmares: suppression" on public.palmares_entries
  for delete to authenticated
  using (athlete_id = (select auth.uid()) or (select private.is_superviseur()));

-- media
create policy "media: lecture publique" on public.media
  for select to anon, authenticated
  using (true);
create policy "media: ajout par le superviseur" on public.media
  for insert to authenticated
  with check ((select private.is_superviseur()));
create policy "media: modification par le superviseur" on public.media
  for update to authenticated
  using ((select private.is_superviseur()))
  with check ((select private.is_superviseur()));
create policy "media: suppression par le superviseur" on public.media
  for delete to authenticated
  using ((select private.is_superviseur()));

-- news
create policy "news: lecture publique" on public.news
  for select to anon
  using (status = 'published' and published_at <= now());
create policy "news: lecture" on public.news
  for select to authenticated
  using ((status = 'published' and published_at <= now()) or (select private.is_superviseur()));
create policy "news: ajout par le superviseur" on public.news
  for insert to authenticated
  with check ((select private.is_superviseur()));
create policy "news: modification par le superviseur" on public.news
  for update to authenticated
  using ((select private.is_superviseur()))
  with check ((select private.is_superviseur()));
create policy "news: suppression par le superviseur" on public.news
  for delete to authenticated
  using ((select private.is_superviseur()));

-- audit_log : lecture par le superviseur, aucune écriture directe
create policy "audit_log: lecture par le superviseur" on public.audit_log
  for select to authenticated
  using ((select private.is_superviseur()));
