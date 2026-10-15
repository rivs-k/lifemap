import { GoogleGenAI } from "@google/genai";

let client = null;

// Client Gemini
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
