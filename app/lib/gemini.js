import { GoogleGenAI } from "@google/genai";

// Ne jamais importer ce fichier depuis un composant "use client" : la clé n'a
// pas le préfixe NEXT_PUBLIC_, elle ne doit exister que côté serveur (routes API).
//
// Initialisation paresseuse (et non au chargement du module, comme supabase.js) :
// `next build` évalue les routes API pour collecter leurs métadonnées, avant que
// les variables d'environnement d'exécution soient nécessairement présentes.
// Lever l'erreur ici casserait le build ; on la reporte au premier appel réel.
let client = null;

export function getGemini() {
  if (!client) {
    const cle = process.env.GEMINI_API_KEY;
    if (!cle) {
      throw new Error(
        "Clé Gemini manquante. Renseigne GEMINI_API_KEY dans .env.local, puis redémarre `npm run dev`.",
      );
    }
    client = new GoogleGenAI({ apiKey: cle });
  }
  return client;
}
