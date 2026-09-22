-- =====================================================================
-- LSES Fighting — 3/4 : circuit de validation
-- Inscription → profil → soumission → vérification par un coach sous
-- sept jours → escalade automatique au superviseur général.
-- Toutes les fonctions publiques ci-dessous sont appelées depuis le site
-- avec supabase.rpc(...). Elles vérifient elles-mêmes qui appelle,
-- modifient les statuts et écrivent le journal d'audit dans la même
-- transaction. Les erreurs renvoient une clé stable (ex. « forbidden »)
-- que le site traduit, et une explication en français dans « hint ».
-- =====================================================================

-- ---------------------------------------------------------------------
-- Outils internes
-- ---------------------------------------------------------------------
create or replace function private.slugify(p_text text)
returns text
language sql stable set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

-- Adresse lisible et unique pour les fiches publiques : /athletes/mballa-armand
create or replace function private.unique_slug(p_table text, p_label text, p_id uuid)
returns text
language plpgsql set search_path = ''
as $$
declare
  v_base text := left(private.slugify(p_label), 60);
  v_candidate text;
  v_taken boolean;
  v_i integer := 1;
begin
  if p_table not in ('athletes', 'coaches') then
    raise exception 'invalid_table';
  end if;
  if v_base = '' then
    v_base := left(replace(p_id::text, '-', ''), 8);
  end if;
  v_candidate := v_base;
  loop
    execute format('select exists (select 1 from public.%I where slug = $1 and id <> $2)', p_table)
      into v_taken using v_candidate, p_id;
    exit when not v_taken;
    v_i := v_i + 1;
    v_candidate := v_base || '-' || v_i;
  end loop;
  return v_candidate;
end;
$$;

create or replace function private.require_auth()
returns uuid
language plpgsql stable set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000', hint = 'Connexion requise.';
  end if;
  return v_uid;
end;
$$;

-- Attribution du rôle athlète ou coach, avec création de la fiche vide
create or replace function private.assign_role(p_user uuid, p_role public.app_role)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_current public.app_role;
begin
  if p_role not in ('athlete', 'coach') then
    raise exception 'role_not_allowed' using errcode = '42501', hint = 'Seuls les rôles athlète et coach peuvent être choisis.';
  end if;

  select role into v_current from public.profiles where id = p_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_current = p_role then
    return;
  end if;
  if v_current is not null then
    raise exception 'role_already_chosen' using errcode = '42501', hint = 'Le rôle de ce compte est déjà défini.';
  end if;

  update public.profiles set role = p_role where id = p_user;
  if p_role = 'athlete' then
    insert into public.athletes (id) values (p_user) on conflict (id) do nothing;
    insert into public.athlete_private (athlete_id) values (p_user) on conflict (athlete_id) do nothing;
  else
    insert into public.coaches (id) values (p_user) on conflict (id) do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Création automatique du compte applicatif à l'inscription
-- Le rôle choisi sur la page d'inscription arrive dans les métadonnées
-- (options.data.role). Avec Google, il est choisi juste après, via choose_role.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  if v_role in ('athlete', 'coach') then
    perform private.assign_role(new.id, v_role::public.app_role);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Rattachement automatique des entrées de palmarès à une demande
-- ---------------------------------------------------------------------
create or replace function private.attach_palmares_entry()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.review_status;
  v_request uuid;
begin
  select status into v_status from public.athletes where id = new.athlete_id;

  if v_status = 'approved' then
    -- fiche déjà en ligne : l'entrée rejoint (ou ouvre) une demande « ajout de palmarès »
    select id into v_request from public.review_requests
      where kind = 'palmares' and athlete_id = new.athlete_id and status = 'open';
    if v_request is null then
      insert into public.review_requests (kind, athlete_id, due_at)
        values ('palmares', new.athlete_id, now() + private.review_delay())
        returning id into v_request;
      perform private.log('palmares.submitted', 'athlete', new.athlete_id,
        jsonb_build_object('request_id', v_request));
    end if;
  elsif v_status = 'pending' then
    -- fiche en attente : l'entrée est vérifiée avec le profil
    select id into v_request from public.review_requests
      where kind = 'athlete_profile' and athlete_id = new.athlete_id and status = 'open';
  end if;

  if v_request is not null then
    update public.palmares_entries set review_request_id = v_request where id = new.id;
  end if;
  return new;
