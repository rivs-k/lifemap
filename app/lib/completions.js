import { supabase } from "./supabase";
import { periodeCourante, estFaitMaintenant } from "./periodes";

// Coche / décoche un objectif pour sa période en cours.
//
// Partagé par la Life Map et le panneau « À faire aujourd'hui » : les deux
// doivent écrire exactement la même chose. Dupliquer cette logique ferait
// diverger les compteurs au premier correctif appliqué d'un seul côté.
//
// Cocher = insérer une validation, décocher = la supprimer. Il n'y a pas de
// booléen « fait » en base : c'est la présence de la ligne qui fait foi, ce
// qui rend la remise à zéro (minuit, lundi, 1er du mois) automatique.
export async function basculerCompletion({ objectif, userId, completions, setCompletions }) {
  const periode = periodeCourante(objectif.type);
  const periodes = completions
    .filter((c) => c.objectif_id === objectif.id)
    .map((c) => c.periode);

  if (estFaitMaintenant(objectif.type, periodes)) {
    await supabase
      .from("completions")
      .delete()
      .eq("objectif_id", objectif.id)
      .eq("periode", periode);
    setCompletions((c) =>
      c.filter((x) => !(x.objectif_id === objectif.id && x.periode === periode)),
    );
  } else {
    const { data } = await supabase
      .from("completions")
      .insert({ user_id: userId, objectif_id: objectif.id, periode })
      .select("objectif_id, periode, cree_le")
      .single();
    if (data) setCompletions((c) => [...c, data]);
  }
}
