-- =====================================================================
-- LSES Fighting — 1/4 : schéma de base
-- Types énumérés, tables, index et horodatage automatique.
-- Les règles d'accès (RLS) sont dans la migration 2, le circuit de
-- validation dans la migration 3, le stockage des fichiers dans la 4.
-- =====================================================================

create extension if not exists unaccent with schema extensions;

-- Schéma interne, jamais exposé par l'API Supabase : fonctions d'aide
-- utilisées par les règles d'accès et par le circuit de validation.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
-- les fonctions créées ici ne sont exécutables que sur autorisation explicite
alter default privileges in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
create type public.app_role as enum ('athlete', 'coach', 'superviseur');
create type public.discipline as enum ('sambo', 'mma');
create type public.sex as enum ('female', 'male');
-- Cycle de vie d'une fiche : brouillon → en attente → validée (en ligne) ou refusée
create type public.review_status as enum ('draft', 'pending', 'approved', 'rejected');
create type public.entry_status as enum ('pending', 'approved', 'rejected');
create type public.competition_result as enum ('gold', 'silver', 'bronze', 'participation');
create type public.request_kind as enum ('athlete_profile', 'palmares', 'coach_account');
create type public.request_status as enum ('open', 'approved', 'rejected', 'cancelled');
create type public.media_kind as enum ('image', 'video', 'video_link');
create type public.publication_status as enum ('draft', 'published');

