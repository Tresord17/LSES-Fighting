# File de vérification des coachs

La page « Demandes à traiter » (`/fr/mon-espace/demandes`) est l'espace de travail des coachs référencés et du superviseur général. Elle reprend la maquette de l'espace coach : trois indicateurs en tête, la file des demandes, puis la liste des athlètes rattachés au coach. Le bleu du back-office y remplace le doré pour les filets et le bouton « Valider ».

## Accès

Seuls un coach dont le compte est validé et le superviseur général voient la file. Un coach encore en attente lit un message qui l'invite à patienter, un athlète un message qui lui indique que la page ne le concerne pas. Ce contrôle ne sert qu'à l'affichage : les données sont lues avec les droits du compte connecté, et la base refuse d'elle-même toute décision venant d'un autre compte.

## File des demandes

Chaque carte correspond à une demande ouverte, soit une fiche d'athlète complète, soit un ajout de palmarès sur une fiche déjà en ligne (filet doré). La pastille « J−3 » indique les jours restants avant le passage au superviseur ; elle passe au rouge sang le dernier jour. Les demandes que l'on peut trancher viennent d'abord, les plus urgentes en tête. Une demande escaladée reste visible du coach, en lecture seule, avec la mention « Superviseur » ; chez le superviseur, elle passe au contraire en tête de file.

En ouvrant une carte, nous voyons la fiche soumise (sexe, âge, année de début, nombre de combats, coach référent, présentation, photo en grand) et les entrées de palmarès à vérifier. L'âge vient de la fonction `pending_athlete_ages()` : la date de naissance elle-même n'est jamais transmise au coach.

## Décisions

« Valider » publie la fiche et ses entrées de palmarès. Une entrée douteuse peut être écartée d'une case à cocher ; un motif est alors demandé, puisque l'athlète le lira sous l'entrée refusée. « Refuser » ouvre un champ de motif obligatoire, puis « Confirmer le refus » renvoie la fiche à l'athlète, qui voit ce motif dans son espace.

Pour un athlète mineur, un encadré rouge rappelle que la publication exige l'autorisation écrite d'un responsable légal. Le bouton « Valider » reste grisé tant que le coach n'a pas coché l'attestation, et la base refuse de son côté toute validation sans elle.

Toutes les décisions passent par les fonctions `review_athlete_profile` et `review_palmares`, qui vérifient les droits, l'échéance et l'attestation, puis écrivent au journal d'audit au nom du coach. Si une autre personne a tranché la demande entre-temps, la carte disparaît et un message l'explique en haut de la file.

## Mes athlètes

La liste reprend les athlètes qui ont choisi le coach comme référent, avec leur statut. Une fiche en ligne modifiée par l'athlète apparaît « Modifiée, à revoir » : le coach la relit, puis confirme avec « J'ai relu la fiche » (fonction `mark_athlete_reviewed`). Le superviseur voit en plus les fiches modifiées des athlètes rattachés à un autre coach ou à aucun.

## Limites actuelles

Les coachs ne reçoivent pas encore d'e-mail à chaque nouvelle demande : cet envoi viendra avec le serveur SMTP. Les comptes de coach à valider et le journal d'audit seront traités dans l'espace superviseur.
