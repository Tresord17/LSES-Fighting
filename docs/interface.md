# Notifications, thème et animations

## Cloche des notifications

Les coachs référencés et le superviseur général voient une cloche dans l'en-tête, juste après les boutons clair et sombre. Sur mobile, elle se place à gauche du menu. Un compteur doré s'y superpose : c'est le nombre d'éléments qui attendent une décision. La cloche reste absente pour les visiteurs, les athlètes et les coachs pas encore validés.

Un clic ouvre un panneau qui regroupe ces éléments, avec les premiers noms de chaque groupe et leur échéance :

| Groupe                      | Coach référencé | Superviseur |
| --------------------------- | --------------- | ----------- |
| Comptes de coach à valider  | non             | oui         |
| Demandes escaladées         | non             | oui         |
| Fiches d'athlètes à valider | oui             | oui         |
| Palmarès à vérifier         | oui             | oui         |
| Fiches modifiées à revoir   | ses athlètes    | toutes      |

Chaque ligne mène à la page où l'on tranche (`/mon-espace/demandes` ou `/mon-espace/superviseur`), et « Tout voir » ouvre l'espace concerné. Le panneau utilise l'attribut natif `popover` : Échap ou un clic à côté le referment, sans script supplémentaire. Une demande escaladée n'apparaît que chez le superviseur, puisqu'un coach ne peut plus la trancher ; son compteur est rouge sang, la seule urgence de l'écran.

Les chiffres viennent de `/api/notifications`, qui lit la base avec les droits du compte connecté (RLS) et répond sans cache. La cloche relit ces chiffres à la connexion, à chaque changement de page (au plus toutes les 20 secondes), toutes les 90 secondes tant que l'onglet est visible, et aussitôt à l'ouverture du panneau. Elle les relit aussi juste après une décision prise dans la file de vérification ou dans l'espace superviseur. Le compteur baisse donc dès qu'un coach valide ou refuse une fiche.

## Thème

L'en-tête et le menu mobile ne proposent plus que « Clair » et « Sombre ». Le bouton coché est celui du thème affiché, même quand le réglage suit le système. Le choix « Système » reste proposé au pied de page.

## Animations

Les animations tiennent en quelques lignes de CSS (environ 3 Ko compressés) : aucune bibliothèque, et le seul script ajouté est celui de la cloche. Elles ne jouent que sur `transform` et `opacity`, que le navigateur confie à la carte graphique. Toutes s'arrêtent quand le téléphone ou l'ordinateur demande de réduire les animations, et le contenu s'affiche alors directement.

- **Accueil.** Le sur-titre, le titre, le texte puis les boutons arrivent en cascade. « Le sang » est en doré. L'emblème apparaît en fondu, flotte doucement devant un halo doré qui respire, et un reflet traverse le bandeau au chargement. Un grain photographique très léger couvre le tout. Sous le bandeau, un ruban de mots défile en boucle, alternant texte plein et contour doré ; il est décoratif et se met en pause au survol.
- **Défilement.** Les sections, les cartes et les actualités montent en fondu en entrant à l'écran, et le filet doré des titres de section se trace. Ces apparitions utilisent les animations liées au défilement (Chrome, Edge, Safari récents). Les navigateurs qui ne les connaissent pas affichent le contenu normalement.
- **Survols.** Un reflet traverse les boutons dorés, qui s'enfoncent légèrement au clic. Les liens du menu soulignent en doré, les cartes se soulèvent et leurs photos zooment. Les titres des images remontent dans la galerie, et une onde dorée entoure le bouton de lecture des vidéos.
- **Pages.** Chaque page arrive en fondu (`app/[locale]/template.tsx`). Les pages Sambo et MMA portent leur nom en filigrane, qui glisse quand on défile. Les fiches d'athlète s'ouvrent sur un léger recul de la photo. L'agrandissement d'une image, le menu mobile et le panneau de notifications s'ouvrent en fondu.
- **En-tête.** Il devient translucide et flou, et prend une ombre dès que la page quitte le haut.

Mesuré sur mobile avec les images de test, le poids des pages reste proche des mesures de l'étape 9 : Sambo 492 Ko, accueil 548 Ko, article 456 Ko.
