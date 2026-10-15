import { supabase } from "./supabase";
import { periodeCourante, estFaitMaintenant, estPonctuel } from "./periodes";

// Basculer completion
export async function basculerCompletion({ objectif, userId, completions, setCompletions }) {
  const periode = periodeCourante(objectif.type);
  const periodes = completions
    .filter((c) => c.objectif_id === objectif.id)
    .map((c) => c.periode);

  if (estFaitMaintenant(objectif.type, periodes)) {
    // Ponctuel : toutes ses validations / récurrent : celle de la période en cours
    const aSupprimer = estPonctuel(objectif.type) ? periodes : [periode];
    await supabase
      .from("completions")
      .delete()
      .eq("objectif_id", objectif.id)
      .in("periode", aSupprimer);
    setCompletions((c) =>
      c.filter((x) => !(x.objectif_id === objectif.id && aSupprimer.includes(x.periode))),
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
