# Espace superviseur

L'espace superviseur (`/fr/mon-espace/superviseur`) est réservé au compte qui porte le rôle de superviseur général. Il reprend la maquette du back-office : trois indicateurs, puis cinq onglets, « Demandes », « Fiches », « Médias », « Actualités » et « Journal ».

## Demandes

L'écran place en tête les demandes d'athlètes escaladées, c'est-à-dire restées sans décision d'un coach pendant sept jours. Elles s'ouvrent avec la même carte que dans « Demandes à traiter » : fiche complète, palmarès à vérifier, attestation parentale pour un mineur, validation ou refus motivé.

Viennent ensuite les comptes de coach à valider. Chaque carte présente les disciplines, la ville, le dojo, l'expérience, la présentation et la photo, et rappelle qu'une validation donne au coach le pouvoir de publier des fiches d'athlètes, mineurs compris. Valider crée l'adresse publique du coach, qui apparaît aussitôt dans le répertoire ; refuser exige un motif, que le coach lit dans son espace. Les décisions passent par la fonction `review_coach_account`, réservée au superviseur par la base.

## Fiches

L'onglet liste les fiches en ligne, athlètes ou coachs, avec une recherche par nom ou par ville. « Retirer du site » demande un motif puis appelle `withdraw_profile` : la fiche quitte aussitôt les pages publiques et repasse à l'état « à corriger », et la personne peut la soumettre de nouveau. Retirer un coach lui ôte aussi le droit de vérifier des fiches. Le motif est inscrit au journal d'audit.

## Médias

L'onglet gère les galeries des pages Sambo et MMA. Le lien YouTube ou Facebook est la voie recommandée : rien n'est stocké, la lecture reste fluide en 3G et la vidéo gagne en visibilité sur sa plateforme. L'adresse est vérifiée avant l'envoi puis par la base, qui n'accepte que ces deux plateformes.

Le téléversement reste possible. Une image (JPEG, PNG ou WebP, 20 Mo au plus avant réduction) est réduite dans le navigateur à 1 600 pixels en WebP, ce qui retire ses métadonnées et tient le budget de 600 Ko par page. Une vidéo MP4 est limitée à 50 Mo, le plafond par fichier du plan gratuit de Supabase ; elle part par morceaux de 6 Mo (protocole TUS), avec une barre de progression et un bouton « Annuler ». Une coupure de connexion est reprise automatiquement, et un envoi interrompu repart de là où il s'était arrêté si l'on choisit de nouveau le même fichier. Le titre est demandé avant le fichier ; si l'enregistrement échoue, le fichier déposé est aussitôt supprimé pour ne pas laisser d'orphelin. Chaque fichier part avec une vignette de 640 pixels (pour une vidéo, une image extraite vers la première seconde), que les pages publiques affichent à sa place ; voir `docs/vitrine.md`.

Chaque élément de la galerie peut être déplacé avec les flèches (l'ordre est celui de la page publique), renommé ou supprimé avec son fichier. L'espace occupé par les fichiers est affiché en tête de l'onglet. Les ajouts et suppressions sont inscrits au journal par la base.

## Actualités

La liste montre les brouillons et les actualités publiées. L'éditeur demande un titre en français ; le chapeau, le texte (paragraphes séparés par une ligne vide), la version anglaise et l'image de couverture sont facultatifs. Sans version anglaise, la page anglaise affichera le texte français.

« Enregistrer le brouillon » garde l'article hors ligne, « Publier » le met en ligne et l'inscrit au journal, « Retirer de la publication » le repasse en brouillon. L'adresse (`/fr/actualites/<adresse>`) suit le titre tant que l'article n'a jamais été publié, puis ne change plus pour ne pas casser les liens partagés ; une adresse déjà prise reçoit un suffixe (`-2`). La suppression efface aussi l'image de couverture. Les pages publiques sont décrites dans `docs/vitrine.md`.

## Journal

Le journal d'audit est présenté en phrases (« Maxwell Djantou Nana a validé la fiche d'Armand Mballa »), avec la date, l'heure, le motif et les mentions utiles : action automatique, athlète mineur, décision prise après escalade, entrées de palmarès écartées. On peut filtrer par catégorie (fiches d'athlètes, comptes de coach, escalades, rôles, médias et actualités) et chercher le nom d'une personne. Un superviseur sans fiche de coach apparaît comme « le superviseur général », une modification faite depuis l'éditeur SQL de Supabase comme « la console d'administration ».

Le journal reste en écriture seule : aucune ligne ne peut être modifiée ni supprimée, y compris depuis ce compte ou avec la clé de service.

## Sécurité

La page vérifie le rôle pour l'affichage, mais la protection réelle est dans la base : la RLS ne livre les comptes de coach en attente, les profils et le journal qu'au superviseur, et les fonctions de décision refusent tout autre appelant.
