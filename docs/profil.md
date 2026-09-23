# Formulaire de profil

La page « Mon profil » (`/fr/mon-espace/profil`) adapte son contenu au rôle du compte. L'athlète y renseigne son identité, sa pratique, son palmarès et sa photo, puis soumet sa fiche à un coach référencé. Le coach y renseigne son identité, ses disciplines, son dojo et sa photo, puis soumet son compte au superviseur général.

## Parcours

Le formulaire accepte les brouillons incomplets : chaque champ est contrôlé s'il est rempli, mais aucun n'est imposé avant la soumission. Un compteur indique les champs obligatoires qui manquent encore (identité, discipline, catégorie de poids, ville et accord de publication). Au clic sur « Soumettre pour vérification », la fiche est d'abord enregistrée, puis la base vérifie qu'elle est complète et ouvre la demande de vérification. Si un champ manque, le message de la base s'affiche et rien n'est perdu.

Tant que la fiche est en attente, elle reste modifiable et le coach voit la dernière version. Une fois en ligne, le nom, les prénoms, le sexe, la discipline et la date de naissance sont grisés : la base les refuse de toute façon. Les autres champs restent modifiables, la fiche reste en ligne et le coach la voit « modifiée, à revoir ». Décocher l'accord de publication retire la fiche du site.

Les entrées de palmarès s'ajoutent et se suppriment une à une, sans attendre l'enregistrement du reste du formulaire. Chacune affiche son statut : « À vérifier », « En ligne » ou « Refusée » avec son motif.

## Catégories de poids

La liste proposée dépend de la discipline et du sexe choisis. Elle se trouve dans `src/lib/profile/options.ts` et se modifie à cet endroit. Le sambo suit les catégories de la FIAS en vigueur depuis le 1er janvier 2021 (hommes −58 à +98 kg, femmes −50 à +80 kg), le MMA les catégories amateurs de l'IMMAF arrondies au kilogramme.

## Photo

Le navigateur réduit la photo à 800 pixels au plus sur le grand côté et la réencode en WebP (en JPEG sur les navigateurs qui ne savent pas produire du WebP). Ce réencodage supprime les métadonnées EXIF, dont la position GPS que les téléphones inscrivent dans les photos. Le fichier est déposé dans le dossier privé du compte ; le serveur vérifie ensuite que le chemin appartient bien au compte, l'enregistre sur la fiche et supprime l'ancienne photo. L'aperçu passe par une adresse signée valable une heure, puisque le bucket est privé.

## Sécurité

Chaque action (enregistrer, soumettre, ajouter ou supprimer une entrée, changer de photo) relit l'identité du compte côté serveur avant d'écrire, et revalide toutes les saisies avec Zod. Les règles de la base restent la dernière barrière : colonnes modifiables limitées, identité verrouillée après publication, photo obligatoirement rangée dans le dossier du compte, entrées de palmarès limitées à son propre palmarès.
