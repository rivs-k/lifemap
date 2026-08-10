import { NextResponse } from "next/server";
import { getGemini } from "../../lib/gemini";
import { supabase } from "../../lib/supabase";

// Schéma imposé à la réponse de Gemini (response_format.schema) : garantit un
// JSON exploitable directement, sans parsing hasardeux d'un texte libre.
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
          emoji: { type: "string" },
        },
        required: ["nom", "type", "emoji"],
      },
    },
  },
  required: ["objectifs"],
};

export async function POST(request) {
  const jeton = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jeton) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  // Vérifie le jeton auprès de Supabase Auth : seul un utilisateur connecté
  // peut déclencher un appel (facturé, même sur le tier gratuit) à l'API Gemini.
  const { data, error: erreurAuth } = await supabase.auth.getUser(jeton);
  if (erreurAuth || !data?.user) {
    return NextResponse.json({ erreur: "non_authentifie" }, { status: 401 });
  }

  const corps = await request.json().catch(() => null);
  const texte = (corps?.objectif || "").trim();
  if (!texte || texte.length > 300) {
    return NextResponse.json({ erreur: "objectif_invalide" }, { status: 400 });
  }

  let interaction;
  try {
    interaction = await getGemini().interactions.create({
      model: "gemini-3.6-flash",
      input:
        "Tu aides à décomposer un objectif personnel large en sous-objectifs concrets et " +
        "actionnables, pour une application de suivi d'habitudes et de Life Map. Réponds en français.\n\n" +
        `Objectif à décomposer : "${texte}"\n\n` +
        "Décompose-le en 3 à 6 sous-objectifs concrets. Choisis pour chacun le type le plus adapté : " +
        "quotidien (habitude de tous les jours), hebdomadaire (régulier mais pas quotidien), " +
        "mensuel (jalon mensuel), unique (tâche ponctuelle à faire une seule fois). " +
        "Ajoute un emoji pertinent pour chacun.",
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: SCHEMA,
      },
    });
  } catch {
    return NextResponse.json({ erreur: "reponse_invalide" }, { status: 502 });
  }

  if (!interaction?.output_text) {
    return NextResponse.json({ erreur: "reponse_vide" }, { status: 502 });
  }

  try {
    const resultat = JSON.parse(interaction.output_text);
    return NextResponse.json(resultat);
  } catch {
    return NextResponse.json({ erreur: "reponse_invalide" }, { status: 502 });
  }
}
