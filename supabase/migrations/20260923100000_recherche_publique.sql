-- =====================================================================
-- LSES Fighting — 5 : recherche dans les répertoires publics
-- Recherche insensible aux accents et à la casse sur le nom, les prénoms
-- et la ville (« yaounde » trouve « Yaoundé », « bikoi » trouve « Bikoï »),
-- chaque mot saisi devant apparaître quelque part dans la fiche.
-- Les fonctions s'exécutent avec les droits de l'appelant : la RLS
-- s'applique toujours, et seules les fiches en ligne sont renvoyées.
-- Le site y ajoute ses filtres (discipline, sexe, catégorie, ville) et sa
-- pagination : supabase.rpc('search_athletes', …).eq(…).range(…)
-- =====================================================================

-- Texte normalisé : minuscules, sans accents
create or replace function private.search_key(p_text text)
returns text
language sql stable set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')))
$$;

-- Vrai si chaque mot de la saisie figure dans le texte. Les caractères
-- spéciaux de LIKE (%, _ et \) saisis par le visiteur sont neutralisés.
create or replace function private.matches_words(p_haystack text, p_query text)
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(
    bool_and(
      private.search_key(p_haystack)
        like '%' || replace(replace(replace(word, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    ),
    true
  )
  from unnest(regexp_split_to_array(private.search_key(trim(coalesce(p_query, ''))), '\s+')) as word
  where word <> ''
$$;

create or replace function public.search_athletes(p_query text default null)
returns setof public.athletes
language sql stable security invoker set search_path = ''
as $$
  select a.*
  from public.athletes a
  where a.status = 'approved'
    and private.matches_words(concat_ws(' ', a.last_name, a.first_names, a.city), left(p_query, 80))
$$;

create or replace function public.search_coaches(p_query text default null)
returns setof public.coaches
language sql stable security invoker set search_path = ''
as $$
  select c.*
  from public.coaches c
  where c.status = 'approved'
    and private.matches_words(
      concat_ws(' ', c.last_name, c.first_names, c.city, c.dojo_name),
      left(p_query, 80)
    )
$$;

-- Droits : les deux fonctions de recherche sont publiques (visiteurs
-- compris) ; les fonctions internes qu'elles appellent doivent donc être
-- exécutables par ces mêmes rôles.
revoke all on function
  private.search_key(text),
  private.matches_words(text, text),
  public.search_athletes(text),
  public.search_coaches(text)
from public;

grant execute on function
  private.search_key(text),
  private.matches_words(text, text),
  public.search_athletes(text),
  public.search_coaches(text)
to anon, authenticated;
