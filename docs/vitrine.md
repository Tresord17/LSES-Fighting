# Pages Sambo, MMA et actualités

Ces pages forment la vitrine du site (BF-01 et BF-08). Elles sont ouvertes à tous et lues par le client « visiteur », sans session.

## Pages des disciplines

`/fr/disciplines/sambo` et `/fr/disciplines/mma` suivent la maquette de la page Sambo. On y trouve un bandeau, deux paragraphes de présentation, quatre repères, la galerie d'images, les vidéos, puis l'encart « Où pratiquer ? ». Cet encart compte les coachs en ligne qui enseignent la discipline, cite leurs villes et renvoie vers les répertoires déjà filtrés.

Les textes de présentation et les repères sont rédigés dans `messages/fr.json` et `messages/en.json` (espace `discipline`). Ils restent à faire valider par le client. Les couleurs de la maquette (doré et bleu) ont été remplacées par la mention « Rouge ou bleu », qui correspond à la tenue des combattants de sambo.

La galerie n'affiche d'abord que quatre vignettes. La dernière annonce le nombre d'images restantes et déplie la galerie. Un toucher agrandit l'image dans une fenêtre modale. On passe à l'image voisine avec les flèches, le clavier ou un glissement du doigt, et Échap ferme la fenêtre. L'image complète n'est téléchargée qu'à ce moment-là.

Aucun lecteur vidéo n'est chargé avant le clic (BNF-01). Seule l'affiche s'affiche. Le clic charge ensuite le lecteur YouTube sans cookies (`youtube-nocookie.com`), le lecteur Facebook ou le lecteur natif pour un MP4 déposé. Une seule vidéo joue à la fois.

## Vignettes

Chaque fichier déposé par le superviseur est accompagné d'une vignette de 640 pixels au plus. Elle est fabriquée dans le navigateur au moment de l'envoi et rangée à côté du fichier (`sambo/…-a1b2c3d4e5.vignette.webp`). Pour une vidéo, la vignette est une image extraite vers la première seconde. Les galeries, les listes et l'accueil ne chargent que ces vignettes, soit quelques dizaines de Ko chacune. La suppression d'un média ou d'une couverture efface aussi sa vignette. Un fichier déposé avant l'étape 9 n'en a pas : l'image complète la remplace alors automatiquement.

## Actualités

`/fr/actualites` présente l'article le plus récent en grand, puis les autres (60 au plus). La page d'un article affiche la date, le chapeau, la couverture et le texte, dont les retours à la ligne sont conservés. Suivent les boutons de partage et trois autres articles. En anglais, un article sans titre anglais s'affiche en français avec une mention, et son texte est marqué `lang="fr"` pour les lecteurs d'écran. Les brouillons restent introuvables (404), et le plan du site ne liste que les articles publiés.

## Accueil

Les cartes Sambo et MMA prennent la première image de leur galerie. La section « Actualités » montre les deux derniers articles publiés et disparaît tant qu'il n'y en a aucun. Les actualités de démonstration ont été supprimées.

## Mise à jour des pages

Ces pages sont statiques et régénérées au plus toutes les cinq minutes. Un ajout, une suppression, une publication ou un retrait fait depuis l'espace superviseur les régénère aussitôt. En revanche, une modification faite directement dans Supabase (éditeur SQL, tableau) n'apparaît qu'au bout de cinq minutes au plus.

## Poids des pages

Mesuré sur mobile, au premier chargement (données compressées, images de test) :

| Page    | Total  | Scripts | Polices | Images |
| ------- | ------ | ------- | ------- | ------ |
| Sambo   | 489 Ko | 233 Ko  | 155 Ko  | 40 Ko  |
| Accueil | 538 Ko | 233 Ko  | 155 Ko  | 85 Ko  |
| Article | 450 Ko | 233 Ko  | 155 Ko  | 3 Ko   |

Le favicon pointait vers le logo complet (107 Ko) ; il utilise désormais une icône de 6 Ko. Avec de vraies photos (40 à 60 Ko par vignette), les pages Sambo et Accueil approcheront la limite de 600 Ko fixée par BNF-01. Une passe d'allègement est donc prévue : moins de graisses de police préchargées, et le client Supabase retiré des pages publiques.
