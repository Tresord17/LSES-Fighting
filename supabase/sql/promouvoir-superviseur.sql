-- =====================================================================
-- Donner le rôle de superviseur général à un compte existant
-- À exécuter dans Supabase > SQL Editor, une fois que la personne s'est
-- inscrite sur le site. Remplacer l'adresse ci-dessous.
-- Le changement est automatiquement inscrit dans le journal d'audit.
-- =====================================================================

update public.profiles
set role = 'superviseur'
where id = (select id from auth.users where email = 'adresse@exemple.com');

-- Vérification : doit renvoyer une ligne avec le rôle « superviseur »
select u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'superviseur';
