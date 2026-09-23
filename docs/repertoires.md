# Répertoires publics et fiches

Les pages « Athlètes » et « Coachs » sont ouvertes à tous, sans compte. Elles reprennent la maquette du répertoire (recherche, filtres en pastilles, résultats en cartes) et celle de la fiche athlète, pensée pour être partagée sur WhatsApp et Facebook.

## Ce qui est affiché

Seules les fiches en ligne apparaissent, avec les seules entrées de palmarès vérifiées par un coach. Ces lectures passent par un client Supabase « visiteur » (`src/lib/supabase/public.ts`), sans session ni cookie : même un coach ou le superviseur connecté voit exactement ce que voit le public. La date de naissance n'est jamais lue, si bien que la fiche n'affiche ni âge ni catégorie d'âge.

## Recherche et filtres

La recherche porte sur le nom, les prénoms et la ville (le dojo en plus pour les coachs). Elle ignore les accents et les majuscules : « yaounde » trouve Yaoundé, « bikoi » trouve Bikoï. Chaque mot saisi doit figurer dans la fiche, dans n'importe quel ordre. Les filtres (discipline, sexe, catégorie, ville) se lisent dans l'adresse de la page, ce qui permet de partager une recherche. La catégorie de poids n'est proposée qu'une fois la discipline choisie. Sans JavaScript, le tout fonctionne comme un formulaire classique ; avec JavaScript, la page se met à jour sans rechargement. Les résultats arrivent par douze, avec « Charger la suite ».

## Fiches

La fiche athlète présente le portrait, la discipline, la catégorie, trois chiffres (titres, combats, années de pratique), le parcours, le palmarès vérifié, le coach référent et les boutons de partage. La fiche coach reprend le même gabarit avec le dojo, l'expérience et la liste de ses athlètes en ligne. Une mention rappelle la date de vérification et renvoie aux mentions légales pour toute demande de retrait.

## Photos

Le bucket des photos reste privé. La route `/api/photos/athletes/<slug>` (ou `coaches`) lit la photo avec les droits du visiteur, que la base n'accorde que pour la photo déclarée d'une fiche en ligne, et la sert avec une heure de cache. L'adresse est stable, ce qui permet de l'utiliser comme image d'aperçu (Open Graph) lors d'un partage. Un numéro de version tiré du nom du fichier force le rafraîchissement quand la photo change.

## Référencement

Chaque fiche porte son titre, sa description, son adresse canonique, ses versions française et anglaise et son image d'aperçu. Le plan du site (`/sitemap.xml`) liste les pages publiques et les fiches en ligne ; `robots.txt` écarte les espaces personnels et les routes techniques.

## Écarts assumés par rapport aux maquettes

Le bleu des maquettes (badge « Profil vérifié », encadré du coach) devient vert et doré : la règle du design system réserve le bleu au back-office. La mention « Senior » est retirée, faute de pouvoir la calculer sans exposer la date de naissance.
