# LSES Fighting

Plateforme de promotion du sambo et du MMA au Cameroun (« La Sueur Épargne Le Sang »). Ce dépôt contient le site public et, à terme, l'espace coach et le back-office du superviseur général.

**Stack** : Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · next-intl (FR/EN) · Supabase (PostgreSQL, Auth, Storage).

---

## 1. Préparer le poste (Windows 11)

Nous ouvrons un terminal **PowerShell** (clic droit sur Démarrer › Terminal) et installons les outils avec `winget`.

```powershell
winget install OpenJS.NodeJS.LTS   # Node.js 24 LTS, fournit aussi npm
winget install Git.Git
```

On ferme puis rouvre le terminal, et on vérifie :

```powershell
node -v    # v24.x attendu (minimum 20.9)
npm -v
git -v
```

Si PowerShell refuse de lancer `npm` avec le message _« l'exécution de scripts est désactivée »_, on autorise les scripts signés pour notre compte uniquement :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Enfin, on configure Git une seule fois :

```powershell
git config --global user.name "Prénom NOM"
git config --global user.email "adresse@exemple.com"
git config --global core.autocrlf false
```

`core.autocrlf false` évite que Git convertisse les fins de ligne : le projet impose des fins de ligne Unix (`.gitattributes`), identiques chez les deux développeurs.

## 2. Ouvrir le projet dans VS Code

```powershell
cd "D:\Cours\Projets\lses-fighting"
Rename-Item _vscode .vscode      # une seule fois : réglages VS Code partagés du projet
code .
```

À l'ouverture, VS Code propose d'installer les **extensions recommandées** (fichier `.vscode/extensions.json`) : on accepte. Elles apportent la correction ESLint, le formatage Prettier à l'enregistrement, l'autocomplétion des classes Tailwind et l'édition des traductions avec i18n Ally. Quand VS Code demande quelle version de TypeScript utiliser, on choisit celle de l'espace de travail.

## 3. Installer et lancer

```powershell
Copy-Item .env.example .env.local   # une seule fois
npm install
npm run dev
```

Le site est alors disponible sur **http://localhost:3000**, que nous ouvrons dans Brave. La racine redirige vers `/fr` ou `/en` selon la langue du navigateur. Chaque enregistrement de fichier recharge la page instantanément.

Le fichier `.env.local` contient les valeurs d'exemple : le site fonctionne sans Supabase tant que nous travaillons sur l'interface. Il n'est jamais versionné.

> **Tester le thème dans Brave.** Le mode « Système » suit Windows (Paramètres › Personnalisation › Couleurs). Si Brave force un thème dans `brave://settings/appearance`, c'est ce réglage qui l'emporte.

## 4. Scripts disponibles

`npm run dev` lance le serveur de développement. `npm run build` produit la version de production, que `npm run start` sert ensuite localement. `npm run lint` vérifie le code avec ESLint, `npm run typecheck` contrôle les types, et `npm run format` reformate tout le projet avec Prettier. Les scripts `db:*` pilotent la base Supabase (section 6).

Avant chaque envoi sur le dépôt, nous lançons au minimum `npm run lint` et `npm run build`.

## 5. Versionner avec Git et GitHub

On crée un dépôt **privé** vide sur GitHub (sans README), puis :

```powershell
git init -b main
git add .
git commit -m "Initialisation du projet LSES Fighting"
git remote add origin https://github.com/<compte>/lses-fighting.git
git push -u origin main
```

On invite ensuite le coéquipier dans _Settings › Collaborators_. Chaque fonctionnalité se développe sur sa propre branche (`git switch -c feature/fiche-athlete`) et rejoint `main` par une pull request relue par l'autre.

## 6. Base de données Supabase

Le schéma complet est décrit dans [`docs/base-de-donnees.md`](docs/base-de-donnees.md). Il tient en cinq migrations versionnées dans `supabase/migrations`, que l'on applique ainsi :