end;
$$;

create trigger palmares_entries_attach
  after insert on public.palmares_entries
  for each row execute function private.attach_palmares_entry();

-- ---------------------------------------------------------------------
-- 1. Choix du rôle (inscription via Google)
-- ---------------------------------------------------------------------
create or replace function public.choose_role(p_role public.app_role)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.assign_role(private.require_auth(), p_role);
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Soumission d'une fiche d'athlète
-- ---------------------------------------------------------------------
create or replace function public.submit_athlete_profile()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := private.require_auth();
  v_athlete public.athletes;
  v_birth date;
  v_request uuid;
begin
  select * into v_athlete from public.athletes where id = v_uid for update;
  if not found then
    raise exception 'not_an_athlete' using errcode = '42501', hint = 'Ce compte n''a pas de fiche d''athlète.';
  end if;
  if v_athlete.status not in ('draft', 'rejected') then
    raise exception 'invalid_status' using errcode = '55000', hint = 'Cette fiche est déjà en attente ou en ligne.';
  end if;

  select birth_date into v_birth from public.athlete_private where athlete_id = v_uid;

  if v_athlete.last_name is null or v_athlete.first_names is null or v_athlete.sex is null
     or v_athlete.discipline is null or v_athlete.weight_class is null or v_athlete.city is null
     or v_birth is null then
    raise exception 'profile_incomplete' using errcode = '23502', hint = 'Nom, prénoms, sexe, discipline, catégorie, ville et date de naissance sont obligatoires.';
  end if;
  if v_athlete.publication_consent_at is null then
    raise exception 'consent_required' using errcode = '23502', hint = 'L''accord de publication est obligatoire.';
  end if;

  insert into public.review_requests (kind, athlete_id, due_at)
    values ('athlete_profile', v_uid, now() + private.review_delay())
    returning id into v_request;

  update public.palmares_entries
    set review_request_id = v_request
    where athlete_id = v_uid and status = 'pending';

  update public.athletes set status = 'pending' where id = v_uid;

  perform private.log('athlete.submitted', 'athlete', v_uid,
    jsonb_build_object('request_id', v_request, 'minor', private.is_minor(v_birth)));
  return v_request;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Soumission d'une fiche de coach (validée par le superviseur)
-- ---------------------------------------------------------------------
create or replace function public.submit_coach_profile()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := private.require_auth();
  v_coach public.coaches;
  v_request uuid;
begin
  select * into v_coach from public.coaches where id = v_uid for update;
  if not found then
    raise exception 'not_a_coach' using errcode = '42501', hint = 'Ce compte n''a pas de fiche de coach.';
  end if;
  if v_coach.status not in ('draft', 'rejected') then
    raise exception 'invalid_status' using errcode = '55000', hint = 'Cette fiche est déjà en attente ou validée.';
  end if;
  if v_coach.last_name is null or v_coach.first_names is null or v_coach.city is null
     or cardinality(v_coach.disciplines) = 0 then
    raise exception 'profile_incomplete' using errcode = '23502', hint = 'Nom, prénoms, ville et discipline sont obligatoires.';
  end if;
  if v_coach.publication_consent_at is null then
    raise exception 'consent_required' using errcode = '23502', hint = 'L''accord de publication est obligatoire.';
  end if;

  insert into public.review_requests (kind, coach_id) values ('coach_account', v_uid)
    returning id into v_request;
  update public.coaches set status = 'pending' where id = v_uid;

  perform private.log('coach.submitted', 'coach', v_uid, jsonb_build_object('request_id', v_request));
  return v_request;
end;
$$;

