-- =====================================================================
-- LSES Fighting — scénarios de sécurité et de circuit de validation
--
-- À exécuter dans Supabase (SQL Editor) ou avec psql, après les migrations.
-- Le script simule plusieurs comptes (athlètes, coachs, superviseur,
-- visiteur anonyme), tente des actions autorisées et interdites, puis
-- ANNULE TOUT (rollback) : la base n'est pas modifiée.
-- Résultat : si aucune erreur « ÉCHEC » n'apparaît, tous les scénarios
-- sont validés. Avec psql, le détail de chaque test est affiché.
-- =====================================================================

begin;

create temp table t_users (name text primary key, id uuid not null) on commit drop;
create temp table t_results (n serial, test text, ok boolean, detail text) on commit drop;
grant all on t_users, t_results to public;
grant all on sequence t_results_n_seq to public;

-- Se faire passer pour un compte (comme le fait l'API Supabase)
create function pg_temp.act_as(p_name text) returns void language plpgsql as $$
declare v_id uuid;
begin
  perform set_config('role', 'none', true);
  if p_name = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    select id into v_id from t_users where name = p_name;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

create function pg_temp.as_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create function pg_temp.uid(p_name text) returns uuid language sql as $$
  select id from t_users where name = p_name
$$;

create function pg_temp.ok(p_test text, p_cond boolean, p_detail text default null) returns void
language sql as $$
  insert into t_results (test, ok, detail) values (p_test, coalesce(p_cond, false), p_detail)
$$;

-- Exécute une requête qui DOIT échouer avec le message attendu
create function pg_temp.fails(p_test text, p_sql text, p_expected text) returns void
language plpgsql as $$
begin
  execute p_sql;
  perform pg_temp.ok(p_test, false, 'aucune erreur levée');
exception when others then
  perform pg_temp.ok(p_test, sqlerrm ilike '%' || p_expected || '%', sqlerrm);
end $$;

-- Exécute une requête qui DOIT réussir
create function pg_temp.succeeds(p_test text, p_sql text) returns void
language plpgsql as $$
begin
  execute p_sql;
  perform pg_temp.ok(p_test, true);
exception when others then
  perform pg_temp.ok(p_test, false, sqlerrm);
end $$;

create function pg_temp.count_of(p_sql text) returns bigint language plpgsql as $$
declare v bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into v;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- Comptes de test (l'inscription déclenche la création des fiches)
-- ---------------------------------------------------------------------
with new_users(name, role) as (
  values ('superviseur', 'coach'), ('coach', 'coach'), ('coach_attente', 'coach'),
         ('adulte', 'athlete'), ('mineur', 'athlete'), ('retard', 'athlete'),
         ('curieux', 'athlete'), ('google', null)
), ins as (
  insert into auth.users (id, email, raw_user_meta_data)
  select gen_random_uuid(), name || '@test.lses.local',
         case when role is null then '{}'::jsonb else jsonb_build_object('role', role) end
  from new_users
  returning id, email
)
insert into t_users select split_part(email, '@', 1), id from ins;

select pg_temp.ok('Inscription : un compte applicatif par utilisateur',
  (select count(*) from public.profiles p join t_users u on u.id = p.id) = 8);
select pg_temp.ok('Inscription : fiches créées selon le rôle choisi',
  (select count(*) from public.athletes a join t_users u on u.id = a.id) = 4
  and (select count(*) from public.athlete_private a join t_users u on u.id = a.athlete_id) = 4
  and (select count(*) from public.coaches c join t_users u on u.id = c.id) = 3);
select pg_temp.ok('Inscription Google : rôle encore à choisir',
  (select role from public.profiles where id = pg_temp.uid('google')) is null);

-- Promotion du superviseur (faite par l'équipe technique en console SQL)
update public.profiles set role = 'superviseur' where id = pg_temp.uid('superviseur');
select pg_temp.ok('Promotion en superviseur tracée dans le journal',
  exists (select 1 from public.audit_log where action = 'profile.role_changed'
          and target_id = pg_temp.uid('superviseur') and details ->> 'to' = 'superviseur'));

-- ---------------------------------------------------------------------
-- Choix du rôle et tentatives d'élévation de privilèges
-- ---------------------------------------------------------------------
select pg_temp.act_as('google');
select pg_temp.succeeds('Google : choix du rôle athlète', 'select public.choose_role(''athlete'')');
select pg_temp.fails('Google : impossible de changer de rôle ensuite', 'select public.choose_role(''coach'')', 'role_already_chosen');
select pg_temp.fails('Google : impossible de se déclarer superviseur', 'select public.choose_role(''superviseur'')', 'role_not_allowed');

select pg_temp.act_as('curieux');
select pg_temp.fails('Athlète : modifier son rôle directement',
  format('update public.profiles set role = ''superviseur'' where id = %L', pg_temp.uid('curieux')), 'permission denied');
select pg_temp.fails('Athlète : se publier lui-même',
  format('update public.athletes set status = ''approved'' where id = %L', pg_temp.uid('curieux')), 'permission denied');
select pg_temp.fails('Athlète : écrire dans le journal d''audit',
  'insert into public.audit_log (action) values (''faux'')', 'permission denied');
select pg_temp.fails('Athlète : fabriquer une demande validée',
  format('insert into public.review_requests (kind, athlete_id, status) values (''athlete_profile'', %L, ''approved'')', pg_temp.uid('curieux')), 'permission denied');
select pg_temp.fails('Athlète : utiliser la photo d''un autre compte',
  format('update public.athletes set photo_path = %L where id = %L', pg_temp.uid('adulte') || '/photo.webp', pg_temp.uid('curieux')), 'invalid_photo_path');
select pg_temp.fails('Athlète : se rattacher à un coach non référencé',
  format('update public.athletes set coach_id = %L where id = %L', pg_temp.uid('coach_attente'), pg_temp.uid('curieux')), 'coach_not_approved');
select pg_temp.ok('Athlète : ne voit pas les comptes des autres',
  pg_temp.count_of('select 1 from public.profiles') = 1);
select pg_temp.fails('Athlète : valider une demande', format('select public.review_athlete_profile(%L, true)', gen_random_uuid()), 'forbidden');
select pg_temp.fails('Athlète : ajouter une entrée au palmarès d''un autre',
  format('insert into public.palmares_entries (athlete_id, competition, year, result) values (%L, ''Faux titre'', 2026, ''gold'')', pg_temp.uid('adulte')), 'row-level security');

select pg_temp.act_as('anon');
select pg_temp.fails('Visiteur : appeler une fonction du circuit', 'select public.submit_athlete_profile()', 'permission denied');
select pg_temp.fails('Visiteur : lire les données sensibles', 'select * from public.athlete_private', 'permission denied');

-- ---------------------------------------------------------------------
-- Comptes de coach : validation par le superviseur
-- ---------------------------------------------------------------------
select pg_temp.act_as('coach');
select pg_temp.fails('Coach : soumission incomplète refusée', 'select public.submit_coach_profile()', 'profile_incomplete');
update public.coaches set last_name = 'Abena', first_names = 'Théophile', city = 'Douala',
  disciplines = '{sambo}', dojo_name = 'Dojo Bonabéri', experience_years = 11,
  publication_consent_at = '2000-01-01'
  where id = pg_temp.uid('coach');
select pg_temp.ok('Coach : horodatage du consentement imposé par le serveur',
  (select publication_consent_at > now() - interval '1 minute' from public.coaches where id = pg_temp.uid('coach')));
select pg_temp.succeeds('Coach : soumission de son compte', 'select public.submit_coach_profile()');
select pg_temp.fails('Coach : valider son propre compte',
  format('select public.review_coach_account(%L, true)', (select id from public.review_requests where coach_id = pg_temp.uid('coach'))), 'forbidden');

select pg_temp.act_as('coach_attente');
update public.coaches set last_name = 'Mengue', first_names = 'Pascale', city = 'Yaoundé',
  disciplines = '{mma}', publication_consent_at = now() where id = pg_temp.uid('coach_attente');
select pg_temp.succeeds('Coach en attente : soumission', 'select public.submit_coach_profile()');

select pg_temp.act_as('superviseur');
update public.coaches set last_name = 'Djantou Nana', first_names = 'Maxwell', city = 'Yaoundé',
  disciplines = '{sambo,mma}', publication_consent_at = now() where id = pg_temp.uid('superviseur');
select public.submit_coach_profile();
select pg_temp.fails('Superviseur : refus sans motif impossible',
  format('select public.review_coach_account(%L, false)', (select id from public.review_requests where coach_id = pg_temp.uid('coach'))), 'reason_required');
select pg_temp.succeeds('Superviseur : validation d''un coach',
  format('select public.review_coach_account(%L, true)', (select id from public.review_requests where coach_id = pg_temp.uid('coach'))));
select public.review_coach_account((select id from public.review_requests where coach_id = pg_temp.uid('superviseur')), true);
select pg_temp.ok('Coach validé : adresse publique générée',
  (select slug from public.coaches where id = pg_temp.uid('coach')) = 'abena-theophile');

select pg_temp.act_as('anon');
select pg_temp.ok('Visiteur : seuls les coachs validés sont listés',
  pg_temp.count_of(format('select 1 from public.coaches where id in (%L, %L)', pg_temp.uid('coach'), pg_temp.uid('coach_attente'))) = 1);

-- ---------------------------------------------------------------------
-- Fiche d'athlète majeur : soumission, file d'attente, validation
-- ---------------------------------------------------------------------
select pg_temp.act_as('adulte');
update public.athletes set last_name = 'Mballa', first_names = 'Armand', sex = 'male',
  discipline = 'sambo', weight_class = '-74', city = 'Yaoundé', coach_id = pg_temp.uid('coach')
  where id = pg_temp.uid('adulte');
update public.athlete_private set birth_date = date '2001-03-14' where athlete_id = pg_temp.uid('adulte');
select pg_temp.fails('Athlète : soumission sans accord de publication', 'select public.submit_athlete_profile()', 'consent_required');
update public.athletes set publication_consent_at = now() where id = pg_temp.uid('adulte');
insert into public.palmares_entries (athlete_id, competition, year, location, result)
  values (pg_temp.uid('adulte'), 'Championnat national', 2026, 'Yaoundé', 'gold');
select pg_temp.succeeds('Athlète : soumission de sa fiche', 'select public.submit_athlete_profile()');
insert into public.palmares_entries (athlete_id, competition, year, location, result)
  values (pg_temp.uid('adulte'), 'Titre douteux', 2025, 'Douala', 'gold');
select pg_temp.ok('Palmarès ajouté pendant l''attente : rattaché à la demande',
  (select count(*) from public.palmares_entries where athlete_id = pg_temp.uid('adulte') and review_request_id is not null) = 2);
select pg_temp.ok('Demande : échéance à sept jours',
  (select due_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour'
   from public.review_requests where athlete_id = pg_temp.uid('adulte') and kind = 'athlete_profile'));

select pg_temp.act_as('curieux');
select pg_temp.ok('Autre athlète : ne voit pas une fiche en attente',
  pg_temp.count_of(format('select 1 from public.athletes where id = %L', pg_temp.uid('adulte'))) = 0);
select pg_temp.act_as('anon');
select pg_temp.ok('Visiteur : ne voit pas une fiche en attente',
  pg_temp.count_of(format('select 1 from public.athletes where id = %L', pg_temp.uid('adulte'))) = 0);

select pg_temp.act_as('coach_attente');
select pg_temp.ok('Coach non validé : file d''attente invisible',
  pg_temp.count_of('select 1 from public.review_requests where kind = ''athlete_profile''') = 0);
select pg_temp.fails('Coach non validé : ne peut pas valider',
  format('select public.review_athlete_profile(%L, true)', (select id from public.review_requests where athlete_id = pg_temp.uid('adulte'))), 'forbidden');

select pg_temp.act_as('coach');
select pg_temp.ok('Coach référencé : voit la file d''attente',
  pg_temp.count_of(format('select 1 from public.review_requests where athlete_id = %L', pg_temp.uid('adulte'))) = 1);
select pg_temp.ok('Coach référencé : voit l''âge de l''athlète en attente',
  (select age >= 18 and not is_minor from public.pending_athlete_ages() where athlete_id = pg_temp.uid('adulte')));
select pg_temp.ok('Coach référencé : pas d''accès à la date de naissance',
  pg_temp.count_of('select 1 from public.athlete_private') = 0);
select pg_temp.succeeds('Coach référencé : validation en écartant une entrée',
  format('select public.review_athlete_profile(%L, true, ''Titre non vérifiable'', false, array[%L]::uuid[])',
    (select id from public.review_requests where athlete_id = pg_temp.uid('adulte')),
    (select id from public.palmares_entries where competition = 'Titre douteux' and athlete_id = pg_temp.uid('adulte'))));
select pg_temp.ok('Fiche validée : en ligne avec son adresse publique',
  (select status = 'approved' and slug = 'mballa-armand' and published_at is not null
   from public.athletes where id = pg_temp.uid('adulte')));

select pg_temp.act_as('anon');
select pg_temp.ok('Visiteur : voit la fiche en ligne',
  pg_temp.count_of(format('select 1 from public.athletes where id = %L', pg_temp.uid('adulte'))) = 1);
select pg_temp.ok('Visiteur : ne voit que les entrées vérifiées',
  pg_temp.count_of(format('select 1 from public.palmares_entries where athlete_id = %L', pg_temp.uid('adulte'))) = 1);
select pg_temp.act_as('curieux');
update public.athletes set bio = 'Texte malveillant' where id = pg_temp.uid('adulte');
select pg_temp.as_admin();
select pg_temp.ok('Autre athlète : ne peut pas modifier une fiche qui n''est pas la sienne',
  (select bio is null from public.athletes where id = pg_temp.uid('adulte')));
select pg_temp.act_as('curieux');
select pg_temp.ok('Autre athlète : pas d''accès à la date de naissance',
  pg_temp.count_of(format('select 1 from public.athlete_private where athlete_id = %L', pg_temp.uid('adulte'))) = 0);

-- ---------------------------------------------------------------------
-- Modification d'une fiche en ligne
-- ---------------------------------------------------------------------
select pg_temp.act_as('adulte');
select pg_temp.fails('Fiche en ligne : nom verrouillé',
  format('update public.athletes set last_name = ''Autre'' where id = %L', pg_temp.uid('adulte')), 'identity_locked');
select pg_temp.fails('Fiche en ligne : date de naissance verrouillée',
  format('update public.athlete_private set birth_date = ''2010-01-01'' where athlete_id = %L', pg_temp.uid('adulte')), 'identity_locked');
update public.athletes set bio = 'Venu du judo à quinze ans.' where id = pg_temp.uid('adulte');
select pg_temp.ok('Fiche en ligne : modifiée, reste en ligne et signalée',
  (select status = 'approved' and modified_since_review from public.athletes where id = pg_temp.uid('adulte')));
select pg_temp.act_as('coach');
select pg_temp.succeeds('Coach : fiche relue', format('select public.mark_athlete_reviewed(%L)', pg_temp.uid('adulte')));

-- ---------------------------------------------------------------------
-- Ajout de palmarès après publication
-- ---------------------------------------------------------------------
select pg_temp.act_as('adulte');
insert into public.palmares_entries (athlete_id, competition, year, location, result)
  values (pg_temp.uid('adulte'), 'Open d''Afrique centrale', 2025, 'Douala', 'silver');
select pg_temp.ok('Ajout après publication : nouvelle demande « palmarès »',
  exists (select 1 from public.review_requests where athlete_id = pg_temp.uid('adulte') and kind = 'palmares' and status = 'open'));
select pg_temp.act_as('anon');
select pg_temp.ok('Ajout après publication : invisible avant vérification',
  pg_temp.count_of(format('select 1 from public.palmares_entries where athlete_id = %L', pg_temp.uid('adulte'))) = 1);
select pg_temp.act_as('coach');
select public.review_palmares((select id from public.review_requests where athlete_id = pg_temp.uid('adulte') and kind = 'palmares'), true);
select pg_temp.act_as('anon');
select pg_temp.ok('Ajout vérifié : visible du public',
  pg_temp.count_of(format('select 1 from public.palmares_entries where athlete_id = %L', pg_temp.uid('adulte'))) = 2);

-- ---------------------------------------------------------------------
-- Athlète mineur : attestation du responsable légal obligatoire
-- ---------------------------------------------------------------------
select pg_temp.act_as('mineur');
update public.athletes set last_name = 'Owona', first_names = 'Junior', sex = 'male', discipline = 'sambo',
  weight_class = '-68', city = 'Yaoundé', publication_consent_at = now() where id = pg_temp.uid('mineur');
update public.athlete_private set birth_date = (current_date - interval '16 years')::date where athlete_id = pg_temp.uid('mineur');
select public.submit_athlete_profile();

select pg_temp.act_as('coach');
select pg_temp.ok('Mineur : signalé au coach avec son âge',
  (select is_minor and age = 16 from public.pending_athlete_ages() where athlete_id = pg_temp.uid('mineur')));
select pg_temp.fails('Mineur : validation bloquée sans attestation',
  format('select public.review_athlete_profile(%L, true)', (select id from public.review_requests where athlete_id = pg_temp.uid('mineur'))), 'guardian_attestation_required');
select pg_temp.succeeds('Mineur : validation avec attestation',
  format('select public.review_athlete_profile(%L, true, null, true)', (select id from public.review_requests where athlete_id = pg_temp.uid('mineur'))));
select pg_temp.as_admin();
select pg_temp.ok('Mineur : attestation enregistrée',
  (select guardian_attested_by = pg_temp.uid('coach') from public.athlete_private where athlete_id = pg_temp.uid('mineur')));

-- ---------------------------------------------------------------------
-- Escalade au septième jour
-- ---------------------------------------------------------------------
select pg_temp.act_as('retard');
update public.athletes set last_name = 'Nana', first_names = 'Roland', sex = 'male', discipline = 'sambo',
  weight_class = '-74', city = 'Kribi', publication_consent_at = now() where id = pg_temp.uid('retard');
update public.athlete_private set birth_date = date '1998-06-01' where athlete_id = pg_temp.uid('retard');
select public.submit_athlete_profile();

select pg_temp.as_admin();
update public.review_requests set submitted_at = now() - interval '8 days', due_at = now() - interval '1 day'
  where athlete_id = pg_temp.uid('retard');
select pg_temp.ok('Escalade : tâche planifiée toutes les heures',
  exists (select 1 from cron.job where jobname = 'lses-escalade-demandes' and schedule = '5 * * * *'));
select pg_temp.ok('Escalade : une demande en retard détectée', private.escalate_overdue_requests() = 1);
select pg_temp.ok('Escalade : tracée comme action automatique',
  exists (select 1 from public.audit_log where action = 'request.escalated' and automatic and target_id = pg_temp.uid('retard')));
select pg_temp.ok('Escalade : pas de double traitement', private.escalate_overdue_requests() = 0);

select pg_temp.act_as('coach');
select pg_temp.fails('Escalade : le coach ne peut plus décider',
  format('select public.review_athlete_profile(%L, true)', (select id from public.review_requests where athlete_id = pg_temp.uid('retard'))), 'request_escalated');
select pg_temp.act_as('superviseur');
select pg_temp.succeeds('Escalade : le superviseur tranche (refus motivé)',
  format('select public.review_athlete_profile(%L, false, ''Photo illisible'')', (select id from public.review_requests where athlete_id = pg_temp.uid('retard'))));

-- ---------------------------------------------------------------------
-- Journal d'audit
-- ---------------------------------------------------------------------
select pg_temp.act_as('coach');
select pg_temp.ok('Journal : illisible pour un coach', pg_temp.count_of('select 1 from public.audit_log') = 0);
select pg_temp.act_as('superviseur');
select pg_temp.ok('Journal : lisible par le superviseur', pg_temp.count_of('select 1 from public.audit_log') > 10);
select pg_temp.as_admin();
select pg_temp.fails('Journal : modification impossible, même en administrateur',
  'update public.audit_log set action = ''effacé''', 'audit_log_is_append_only');
select pg_temp.fails('Journal : suppression impossible, même en administrateur',
  'delete from public.audit_log', 'audit_log_is_append_only');

-- ---------------------------------------------------------------------
-- Médias, actualités et fichiers
-- ---------------------------------------------------------------------
select pg_temp.act_as('coach');
select pg_temp.fails('Médias : un coach ne peut pas publier',
  'insert into public.media (discipline, kind, title_fr, external_url) values (''sambo'', ''video_link'', ''Démo'', ''https://www.youtube.com/watch?v=x'')', 'row-level security');
select pg_temp.act_as('superviseur');
select pg_temp.fails('Médias : lien hors YouTube/Facebook refusé',
  'insert into public.media (discipline, kind, title_fr, external_url) values (''sambo'', ''video_link'', ''Démo'', ''https://exemple.com/video'')', 'media_external_url');
select pg_temp.succeeds('Médias : lien YouTube accepté',
  'insert into public.media (discipline, kind, title_fr, external_url) values (''sambo'', ''video_link'', ''Démonstration de projections'', ''https://www.youtube.com/watch?v=abc'')');
insert into public.news (slug, title_fr, status) values ('brouillon-test', 'Brouillon', 'draft');
insert into public.news (slug, title_fr, status) values ('trois-medailles', 'Trois médailles au tournoi de Douala', 'published');
select pg_temp.act_as('anon');
select pg_temp.ok('Actualités : seules les publiées sont visibles',
  pg_temp.count_of('select 1 from public.news where slug in (''brouillon-test'', ''trois-medailles'')') = 1);

select pg_temp.act_as('adulte');
select pg_temp.succeeds('Photo : dépôt dans son dossier',
  format('insert into storage.objects (bucket_id, name) values (''profile-photos'', %L)', pg_temp.uid('adulte') || '/portrait.webp'));
select pg_temp.fails('Photo : dépôt dans le dossier d''un autre',
  format('insert into storage.objects (bucket_id, name) values (''profile-photos'', %L)', pg_temp.uid('curieux') || '/intrus.webp'), 'row-level security');
update public.athletes set photo_path = pg_temp.uid('adulte') || '/portrait.webp' where id = pg_temp.uid('adulte');
select pg_temp.act_as('mineur');
select pg_temp.succeeds('Photo : dépôt par un second athlète',
  format('insert into storage.objects (bucket_id, name) values (''profile-photos'', %L)', pg_temp.uid('mineur') || '/brouillon.webp'));
select pg_temp.act_as('anon');
select pg_temp.ok('Photo : visible du public quand la fiche est en ligne',
  pg_temp.count_of(format('select 1 from storage.objects where name = %L', pg_temp.uid('adulte') || '/portrait.webp')) = 1);
select pg_temp.ok('Photo : un fichier non déclaré sur la fiche reste privé',
  pg_temp.count_of(format('select 1 from storage.objects where name = %L', pg_temp.uid('mineur') || '/brouillon.webp')) = 0);
select pg_temp.act_as('coach');
select pg_temp.fails('Médias (fichiers) : dépôt refusé à un coach',
  'insert into storage.objects (bucket_id, name) values (''media'', ''sambo/test.webp'')', 'row-level security');

-- ---------------------------------------------------------------------
-- Retrait du consentement et retrait par le superviseur
-- ---------------------------------------------------------------------
select pg_temp.act_as('adulte');
update public.athletes set publication_consent_at = null where id = pg_temp.uid('adulte');
select pg_temp.act_as('anon');
select pg_temp.ok('Consentement retiré : la fiche quitte le site',
  pg_temp.count_of(format('select 1 from public.athletes where id = %L', pg_temp.uid('adulte'))) = 0);
select pg_temp.as_admin();
select pg_temp.ok('Consentement retiré : tracé dans le journal',
  exists (select 1 from public.audit_log where action = 'athlete.consent_withdrawn' and target_id = pg_temp.uid('adulte')));
select pg_temp.act_as('superviseur');
select pg_temp.succeeds('Superviseur : retrait d''une fiche en ligne',
  format('select public.withdraw_profile(%L, ''Demande de retrait reçue'')', pg_temp.uid('mineur')));
select pg_temp.act_as('anon');
select pg_temp.ok('Fiche retirée : plus visible',
  pg_temp.count_of(format('select 1 from public.athletes where id = %L', pg_temp.uid('mineur'))) = 0);

-- ---------------------------------------------------------------------
-- Bilan
-- ---------------------------------------------------------------------
select pg_temp.as_admin();
select n, case when ok then 'OK' else 'ÉCHEC' end as resultat, test, detail from t_results order by n;

do $$
declare
  v_total integer := (select count(*) from t_results);
  v_failed text := (select string_agg(n || '. ' || test || coalesce(' → ' || detail, ''), E'\n') from t_results where not ok);
begin
  if v_failed is not null then
    raise exception E'ÉCHEC de certains scénarios :\n%', v_failed;
  end if;
  raise notice '% scénarios validés.', v_total;
end $$;

rollback;
