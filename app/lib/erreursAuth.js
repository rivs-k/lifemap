// Traduit les messages d'erreur Supabase (toujours en anglais) vers un texte
// localisé. Les cas non reconnus retombent sur un message générique plutôt que
// d'exposer le message brut du serveur.
export function messageErreurAuth(error, t) {
  const m = (error?.message || "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return t.auth.erreurIdentifiants;
  }
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return t.auth.erreurDejaInscrit;
  }
  return t.auth.erreurGenerique;
}