-- ---------------------------------------------------------------------
-- Contrôles communs aux décisions sur les demandes d'athlètes
-- ---------------------------------------------------------------------
create or replace function private.lock_athlete_request(p_request_id uuid, p_kind public.request_kind)
returns public.review_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_request public.review_requests;
  v_is_superviseur boolean := private.is_superviseur();
begin
  perform private.require_auth();
  if not (v_is_superviseur or private.is_approved_coach()) then
    raise exception 'forbidden' using errcode = '42501', hint = 'Réservé aux coachs référencés et au superviseur général.';
  end if;

  select * into v_request from public.review_requests where id = p_request_id for update;
  if not found or v_request.kind <> p_kind then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'open' then
    raise exception 'request_closed' using errcode = '55000', hint = 'Cette demande a déjà été traitée.';
  end if;
  if v_request.escalated_at is not null and not v_is_superviseur then
    raise exception 'request_escalated' using errcode = '42501', hint = 'Le délai de sept jours est dépassé : la décision revient au superviseur général.';
  end if;
  return v_request;
end;
$$;

create or replace function private.close_request(
  p_request_id uuid, p_approved boolean, p_reason text
)
returns void
language sql security definer set search_path = ''
as $$
  update public.review_requests
    set status = case when p_approved then 'approved'::public.request_status else 'rejected'::public.request_status end,
        decided_by = (select auth.uid()),
        decided_at = now(),
        decision_reason = nullif(trim(p_reason), '')
    where id = p_request_id
$$;

create or replace function private.require_reason(p_approve boolean, p_reason text)
returns void
language plpgsql immutable set search_path = ''
as $$
begin
  if not p_approve and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'reason_required' using errcode = '23502', hint = 'Un motif est obligatoire pour un refus.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Décision sur une fiche d'athlète
