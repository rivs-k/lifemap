# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LifeMap — application de suivi d'objectifs personnels et de développement personnel. L'interface est en français (les échanges avec l'utilisateur aussi).

Toutes les pages sont construites et branchées à Supabase, plus la page d'accueil :

- `/inscription`, `/connexion`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` — création de compte, connexion, réinitialisation de mot de passe (email + fournisseurs via [BoutonsFournisseurs.js](app/components/BoutonsFournisseurs.js)), critères de sécurité affichés en direct via [app/lib/motDePasse.js](app/lib/motDePasse.js)
- `/dashboard` — Life Map : listes d'objectifs personnalisables (quotidien/hebdomadaire/mensuel/unique), rendue par [LifeMap.js](app/components/LifeMap.js)
- `/agenda` — vue calendrier mensuelle des événements/objectifs, résumé du jour, statistiques du mois, rendue par [Calendrier.js](app/components/Calendrier.js)
- `/profil` — séries de jours d'affilée, statistiques (validations, meilleure série, objectifs actifs), archives des objectifs complétés
- `/explorer` — objectifs communautaires (quotidien/hebdomadaire/mensuel) que les utilisateurs rejoignent, avec votes, progression collective, nombre de participants, rendue par [Explorer.js](app/components/Explorer.js)
- `/parametres` — changement de mot de passe, langue, déconnexion, suppression de compte

Les pages `/dashboard`, `/profil`, `/agenda`, `/explorer`, `/parametres` partagent la coquille [PageApp.js](app/components/PageApp.js) (garde d'auth + navbar app) — voir [app/lib/routesApp.js](app/lib/routesApp.js) pour la distinction avec les routes marketing.

Back-end : Supabase (auth + base de données), branché. `.env.local` doit être rempli pour que l'auth fonctionne — voir la section Supabase plus bas.

## Commands

```
npm run dev      # serveur de dev (next dev)
npm run build    # build de production (next build)
npm run start    # serveur de production (next start)
npm run lint     # ESLint (eslint .)
npm test         # tests unitaires (node --test app/lib/*.test.js)
```

`next lint` **n'existe plus** : dépréciée en Next 15, supprimée en Next 16. ESLint est configuré directement dans [eslint.config.mjs](eslint.config.mjs) au format flat config, que `eslint-config-next` exporte nativement (inutile d'ajouter `@eslint/eslintrc`/`FlatCompat`).

La règle `react/no-unescaped-entities` interdit les apostrophes droites dans le JSX. Utiliser l'apostrophe typographique `’` plutôt que `&apos;` : elle passe la règle et c'est la forme correcte en français. Elle est employée partout dans l'interface, y compris dans les chaînes JS que la règle ne couvre pas — garder cette cohérence.

## Stack

- Next.js 16 (App Router), React 19
- Tailwind CSS 4 via `@tailwindcss/postcss` ([postcss.config.js](postcss.config.js)) ; tout passe par `@import "tailwindcss";` dans [app/globals.css](app/globals.css) — pas de `tailwind.config.js` (Tailwind 4 se configure en CSS)
- JavaScript uniquement, pas de TypeScript — fichiers `.js`, pas `.tsx`
- `package.json` déclare `"type": "module"`
- Supabase (`@supabase/supabase-js`) pour l'auth et la base de données ; Gemini (`@google/genai`) pour l'assistant de décomposition d'objectifs — voir la section Supabase plus bas

## Fond animé — architecture et pièges

[app/layout.js](app/layout.js) empile des couches `fixed` qui s'appliquent à **toutes** les pages (il n'y a aucun layout imbriqué). Empilement du fond vers l'avant, avec effet de parallaxe au défilement :

1. [app/components/FondDunes.js](app/components/FondDunes.js) — image `/dune-bg.jpg`, `"use client"`, défile à 15 % de la vitesse du scroll (`translate3d` écrit directement dans `style`, pas via un `useState`). Hauteur `130vh` pour ne pas découvrir de vide en bas quand elle monte
2. overlay `bg-black/40`
3. contenu des pages en `relative z-10`
4. navbar en `z-20`
5. [app/components/AnimatedBackground.js](app/components/AnimatedBackground.js) — canvas `"use client"`, particules blanches, **en `z-30` (devant tout le contenu)**, `pointer-events-none`. Elles défilent à 35 % (plus vite que les dunes = profondeur) et se replient via un modulo pour ne pas vider le ciel

Trois contraintes qui cassent le rendu si on les oublie :

- **Ne jamais mettre `bg-black` (ni aucun fond opaque) sur le `<main>` d'une page.** Le contenu est au-dessus des couches de fond ; un fond opaque masque entièrement l'image et les particules.
- **`public/` doit être à la racine du projet**, à côté de `app/` — pas dans `app/public/`. Sinon `/dune-bg.jpg` renvoie un 404 silencieux.
- Le canvas est `pointer-events-none` : indispensable, sinon être en `z-30` intercepterait tous les clics de l'interface.
- Si on augmente le facteur de parallaxe des dunes, augmenter `130vh` en proportion.

## Internationalisation (i18n)

Bascule FR/EN par dictionnaire + Context React, **sans librairie et sans changer l'URL**.

- [app/dictionnaires.js](app/dictionnaires.js) — objet `textes` avec une clé par langue (`fr`, `en`). **Les deux langues doivent avoir une structure strictement identique** (mêmes clés, mêmes longueurs de tableaux) ; une clé manquante dans `en` plante au basculement. Ajouter une langue = ajouter une clé ici, rien d'autre.
- [app/components/LangueProvider.js](app/components/LangueProvider.js) — expose `{ langue, basculer, t }` via `useLangue()`. `t` = les textes de la langue courante. Met aussi à jour `<html lang>` pour les lecteurs d'écran.
- Tout composant qui affiche du texte doit être `"use client"` et lire via `useLangue()` — pas de chaîne d'interface en dur dans le JSX. Les valeurs localisées ne sont pas que du texte : chiffres inclus (`2 265`/`2,265`, `87 %`/`87%`).
- Le slogan de marque et « Email » sont volontairement identiques dans les deux langues.
- Dans [app/inscription/page.js](app/inscription/page.js), les libellés des critères de mot de passe viennent du dictionnaire mais les fonctions de test restent dans la page, **couplées par position** — garder les deux listes dans le même ordre.

## Supabase (back-end)

Branché. Le code est prêt, **vérifier que `.env.local` est bien rempli** avant de supposer que l'auth fonctionne (il ne l'est pas forcément sur toutes les machines).

- Librairie : `@supabase/supabase-js` (approche client simple, pas `@supabase/ssr`). Adapté tant que l'auth se fait depuis des composants client ; migrer vers `@supabase/ssr` si un jour des routes serveur doivent lire la session (ex. `/profil` protégé côté serveur).
- [app/lib/supabase.js](app/lib/supabase.js) — client unique partagé. Lève une erreur explicite si les clés manquent (donc ne l'importer que là où on l'utilise vraiment).
- Clés dans `.env.local` (gitignoré) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Modèle dans `.env.example`. La clé anon est publique (protégée par Row Level Security), safe côté navigateur.
- [app/lib/erreursAuth.js](app/lib/erreursAuth.js) traduit les erreurs Supabase Auth en messages français affichés dans les formulaires.

### Assistant IA — décomposition d'objectif (Gemini)

[AssistantObjectif.js](app/components/AssistantObjectif.js) laisse décrire un objectif large en texte libre et appelle [POST /api/decouper-objectif](app/api/decouper-objectif/route.js), qui le décompose en 3 à 6 sous-objectifs typés (nom, type, emoji) via Gemini, schéma JSON imposé en sortie.

- [app/lib/gemini.js](app/lib/gemini.js) — client Gemini paresseux, **clé `GEMINI_API_KEY` sans préfixe `NEXT_PUBLIC_`** : ne jamais l'importer depuis un composant `"use client"`, uniquement depuis les routes API.
- La route vérifie un jeton Bearer Supabase avant d'appeler Gemini (appel facturé, réservé aux utilisateurs connectés).

### Schéma & migrations

SQL dans [supabase/migrations/](supabase/migrations/), à exécuter à la main et **dans l'ordre** dans le SQL Editor (pas de CLI Supabase) :

| Migration | Contenu |
| --- | --- |
| `0001_profiles.sql` | table `profiles` + trigger de création à l'inscription |
| `0002_listes_objectifs.sql` | Life Map : `listes`, `objectifs`, `completions` |
| `0003_evenements.sql` | événements de l'agenda |
| `0004_evenements_multi_jours.sql` | événements sur plusieurs jours |
| `0005_explorer.sql` | objectifs communautaires (voir section dédiée) |
| `0006_avatars.sql` | avatars de profil |
| `0007_objectif_sans_type.sql` | objectifs sans type (ex. tâches ponctuelles libres) |
| `0008_supprimer_niveau_xp.sql` | retire `profiles.niveau`/`xp` (système de niveaux abandonné) |
| `0009_suppression_compte.sql` | suppression de compte utilisateur |

- `profiles` (id → auth.users, pseudo, avatar) — créé automatiquement à l'inscription par un trigger.
- `listes` (colonnes de la Life Map) : `titre`, `couleur`, `position`. Libres, créées par l'utilisateur.
- `objectifs` : `liste_id` (changer = déplacer), `type` ∈ {quotidien, hebdomadaire, mensuel, unique}, `emoji`, `archive`, `position`. **Pas de booléen `termine`.**
- `completions` : une ligne = objectif validé pour une `periode` (date). Cocher = insérer, décocher = supprimer.
- Toutes les tables sont en RLS `auth.uid() = user_id`. Supprimer une liste **archive** ses objectifs (trigger `avant_suppression_liste`), ne les détruit pas.

### Explorer — données partagées (exception au modèle RLS)

`0005_explorer.sql`. **Seule partie du projet où la lecture n'est pas limitée à ses propres lignes.**

- `objectifs_communautaires`, `votes_communautaires`, `participations` : `select` ouvert `to authenticated using (true)`, mais l'écriture reste `auth.uid() = user_id` (ou `cree_par`). Chacun voit tout, n'écrit que pour soi.
- **Rejoindre crée un objectif personnel** dans une liste dédiée « Objectifs rejoints » (créée au besoin), avec `objectifs.objectif_communautaire_id` renseigné. Les validations passent donc par `completions` comme le reste — pas de mécanisme parallèle. Quitter **archive** cet objectif.
- `stats_communautaires()` — fonction **`security definer`**, le seul endroit du projet qui contourne la RLS. Nécessaire : participants, « terminé N fois », progression de la période et meilleure série agrègent les données de *tous* les participants, que la RLS masque à l'appelant. Elle ne renvoie **que des agrégats**, jamais de ligne individuelle. Ne pas y ajouter de colonne exposant un utilisateur.
- Les séries collectives sont calculées en SQL par la technique des « îlots » : on numérote les validations par utilisateur et on soustrait ce rang à la date ; la clé reste constante tant que les périodes se suivent. Le pas s'adapte au type (1 jour / 7 jours / 1 mois).

### Tracker d'habitudes — le principe clé

**Pas de reset planifié (pas de cron).** L'état « fait » n'est pas un booléen qu'on remet à zéro : c'est la présence d'une ligne `completions` pour la **période courante**. Quand la période change (minuit / lundi / 1er du mois), l'ancienne ligne ne correspond plus → décoché automatiquement.

- Semaine **lundi→dimanche** (période = le lundi). Mois = le 1er. Flamme 🔥 dès **2** périodes consécutives.
- La logique (clé de période, série, « fait maintenant ? ») est dans [app/lib/periodes.js](app/lib/periodes.js), **calculée en date locale** et couverte par des tests (relancer le script de test si on la modifie). `type: "unique"` = pas de série, validé une fois.

## Points et niveaux — supprimé

Le système d'XP et de niveaux a été **retiré** pour simplifier le code (`app/lib/points.js`, `app/components/PastilleNiveau.js` et leurs tests supprimés ; colonnes `profiles.niveau`/`xp` droppées par la migration `0008`). Il ne reste plus de notion de points, de multiplicateur ou de palier de niveau. La **série** (flamme 🔥), elle, subsiste : elle vient de [app/lib/periodes.js](app/lib/periodes.js), pas du système de points.

Les objectifs **archivés** ne comptent pas dans « objectifs actifs » mais leurs validations restent dans `completions` et alimentent les statistiques (validations, meilleure série). Une suppression définitive efface les completions en cascade — c'est la différence assumée entre archiver et supprimer.

## Conventions de style

**Pas d'effet néon.** Contrainte explicite de l'utilisateur. Sur un fond quasi noir, `teal-400` et plus clair produisent un halo d'enseigne lumineuse — à éviter. L'accent s'arrête à `teal-500`, et `teal-300`/`teal-400` ne servent que pour les états de survol, qui doivent rester plus clairs que leur base.

- Thème sombre, accent turquoise : `teal-500` pour le texte/les chiffres/les titres, `teal-700`/`hover:teal-600` pour les boutons pleins, `teal-500` pour les bordures de focus. Boutons en `rounded-full`
- Titres en Oswald, appliqué via `style={{ fontFamily: "var(--font-oswald)" }}` en inline (la police est chargée par `next/font/google` dans le layout, qui expose `--font-oswald`) ; souvent combiné à `uppercase tracking-wide`
- Sections pleine hauteur centrées : `min-h-screen flex flex-col items-center justify-center text-center px-6`
- Les contenus répétés (liste d'objectifs, cartes de stats, boutons fournisseurs…) viennent du dictionnaire i18n et sont rendus avec `.map()`, jamais copiés-collés. Champs de formulaire via le composant partagé [app/components/ChampTexte.js](app/components/ChampTexte.js)