-- ---------------------------------------------------------------------
-- Horodatage automatique de updated_at
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Comptes : une ligne par utilisateur Supabase Auth
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- null tant que la personne n'a pas choisi « athlète » ou « coach »
  -- (cas d'une inscription via Google). « superviseur » ne s'attribue
  -- jamais depuis le site : voir supabase/sql/promouvoir-superviseur.sql
  role public.app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Rôle applicatif de chaque compte.';

-- ---------------------------------------------------------------------
-- Coachs
-- ---------------------------------------------------------------------
create table public.coaches (
  id uuid primary key references public.profiles (id) on delete cascade,
  last_name text check (char_length(last_name) between 1 and 80),
  first_names text check (char_length(first_names) between 1 and 120),
  disciplines public.discipline[] not null default '{}',
  city text check (char_length(city) <= 80),
  dojo_name text check (char_length(dojo_name) <= 120),
  experience_years smallint check (experience_years between 0 and 80),
  bio text check (char_length(bio) <= 1500),
  photo_path text check (char_length(photo_path) <= 300),
  publication_consent_at timestamptz,
  status public.review_status not null default 'draft',
  slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  approved_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.coaches is 'Fiche publique des coachs. Un coach validé peut vérifier les fiches d''athlètes.';

-- ---------------------------------------------------------------------
-- Athlètes (données publiables uniquement)
-- ---------------------------------------------------------------------
create table public.athletes (
  id uuid primary key references public.profiles (id) on delete cascade,
  last_name text check (char_length(last_name) between 1 and 80),
  first_names text check (char_length(first_names) between 1 and 120),
  sex public.sex,
  discipline public.discipline,
  -- catégorie de poids au format « -74 » ou « +100 »
  weight_class text check (weight_class ~ '^[+-][0-9]{2,3}$'),
  city text check (char_length(city) <= 80),
  bio text check (char_length(bio) <= 1500),
  photo_path text check (char_length(photo_path) <= 300),
  practice_since smallint check (practice_since between 1950 and 2100),
  fights_count smallint check (fights_count between 0 and 1000),
  -- coach ou dojo de rattachement, facultatif
  coach_id uuid references public.coaches (id) on delete set null,
  publication_consent_at timestamptz,
  status public.review_status not null default 'draft',
  slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  published_at timestamptz,
  -- fiche en ligne modifiée par l'athlète depuis la dernière vérification
  modified_since_review boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.athletes is 'Fiche publique des athlètes. Aucune donnée sensible : voir athlete_private.';

-- ---------------------------------------------------------------------
-- Données sensibles des athlètes, jamais publiées
-- ---------------------------------------------------------------------
create table public.athlete_private (
  athlete_id uuid primary key references public.athletes (id) on delete cascade,
  -- sert uniquement à savoir si l'autorisation d'un responsable légal est requise
  birth_date date check (birth_date >= date '1920-01-01'),
  -- le coach atteste avoir reçu l'autorisation écrite (le document n'est pas stocké)
  guardian_attested_by uuid references public.profiles (id) on delete set null,
  guardian_attested_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.athlete_private is 'Date de naissance et attestation parentale. Visible du seul athlète et du superviseur général.';

-- ---------------------------------------------------------------------
-- Demandes de vérification (file d'attente des coachs et du superviseur)
-- ---------------------------------------------------------------------
create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  kind public.request_kind not null,
  athlete_id uuid references public.athletes (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete cascade,
  status public.request_status not null default 'open',
  submitted_at timestamptz not null default now(),
  -- échéance de sept jours pour les demandes d'athlètes ; null pour les comptes de coach
  due_at timestamptz,
  -- renseigné quand la demande passe automatiquement au superviseur général
  escalated_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_reason text check (char_length(decision_reason) <= 500),
  constraint review_requests_subject check (
    (kind = 'coach_account' and coach_id is not null and athlete_id is null)
    or (kind <> 'coach_account' and athlete_id is not null and coach_id is null)
  )
);
comment on table public.review_requests is 'Demandes de vérification : profil d''athlète, ajout de palmarès, compte de coach.';

-- une seule demande ouverte par sujet et par type
create unique index review_requests_one_open_idx
  on public.review_requests (kind, coalesce(athlete_id, coach_id))
  where status = 'open';
create index review_requests_status_due_idx on public.review_requests (status, due_at);
create index review_requests_athlete_idx on public.review_requests (athlete_id);
create index review_requests_coach_idx on public.review_requests (coach_id);

-- ---------------------------------------------------------------------
-- Palmarès structuré
-- ---------------------------------------------------------------------
create table public.palmares_entries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  competition text not null check (char_length(competition) between 2 and 160),
  year smallint not null check (year between 1950 and 2100),
  location text check (char_length(location) <= 120),
  weight_class text check (weight_class ~ '^[+-][0-9]{2,3}$'),
  result public.competition_result not null,
  -- toute entrée reste invisible du public tant qu'un coach ne l'a pas vérifiée
  status public.entry_status not null default 'pending',
  review_request_id uuid references public.review_requests (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index palmares_entries_athlete_idx on public.palmares_entries (athlete_id, year desc);
create index palmares_entries_request_idx on public.palmares_entries (review_request_id);

-- ---------------------------------------------------------------------
-- Médias des pages disciplines (déposés par le superviseur)
-- ---------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  discipline public.discipline not null,
  kind public.media_kind not null,
  title_fr text not null check (char_length(title_fr) between 1 and 160),
  title_en text check (char_length(title_en) <= 160),
  storage_path text check (char_length(storage_path) <= 300),
  external_url text check (char_length(external_url) <= 500),
  duration_seconds integer check (duration_seconds >= 0),
  size_bytes bigint check (size_bytes >= 0),
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- un fichier déposé OU un lien externe, jamais les deux
  constraint media_source check (
    (kind = 'video_link' and external_url is not null and storage_path is null)
    or (kind <> 'video_link' and storage_path is not null and external_url is null)
  ),
  -- liens limités à YouTube et Facebook : pas de lecteur intégré venu d'ailleurs
  constraint media_external_url check (
    external_url is null
    or external_url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)/'
  )
);
create index media_discipline_position_idx on public.media (discipline, position);

-- ---------------------------------------------------------------------
-- Actualités
-- ---------------------------------------------------------------------
create table public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_fr text not null check (char_length(title_fr) between 1 and 200),
  title_en text check (char_length(title_en) <= 200),
  excerpt_fr text check (char_length(excerpt_fr) <= 400),
  excerpt_en text check (char_length(excerpt_en) <= 400),
  body_fr text check (char_length(body_fr) <= 20000),
  body_en text check (char_length(body_en) <= 20000),
  cover_path text check (char_length(cover_path) <= 300),
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_published_idx on public.news (status, published_at desc);

-- ---------------------------------------------------------------------
-- Journal d'audit, en écriture seule (verrouillé dans la migration 2)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- pas de clé étrangère : le journal doit survivre à la suppression des comptes
  actor_id uuid,
  actor_label text,
  automatic boolean not null default false,
  action text not null,
  target_type text,
  target_id uuid,
  target_label text,
  details jsonb not null default '{}'::jsonb
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);

-- ---------------------------------------------------------------------
-- Index de recherche et de filtrage des pages publiques
-- ---------------------------------------------------------------------
create index athletes_public_idx on public.athletes (status, discipline, weight_class);
create index athletes_coach_idx on public.athletes (coach_id);
create index coaches_status_idx on public.coaches (status);

-- ---------------------------------------------------------------------
-- Déclencheurs updated_at
-- ---------------------------------------------------------------------
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger coaches_updated_at before update on public.coaches
  for each row execute function private.set_updated_at();
create trigger athletes_updated_at before update on public.athletes
  for each row execute function private.set_updated_at();
create trigger athlete_private_updated_at before update on public.athlete_private
  for each row execute function private.set_updated_at();
create trigger palmares_entries_updated_at before update on public.palmares_entries
  for each row execute function private.set_updated_at();
create trigger news_updated_at before update on public.news
  for each row execute function private.set_updated_at();
