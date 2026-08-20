# LifeMap

Application de suivi d'objectifs personnels et de développement personnel — interface en français.

## Écrans principaux

- **Accueil** — page de présentation
- **Inscription / Connexion** — création de compte et authentification (email/mot de passe, Google/Apple/Microsoft), critères de mot de passe affichés en direct
- **Dashboard (Life Map)** — listes d'objectifs personnalisables (quotidien, hebdomadaire, mensuel, unique), suivi par validations
- **Agenda** — vue calendrier mensuelle des événements et objectifs, résumé du jour, statistiques du mois
- **Profil** — séries de jours d'affilée, statistiques (validations, meilleure série, objectifs actifs), archives des objectifs complétés
- **Explorer** — objectifs communautaires que les utilisateurs rejoignent, avec votes et progression collective

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- [Tailwind CSS 4](https://tailwindcss.com/) (configuration en CSS, pas de `tailwind.config.js`)
- JavaScript uniquement, pas de TypeScript
- [Supabase](https://supabase.com/) (authentification + base de données, Row Level Security)
- [Gemini API](https://aistudio.google.com/) pour l'assistant de décomposition d'objectifs

## Démarrage

```bash
npm install
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — depuis Supabase (Project Settings > API)
- `GEMINI_API_KEY` — depuis [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Base de données

Le schéma SQL se trouve dans [`supabase/migrations/`](supabase/migrations/), à exécuter dans l'ordre via le SQL Editor de Supabase.

## Commandes

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (séries) |

## Internationalisation

Bascule FR/EN par dictionnaire ([`app/dictionnaires.js`](app/dictionnaires.js)) sans changer l'URL.
