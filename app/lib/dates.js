// « il y a 3 h », « il y a 2 j »… à partir d’une date ISO. Localisé.
export function tempsRelatif(iso, langue) {
  const s = Math.round((Date.now() - new Date(iso)) / 1000);
  const paliers = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const rtf = new Intl.RelativeTimeFormat(langue, { numeric: "auto" });
  for (const [unite, taille] of paliers) {
    if (s >= taille) return rtf.format(-Math.floor(s / taille), unite);
  }
  return rtf.format(0, "second");
}
