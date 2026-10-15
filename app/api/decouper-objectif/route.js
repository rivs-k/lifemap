import { NextResponse } from "next/server";
import { getGemini } from "../../lib/gemini";
import { supabase } from "../../lib/supabase";

// Schéma
const SCHEMA = {
  type: "object",
  properties: {
    objectifs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nom: { type: "string" },
          type: {
            type: "string",
            enum: ["quotidien", "hebdomadaire", "mensuel", "unique"],
          },
        },
        required: ["nom", "type"],
      },
    },
  },
  required: ["objectifs"],
};

// Route POST = route API
export async function POST(request) {
  // Authentification la route demande à Supabase si jeton valide
  const jeton = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data } = await supabase.auth.getUser(jeton);
  if (!data?.user) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  // Validation
  const corps = await request.json().catch(() => null);
  const texte = (corps?.objectif || "").trim();
  if (!texte || texte.length > 300) {
    return NextResponse.json({ erreur: "objectif_invalide" }, { status: 400 });
  }

  // Modèles
  const modeles = (process.env.GEMINI_MODELS || "gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  // Appel Gemini
  let texteReponse;
  let derniereErreur;
  // On essaie les modèles un par un jusqu'à ce que l'un réponde
  for (const modele of modeles) {
    try {
      const reponse = await getGemini().models.generateContent({
        model: modele,
        contents:
          "Tu aides à décomposer un objectif personnel large en sous-objectifs concrets et " +
          "actionnables, pour une application de suivi d'habitudes et de Life Map. Rédige les noms des sous-objectifs dans la même langue que l'objectif (français ou anglais).\n\n" +
          `Objectif à décomposer : "${texte}"\n\n` +
          "Décompose-le en 3 à 6 sous-objectifs concrets. Choisis pour chacun le type le plus adapté : " +
          "quotidien (habitude de tous les jours), hebdomadaire (régulier mais pas quotidien), " +
          "mensuel (jalon mensuel), unique (tâche ponctuelle à faire une seule fois).",
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: SCHEMA,
        },
      });
      texteReponse = reponse.text;
      break;
    } catch (e) {
      derniereErreur = e;
      console.error(`[Gemini] échec avec ${modele} :`, e?.status, e?.message);
      // Clé refusée : inutile d'essayer les autres modèles
      if (e?.status === 401 || e?.status === 403) break;
      // Modèle surchargé : petite pause avant de passer au suivant
      if (e?.status === 503) await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Erreurs
  if (!texteReponse) {
    const e = derniereErreur;
    if (e?.status === 429) return NextResponse.json({ erreur: "quota_atteint" }, { status: 429 });
    if (e?.status === 503) return NextResponse.json({ erreur: "ia_surchargee" }, { status: 503 });
    return NextResponse.json({ erreur: "reponse_invalide" }, { status: 502 });
  }

  // Réponse
  try {
    return NextResponse.json(JSON.parse(texteReponse));
  } catch {
    return NextResponse.json({ erreur: "reponse_invalide" }, { status: 502 });
  }
}
