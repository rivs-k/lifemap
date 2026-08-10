# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LifeMap — application de suivi d'objectifs personnels et de développement personnel. L'interface est en français (les échanges avec l'utilisateur aussi).

Quatre écrans principaux, tous encore à l'état de squelette (un `<h1>` chacun) sauf la page d'accueil :

- `/inscription` — création de compte : nom d'utilisateur, email, mot de passe avec critères de sécurité affichés, connexion via Google/Apple/Microsoft
- `/agenda` — vue calendrier mensuelle des événements/objectifs, résumé du jour, statistiques du mois
- `/profil` — dashboard : niveau, XP, badges, séries de jours d'affilée, statistiques détaillées, historique d'activité, archives des objectifs complétés
- `/explorer` — objectifs communautaires (quotidien/hebdomadaire/mensuel) que les utilisateurs rejoignent, avec votes, progression collective, nombre de participants

Back-end prévu : Supabase (auth + base de données). Rien n'est encore branché — les chiffres de la page d'accueil sont des données en dur.

## Commands

```
npm run dev      # serveur de dev (next dev)
npm run build    # build de production (next build)
npm run start    # serveur de production (next start)
npm run lint     # ESLint (eslint .)
```

Pas de tests configurés — `npm test` n'existe pas.

`next lint` **n'existe plus** : dépréciée en Next 15, supprimée en Next 16. ESLint est configuré directement dans [eslint.config.mjs](eslint.config.mjs) au format flat config, que `eslint-config-next` exporte nativement (inutile d'ajouter `@eslint/eslintrc`/`FlatCompat`).

La règle `react/no-unescaped-entities` interdit les apostrophes droites dans le JSX. Utiliser l'apostrophe typographique `’` plutôt que `&apos;` : elle passe la règle et c'est la forme correcte en français. Elle est employée partout dans l'interface, y compris dans les chaînes JS que la règle ne couvre pas — garder cette cohérence.

## Stack

- Next.js 16 (App Router), React 19
- Tailwind CSS 4 via `@tailwindcss/postcss` ([postcss.config.js](postcss.config.js)) ; tout passe par `@import "tailwindcss";` dans [app/globals.css](app/globals.css) — pas de `tailwind.config.js` (Tailwind 4 se configure en CSS)
- JavaScript uniquement, pas de TypeScript — fichiers `.js`, pas `.tsx`
- `package.json` déclare `"type": "module"`

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

En cours de mise en place. Le code est prêt, **le projet Supabase et les clés peuvent encore manquer** — vérifier `.env.local` avant de supposer que l'auth fonctionne.

- Librairie : `@supabase/supabase-js` (approche client simple, pas `@supabase/ssr`). Adapté tant que l'auth se fait depuis des composants client ; migrer vers `@supabase/ssr` si un jour des routes serveur doivent lire la session (ex. `/profil` protégé côté serveur).
- [app/lib/supabase.js](app/lib/supabase.js) — client unique partagé. Lève une erreur explicite si les clés manquent (donc ne l'importer que là où on l'utilise vraiment).
- Clés dans `.env.local` (gitignoré) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Modèle dans `.env.example`. La clé anon est publique (protégée par Row Level Security), safe côté navigateur.
- ⚠️ Le dépôt git est enraciné dans `C:/Users/CMFPRVL` (dossier perso), pas dans `lifemap`. Le `.gitignore` du projet protège `.env*.local` — ne jamais committer de secret.

### Schéma & migrations

SQL dans [supabase/migrations/](supabase/migrations/), à exécuter à la main dans le SQL Editor (pas de CLI Supabase). `0001_profiles.sql` : table `profiles` + trigger de création à l'inscription. `0002_listes_objectifs.sql` : Life Map.

- `profiles` (id → auth.users, pseudo, niveau, xp) — créé automatiquement à l'inscription par un trigger.
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

## Points et niveaux

Règles validées avec l'utilisateur, implémentées dans [app/lib/points.js](app/lib/points.js) (couvert par des tests — relancer le script si on y touche).

- **XP par validation** : quotidien 10, hebdomadaire 50, mensuel 150, unique 10. Échelle volontairement **sous-proportionnelle** (une semaine vaut 5 jours et non 7) : tenir une habitude chaque jour est le plus exigeant, c'est donc la régularité quotidienne qui est le mieux payée. `unique` est bas car un objectif ponctuel va de « passer un coup de fil » à « passer le permis ».
- **Bonus de série**, appliqué à la série *au moment de la validation* : ×1,2 dès 2, ×1,5 dès 7, ×2 dès 30 (plafonné).
- **Seuil de niveau** = `25 × N × (N−1)` → niveau 2 à 50 XP, 3 à 150, 4 à 300. L'écart grandit de 50 par palier.

**L'XP n'est jamais stocké — il est recalculé depuis `completions`.** C'est le point à ne pas casser : on peut décocher un objectif, et un compteur stocké dériverait au moindre oubli de décrémenter, sans possibilité de correction. Recalculé, décocher retire les points mécaniquement. Les colonnes `profiles.niveau` et `profiles.xp` existent encore mais **ne sont pas lues**.

Les objectifs **archivés** comptent dans l'XP (les validations ont été gagnées) mais pas dans « objectifs actifs ». Une suppression définitive, elle, efface les completions en cascade et fait donc baisser l'XP — c'est la différence assumée entre archiver et supprimer.

## Conventions de style

**Pas d'effet néon.** Contrainte explicite de l'utilisateur. Sur un fond quasi noir, `teal-400` et plus clair produisent un halo d'enseigne lumineuse — à éviter. L'accent s'arrête à `teal-500`, et `teal-300`/`teal-400` ne servent que pour les états de survol, qui doivent rester plus clairs que leur base.

- Thème sombre, accent turquoise : `teal-500` pour le texte/les chiffres/les titres, `teal-700`/`hover:teal-600` pour les boutons pleins, `teal-500` pour les bordures de focus. Boutons en `rounded-full`
- Titres en Oswald, appliqué via `style={{ fontFamily: "var(--font-oswald)" }}` en inline (la police est chargée par `next/font/google` dans le layout, qui expose `--font-oswald`) ; souvent combiné à `uppercase tracking-wide`
- Sections pleine hauteur centrées : `min-h-screen flex flex-col items-center justify-center text-center px-6`
- Les contenus répétés (liste d'objectifs, cartes de stats, boutons fournisseurs…) viennent du dictionnaire i18n et sont rendus avec `.map()`, jamais copiés-collés. Champs de formulaire via le composant partagé [app/components/ChampTexte.js](app/components/ChampTexte.js)
