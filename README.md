# LifeMap

Application web de développement personnel pour organiser, suivre et atteindre ses objectifs, avec un espace communautaire et un assistant IA. Interface disponible en français et en anglais.

## Écrans principaux

- **Accueil** : page de présentation de l'application
- **Inscription / Connexion** : création de compte par email et mot de passe ou avec Google, critères du mot de passe vérifiés en direct, acceptation des CGU, mot de passe oublié
- **Dashboard (Life Map)** : colonnes personnalisables par glisser-déposer, objectifs quotidiens, hebdomadaires, mensuels ou ponctuels, suivi par validations, prochain événement de l'agenda
- **Assistant IA** : découpe un objectif large en sous-objectifs concrets grâce à Gemini
- **Agenda** : calendrier mensuel, création et suppression d'événements (y compris sur plusieurs jours)
- **Explorer** : objectifs communautaires à rejoindre, votes, nombre de participants et progression collective
- **Profil** : photo de profil, statistiques (validations, objectifs actifs) et archives des objectifs
- **Paramètres** : changement de mot de passe, export des données (RGPD) et suppression du compte

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) et React 19, en JavaScript
- [Tailwind CSS 4](https://tailwindcss.com/) (configuration en CSS, sans `tailwind.config.js`)
- [Supabase](https://supabase.com/) : base de données PostgreSQL, authentification, stockage des photos et Row Level Security
- [API Gemini](https://aistudio.google.com/) : assistant de décomposition d'objectifs, appelé depuis une route API côté serveur

## Démarrage

```bash
npm install
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

Créer un fichier `.env.local` à la racine du projet avec :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` : dans Supabase, Project Settings > API
- `GEMINI_API_KEY` : clé de l'API Gemini, utilisée uniquement côté serveur
- `GEMINI_MODELS` (facultatif) : liste de modèles Gemini séparés par des virgules, essayés dans l'ordre si le quota de l'un est atteint (par défaut `gemini-3.8-flash`, `gemini-3.6-flash` puis `gemini-3.5-flash-lite`)

Ce fichier contient des clés secrètes : il est exclu de Git et ne doit jamais être partagé.

## Internationalisation

Bascule FR / EN instantanée grâce à un dictionnaire de traductions ([`app/dictionnaires.js`](app/dictionnaires.js)), sans changer l'URL.