1. Créer un projet sur [supabase.com](https://supabase.com) (plan gratuit), région **West EU (London)**, la plus proche à la fois du Cameroun et du client au Royaume-Uni. On conserve le mot de passe de la base dans un gestionnaire de mots de passe.
2. Dans _Project Settings › API Keys_, copier l'URL du projet et la **clé publishable** (`sb_publishable_…`) dans `.env.local`. La clé secrète ne doit jamais apparaître dans le code du site.
3. Lier le projet et appliquer les migrations :

   ```powershell
   npm run db:login   # autorise la CLI Supabase depuis le navigateur
   npm run db:link    # choisir le projet, puis saisir le mot de passe de la base
   npm run db:push    # applique les migrations de supabase/migrations
   ```

   Sans la CLI, on peut aussi coller les fichiers, dans l'ordre, dans _SQL Editor_. Pour une base déjà en place, `npm run db:push` n'applique que les migrations nouvelles.

4. Vérifier la sécurité : coller `supabase/tests/scenarios_securite.sql` dans _SQL Editor_ et l'exécuter. Le script simule des athlètes, des coachs, le superviseur et un visiteur, tente 79 actions permises ou interdites, puis annule tout. S'il se termine sans message « ÉCHEC », tout est conforme.
5. Quand le client s'est inscrit sur le site, lui donner le rôle de superviseur général avec `supabase/sql/promouvoir-superviseur.sql` (en remplaçant l'adresse). Pour qu'il puisse aussi vérifier des fiches en tant que coach et apparaître dans le répertoire des coachs, il s'inscrit d'abord comme coach et remplit sa fiche ; la promotion conserve cette fiche.

Après chaque nouvelle migration, on régénère les types TypeScript avec `npm run db:types` : l'autocomplétion de VS Code connaît alors toutes les tables et fonctions.

> Le plan gratuit met le projet en pause après une semaine sans activité. Il suffit de le relancer depuis le tableau de bord.

## 7. Authentification

Le site gère l'inscription et la connexion par e-mail ou avec Google, la confirmation de l'adresse, le mot de passe oublié et le choix du rôle (athlète ou coach). Le fonctionnement est décrit dans [`docs/authentification.md`](docs/authentification.md). Les réglages suivants se font une seule fois dans le tableau de bord Supabase.

1. **Variables.** Dans `.env.local`, renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (_Project Settings › API Keys_), garder `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, puis relancer `npm run dev`.
2. **Adresses autorisées.** Dans _Authentication › URL Configuration_, mettre `http://localhost:3000` comme Site URL et ajouter `http://localhost:3000/**` aux Redirect URLs.
3. **Adresse et mot de passe.** Dans _Authentication › Sign In / Providers › Email_, laisser la confirmation de l'adresse activée et fixer la longueur minimale du mot de passe à 10 caractères.
4. **Modèles d'e-mails.** Supabase n'autorise la modification des modèles qu'une fois un serveur SMTP configuré (point 6). D'ici là, les modèles par défaut fonctionnent avec le site, à une limite près : le lien de confirmation doit être ouvert dans le navigateur qui a servi à l'inscription. Une fois le SMTP en place, on remplace dans _Authentication › Emails › Templates_ le contenu de _Confirm signup_ par `supabase/templates/confirmation.html` et celui de _Reset password_ par `supabase/templates/recovery.html`, avec les sujets indiqués dans `supabase/config.toml`. Ces modèles sont bilingues et leurs liens fonctionnent sur n'importe quel appareil.
5. **Google.** Le fournisseur Google est activé avec l'ID client et le secret. Côté Google Cloud, seule l'URI de redirection de Supabase est nécessaire : les « origines JavaScript autorisées » ne servent qu'au bouton Google intégré dans une page, que nous n'utilisons pas. Tant que l'écran de consentement est en mode _Test_, seuls les comptes ajoutés comme testeurs peuvent se connecter ; il faudra le publier avant l'ouverture au public. Cet écran affiche pour l'instant l'adresse technique `<projet>.supabase.co`. Pour y lire « LSES Fighting », on renseigne dans _Google Auth Platform › Branding_ le nom, le logo, l'e-mail d'assistance, la page d'accueil et la politique de confidentialité du site, avec son nom de domaine en domaine autorisé, puis on demande la vérification de la marque. L'autre voie, payante, est un domaine personnalisé Supabase (par exemple `auth.<domaine>`, plan Pro).
6. **Envoi des e-mails.** Le service d'envoi fourni par Supabase n'écrit qu'aux membres de l'équipe du projet, deux e-mails par heure au plus. Pour les essais, on ajoute les adresses de test dans _Organization › Team_. Avant l'ouverture au public, on configure un serveur SMTP (Brevo ou Resend) dans _Authentication › Emails › SMTP Settings_, de préférence avec le nom de domaine du site.

