# Espace superviseur

L'espace superviseur (`/fr/mon-espace/superviseur`) est réservé au compte qui porte le rôle de superviseur général. Il reprend la maquette du back-office : trois indicateurs, puis trois onglets, « Demandes », « Fiches » et « Journal ». Les onglets « Médias » et « Actualités » viendront à l'étape suivante.

## Demandes

L'écran place en tête les demandes d'athlètes escaladées, c'est-à-dire restées sans décision d'un coach pendant sept jours. Elles s'ouvrent avec la même carte que dans « Demandes à traiter » : fiche complète, palmarès à vérifier, attestation parentale pour un mineur, validation ou refus motivé.

Viennent ensuite les comptes de coach à valider. Chaque carte présente les disciplines, la ville, le dojo, l'expérience, la présentation et la photo, et rappelle qu'une validation donne au coach le pouvoir de publier des fiches d'athlètes, mineurs compris. Valider crée l'adresse publique du coach, qui apparaît aussitôt dans le répertoire ; refuser exige un motif, que le coach lit dans son espace. Les décisions passent par la fonction `review_coach_account`, réservée au superviseur par la base.

## Fiches

L'onglet liste les fiches en ligne, athlètes ou coachs, avec une recherche par nom ou par ville. « Retirer du site » demande un motif puis appelle `withdraw_profile` : la fiche quitte aussitôt les pages publiques et repasse à l'état « à corriger », et la personne peut la soumettre de nouveau. Retirer un coach lui ôte aussi le droit de vérifier des fiches. Le motif est inscrit au journal d'audit.

## Journal

Le journal d'audit est présenté en phrases (« Maxwell Djantou Nana a validé la fiche d'Armand Mballa »), avec la date, l'heure, le motif et les mentions utiles : action automatique, athlète mineur, décision prise après escalade, entrées de palmarès écartées. On peut filtrer par catégorie (fiches d'athlètes, comptes de coach, escalades, rôles, médias et actualités) et chercher le nom d'une personne. Un superviseur sans fiche de coach apparaît comme « le superviseur général », une modification faite depuis l'éditeur SQL de Supabase comme « la console d'administration ».

Le journal reste en écriture seule : aucune ligne ne peut être modifiée ni supprimée, y compris depuis ce compte ou avec la clé de service.

## Sécurité

La page vérifie le rôle pour l'affichage, mais la protection réelle est dans la base : la RLS ne livre les comptes de coach en attente, les profils et le journal qu'au superviseur, et les fonctions de décision refusent tout autre appelant.