-- p_guardian_attested : le coach atteste avoir reçu l'autorisation écrite
-- du responsable légal (obligatoire pour valider un mineur).
-- p_rejected_entry_ids : entrées de palmarès écartées lors d'une validation.
-- ---------------------------------------------------------------------
create or replace function public.review_athlete_profile(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null,
  p_guardian_attested boolean default false,
  p_rejected_entry_ids uuid[] default '{}'
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_request public.review_requests := private.lock_athlete_request(p_request_id, 'athlete_profile');
  v_uid uuid := (select auth.uid());
  v_minor boolean := private.athlete_is_minor(v_request.athlete_id);
  v_athlete public.athletes;
begin
  perform private.require_reason(p_approve, p_reason);

  if p_approve then
    if v_minor and not coalesce(p_guardian_attested, false) then
      raise exception 'guardian_attestation_required' using errcode = '42501',
        hint = 'Athlète mineur : l''autorisation écrite d''un responsable légal doit être attestée.';
    end if;

    select * into v_athlete from public.athletes where id = v_request.athlete_id for update;

    update public.athletes set
      status = 'approved',
      published_at = coalesce(published_at, now()),
      reviewed_by = v_uid,
      reviewed_at = now(),
      modified_since_review = false,
      slug = coalesce(slug, private.unique_slug('athletes', concat_ws(' ', v_athlete.last_name, v_athlete.first_names), id))
    where id = v_request.athlete_id;

    if v_minor then
      update public.athlete_private
        set guardian_attested_by = v_uid, guardian_attested_at = now()
        where athlete_id = v_request.athlete_id;
    end if;

    update public.palmares_entries set
      status = case when id = any(p_rejected_entry_ids) then 'rejected'::public.entry_status else 'approved'::public.entry_status end,
      rejection_reason = case when id = any(p_rejected_entry_ids) then nullif(trim(p_reason), '') end,
      reviewed_by = v_uid,
      reviewed_at = now()
    where athlete_id = v_request.athlete_id and status = 'pending';
  else
    update public.athletes set status = 'rejected', reviewed_by = v_uid, reviewed_at = now()
      where id = v_request.athlete_id;
  end if;

  perform private.close_request(p_request_id, p_approve, p_reason);
  perform private.log(
    case when p_approve then 'athlete.approved' else 'athlete.rejected' end,
    'athlete', v_request.athlete_id,
    jsonb_build_object('request_id', p_request_id, 'reason', nullif(trim(p_reason), ''),
      'minor', v_minor, 'escalated', v_request.escalated_at is not null)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Décision sur un ajout de palmarès (fiche déjà en ligne)
-- ---------------------------------------------------------------------
create or replace function public.review_palmares(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null,
  p_rejected_entry_ids uuid[] default '{}'
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_request public.review_requests := private.lock_athlete_request(p_request_id, 'palmares');
  v_uid uuid := (select auth.uid());
begin
  perform private.require_reason(p_approve, p_reason);

  update public.palmares_entries set
    status = case
      when p_approve and not (id = any(p_rejected_entry_ids)) then 'approved'::public.entry_status
      else 'rejected'::public.entry_status
    end,
    rejection_reason = case
      when p_approve and not (id = any(p_rejected_entry_ids)) then null
      else nullif(trim(p_reason), '')
    end,
    reviewed_by = v_uid,
    reviewed_at = now()
  where review_request_id = p_request_id and status = 'pending';

  perform private.close_request(p_request_id, p_approve, p_reason);
  perform private.log(
    case when p_approve then 'palmares.approved' else 'palmares.rejected' end,
    'athlete', v_request.athlete_id,
    jsonb_build_object('request_id', p_request_id, 'reason', nullif(trim(p_reason), ''),
      'rejected_entries', to_jsonb(p_rejected_entry_ids))
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Décision sur un compte de coach (superviseur général uniquement)
-- ---------------------------------------------------------------------
create or replace function public.review_coach_account(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := private.require_auth();
  v_request public.review_requests;
  v_coach public.coaches;
begin
  if not private.is_superviseur() then
    raise exception 'forbidden' using errcode = '42501', hint = 'Réservé au superviseur général.';
  end if;
  perform private.require_reason(p_approve, p_reason);

  select * into v_request from public.review_requests where id = p_request_id for update;
  if not found or v_request.kind <> 'coach_account' then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_request.status <> 'open' then
    raise exception 'request_closed' using errcode = '55000', hint = 'Cette demande a déjà été traitée.';
  end if;

  select * into v_coach from public.coaches where id = v_request.coach_id for update;

  if p_approve then
    update public.coaches set
      status = 'approved',
      approved_at = coalesce(approved_at, now()),
      reviewed_by = v_uid,
      reviewed_at = now(),
      slug = coalesce(slug, private.unique_slug('coaches', concat_ws(' ', v_coach.last_name, v_coach.first_names), id))
    where id = v_request.coach_id;
  else
    update public.coaches set status = 'rejected', reviewed_by = v_uid, reviewed_at = now()
      where id = v_request.coach_id;
  end if;

  perform private.close_request(p_request_id, p_approve, p_reason);
  perform private.log(
    case when p_approve then 'coach.approved' else 'coach.rejected' end,
    'coach', v_request.coach_id,
    jsonb_build_object('request_id', p_request_id, 'reason', nullif(trim(p_reason), ''))
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 7. « Modifiée, à revoir » : le coach confirme avoir relu la fiche
-- ---------------------------------------------------------------------
create or replace function public.mark_athlete_reviewed(p_athlete_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_auth();
  if not private.is_reviewer() then
    raise exception 'forbidden' using errcode = '42501', hint = 'Réservé aux coachs référencés et au superviseur général.';
  end if;

  update public.athletes
    set modified_since_review = false, reviewed_by = (select auth.uid()), reviewed_at = now()
    where id = p_athlete_id and status = 'approved' and modified_since_review;
  if not found then
    raise exception 'nothing_to_review' using errcode = '55000', hint = 'Cette fiche n''est pas signalée comme modifiée.';
  end if;

  perform private.log('athlete.changes_reviewed', 'athlete', p_athlete_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Retrait d'une fiche du site (demande de retrait, abus)
-- ---------------------------------------------------------------------
create or replace function public.withdraw_profile(p_profile_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_auth();
  if not private.is_superviseur() then
    raise exception 'forbidden' using errcode = '42501', hint = 'Réservé au superviseur général.';
  end if;
  perform private.require_reason(false, p_reason);

  update public.athletes set status = 'rejected', modified_since_review = false,
    reviewed_by = (select auth.uid()), reviewed_at = now()
    where id = p_profile_id and status = 'approved';
  if found then
    perform private.log('athlete.withdrawn', 'athlete', p_profile_id, jsonb_build_object('reason', p_reason));
    return;
  end if;

  update public.coaches set status = 'rejected', reviewed_by = (select auth.uid()), reviewed_at = now()
    where id = p_profile_id and status = 'approved';
  if found then
    perform private.log('coach.withdrawn', 'coach', p_profile_id, jsonb_build_object('reason', p_reason));
    return;
  end if;

  raise exception 'profile_not_published' using errcode = 'P0002', hint = 'Aucune fiche en ligne ne correspond.';
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Âge des athlètes en attente, pour l'alerte « athlète mineur »
-- (la date de naissance elle-même n'est pas renvoyée)
-- ---------------------------------------------------------------------
create or replace function public.pending_athlete_ages()
returns table (athlete_id uuid, age integer, is_minor boolean)
language sql stable security definer set search_path = ''
as $$
  select p.athlete_id,
         extract(year from age(current_date, p.birth_date))::integer,
         private.is_minor(p.birth_date)
  from public.athlete_private p
  join public.athletes a on a.id = p.athlete_id
  where private.is_reviewer()
    and a.status = 'pending'
$$;

-- ---------------------------------------------------------------------
-- Escalade automatique au septième jour
-- ---------------------------------------------------------------------
create or replace function private.escalate_overdue_requests()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  with escalated as (
    update public.review_requests
      set escalated_at = now()
      where status = 'open'
        and escalated_at is null
        and due_at is not null
        and due_at <= now()
      returning id, kind, athlete_id
  )
  insert into public.audit_log (automatic, action, target_type, target_id, target_label, details)
  select true, 'request.escalated', 'athlete', e.athlete_id, private.display_name(e.athlete_id),
         jsonb_build_object('request_id', e.id, 'kind', e.kind)
  from escalated e;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Droits d'exécution : aucune fonction publique pour les visiteurs
-- anonymes ; les fonctions internes restent inaccessibles.
-- ---------------------------------------------------------------------
revoke all on function
  public.choose_role(public.app_role),
  public.submit_athlete_profile(),
  public.submit_coach_profile(),
  public.review_athlete_profile(uuid, boolean, text, boolean, uuid[]),
  public.review_palmares(uuid, boolean, text, uuid[]),
  public.review_coach_account(uuid, boolean, text),
  public.mark_athlete_reviewed(uuid),
  public.withdraw_profile(uuid, text),
  public.pending_athlete_ages()
from public, anon;

grant execute on function
  public.choose_role(public.app_role),
  public.submit_athlete_profile(),
  public.submit_coach_profile(),
  public.review_athlete_profile(uuid, boolean, text, boolean, uuid[]),
  public.review_palmares(uuid, boolean, text, uuid[]),
  public.review_coach_account(uuid, boolean, text),
  public.mark_athlete_reviewed(uuid),
  public.withdraw_profile(uuid, text),
  public.pending_athlete_ages()
to authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_superviseur(),
  private.is_approved_coach(),
  private.is_reviewer(),
  private.current_app_role()
to anon, authenticated;
grant execute on function private.check_own_photo(uuid, text), private.log_self(text) to authenticated;

-- ---------------------------------------------------------------------
-- Planification : vérification des échéances toutes les heures
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'lses-escalade-demandes',
  '5 * * * *',
  'select private.escalate_overdue_requests()'
);