## 8. Organisation du code

```
messages/            Textes du site : fr.json (référence) et en.json
public/brand/        Logos officiels : doré, noir, blanc
src/
  app/[locale]/      Pages, une par dossier (la langue est le premier segment d'URL)
  components/
    layout/          En-tête, pied de page, menu mobile, sélecteurs de langue et de thème
    home/            Sections de la page d'accueil
    ui/              Briques réutilisables (boutons, titres de section, icônes)
  fonts/             Polices auto-hébergées (Saira Condensed, IBM Plex Sans et Mono)
  i18n/              Configuration de next-intl (langues, navigation, chargement des textes)
  app/auth/          Retours de Google et liens des e-mails (sans préfixe de langue)
  components/auth/   Formulaires d'inscription, de connexion et de mot de passe
  components/profile/ Formulaires de profil athlète et coach, palmarès, photo
  components/review/ File de vérification des coachs, liste « Mes athlètes »
  components/supervisor/ Espace superviseur (comptes de coach, retraits, journal d'audit)
  components/directory/ Répertoires publics (filtres, cartes) et fiches athlète et coach
  app/api/photos/    Photos des fiches en ligne, à une adresse stable pour le partage
  lib/
    auth/            Actions serveur d'authentification, validation, redirections sûres
    profile/         Actions serveur du profil, validation, catégories de poids
    review/          Lecture de la file de vérification, décisions des coachs
    supervisor/      Lectures et actions de l'espace superviseur
    directory/       Lectures des pages publiques (client « visiteur »), filtres d'adresse
    supabase/        Clients Supabase, types de la base, traduction des erreurs SQL
    theme.ts         Logique du thème clair / sombre
    site.ts          Menu principal et liens vers les réseaux sociaux
    demo-data.ts     Actualités de démonstration, en attendant l'espace superviseur
  proxy.ts           Proxy Next.js 16 : choix de la langue puis session Supabase
supabase/
  migrations/        Schéma de la base, règles d'accès, circuit de validation, stockage, recherche
  tests/             Scénarios de sécurité exécutables dans le SQL Editor
  sql/               Scripts d'administration (promotion du superviseur)
  templates/         Modèles des e-mails de confirmation et de mot de passe oublié
docs/                Documentation technique (base, authentification, profil, vérification, répertoires, superviseur)
```

## 9. Conventions

**Textes.** Aucun texte en dur dans les composants : chaque libellé vit dans `messages/fr.json` et `messages/en.json`, sous la même clé. Une clé manquante est signalée par TypeScript.

**Liens.** On importe `Link`, `useRouter` et `redirect` depuis `@/i18n/navigation` et non depuis `next/link` : ils ajoutent le préfixe de langue automatiquement.

**Couleurs.** On utilise uniquement les jetons du design system, jamais de code hexadécimal dans les composants : `bg-background`, `bg-surface`, `border-line`, `text-foreground`, `text-muted`, `text-subtle`, `text-gold-ink` pour un texte doré, `bg-gold` toujours accompagné de `text-on-gold`. Le rouge sang (`blood`) est réservé à l'urgence et au refus, le bleu (`admin`) au back-office.

**Thème.** Le thème est posé sur `<html data-theme>` avant le premier affichage par un script placé dans le `<head>` : aucun clignotement. La variante Tailwind `dark:` suit cet attribut.

**Sécurité.** Côté serveur, l'identité se vérifie avec `supabase.auth.getClaims()`, jamais avec `getSession()` seul. Les changements de statut (soumettre, valider, refuser) passent toujours par les fonctions `supabase.rpc(...)` du circuit de validation, jamais par une écriture directe dans les tables. Leurs erreurs se traduisent avec `getDbErrorKey` (`src/lib/supabase/errors.ts`). Les en-têtes de sécurité de base sont définis dans `next.config.ts` ; la politique CSP sera ajoutée quand les domaines des médias seront connus.

## 10. Reste à compléter

Les liens WhatsApp, Facebook et Instagram du client (`src/lib/site.ts`) s'afficheront dans le pied de page dès qu'ils seront renseignés. Les pages marquées « En cours de développement » seront construites au fil des étapes.

## Dépannage

Si le port 3000 est déjà pris, on lance `npm run dev -- -p 3001`. Si une erreur persiste après une mise à jour des dépendances, on supprime les dossiers `.next` et `node_modules` puis on relance `npm install`.
