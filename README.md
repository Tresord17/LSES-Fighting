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

Le schéma complet est décrit dans [`docs/base-de-donnees.md`](docs/base-de-donnees.md). Il tient en quatre migrations versionnées dans `supabase/migrations`, que l'on applique ainsi :

1. Créer un projet sur [supabase.com](https://supabase.com) (plan gratuit), région **West EU (London)**, la plus proche à la fois du Cameroun et du client au Royaume-Uni. On conserve le mot de passe de la base dans un gestionnaire de mots de passe.
2. Dans _Project Settings › API Keys_, copier l'URL du projet et la **clé publishable** (`sb_publishable_…`) dans `.env.local`. La clé secrète ne doit jamais apparaître dans le code du site.
3. Lier le projet et appliquer les migrations :

   ```powershell
   npm run db:login   # autorise la CLI Supabase depuis le navigateur
   npm run db:link    # choisir le projet, puis saisir le mot de passe de la base
   npm run db:push    # applique les migrations de supabase/migrations
   ```

   Sans la CLI, on peut aussi coller les quatre fichiers, dans l'ordre, dans _SQL Editor_.

4. Vérifier la sécurité : coller `supabase/tests/scenarios_securite.sql` dans _SQL Editor_ et l'exécuter. Le script simule des athlètes, des coachs, le superviseur et un visiteur, tente 79 actions permises ou interdites, puis annule tout. S'il se termine sans message « ÉCHEC », tout est conforme.
5. Dans _Authentication › Sign In / Providers › Email_, activer la confirmation de l'adresse et fixer la longueur minimale du mot de passe à 10 caractères. Dans _Authentication › URL Configuration_, mettre `http://localhost:3000` comme Site URL et ajouter `http://localhost:3000/**` aux Redirect URLs.
6. Quand le client s'est inscrit sur le site, lui donner le rôle de superviseur général avec `supabase/sql/promouvoir-superviseur.sql` (en remplaçant l'adresse).

Après chaque nouvelle migration, on régénère les types TypeScript avec `npm run db:types` : l'autocomplétion de VS Code connaît alors toutes les tables et fonctions.

> Le plan gratuit met le projet en pause après une semaine sans activité. Il suffit de le relancer depuis le tableau de bord.

## 7. Organisation du code

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
  lib/
    supabase/        Clients Supabase, types de la base, traduction des erreurs SQL
    theme.ts         Logique du thème clair / sombre
    site.ts          Menu principal et liens vers les réseaux sociaux
    demo-data.ts     Données de démonstration, à remplacer par Supabase
  proxy.ts           Proxy Next.js 16 : choix de la langue puis session Supabase
supabase/
  migrations/        Schéma de la base, règles d'accès, circuit de validation, stockage
  tests/             Scénarios de sécurité exécutables dans le SQL Editor
  sql/               Scripts d'administration (promotion du superviseur)
docs/                Documentation technique (base de données)
```

## 8. Conventions

**Textes.** Aucun texte en dur dans les composants : chaque libellé vit dans `messages/fr.json` et `messages/en.json`, sous la même clé. Une clé manquante est signalée par TypeScript.

**Liens.** On importe `Link`, `useRouter` et `redirect` depuis `@/i18n/navigation` et non depuis `next/link` : ils ajoutent le préfixe de langue automatiquement.

**Couleurs.** On utilise uniquement les jetons du design system, jamais de code hexadécimal dans les composants : `bg-background`, `bg-surface`, `border-line`, `text-foreground`, `text-muted`, `text-subtle`, `text-gold-ink` pour un texte doré, `bg-gold` toujours accompagné de `text-on-gold`. Le rouge sang (`blood`) est réservé à l'urgence et au refus, le bleu (`admin`) au back-office.

**Thème.** Le thème est posé sur `<html data-theme>` avant le premier affichage par un script placé dans le `<head>` : aucun clignotement. La variante Tailwind `dark:` suit cet attribut.

**Sécurité.** Côté serveur, l'identité se vérifie avec `supabase.auth.getClaims()`, jamais avec `getSession()` seul. Les changements de statut (soumettre, valider, refuser) passent toujours par les fonctions `supabase.rpc(...)` du circuit de validation, jamais par une écriture directe dans les tables. Leurs erreurs se traduisent avec `getDbErrorKey` (`src/lib/supabase/errors.ts`). Les en-têtes de sécurité de base sont définis dans `next.config.ts` ; la politique CSP sera ajoutée quand les domaines des médias seront connus.

## 9. Reste à compléter

Les liens WhatsApp, Facebook et Instagram du client (`src/lib/site.ts`) s'afficheront dans le pied de page dès qu'ils seront renseignés. Les pages marquées « En cours de développement » seront construites au fil des étapes.

## Dépannage

Si le port 3000 est déjà pris, on lance `npm run dev -- -p 3001`. Si une erreur persiste après une mise à jour des dépendances, on supprime les dossiers `.next` et `node_modules` puis on relance `npm install`.
