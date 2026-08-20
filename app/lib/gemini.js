import { GoogleGenAI } from "@google/genai";

// Ne jamais importer depuis un composant "use client" : la clé n'a pas le
// préfixe NEXT_PUBLIC_, elle ne doit exister que côté serveur (routes API).
// Initialisation paresseuse : `next build` évalue les routes API avant que les
// variables d'environnement soient forcément présentes — on reporte l'erreur
// au premier appel réel plutôt que de casser le build.
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
