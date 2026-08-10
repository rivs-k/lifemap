// Système de points et de niveaux.
//
// L'XP n'est PAS stocké : il est recalculé depuis l'historique des validations.
// C'est volontaire — on peut décocher un objectif, et un compteur stocké
// dériverait au moindre oubli de décrémenter. Ici, décocher supprime la
// validation, donc les points disparaissent mécaniquement.

// Extension explicite : permet de lancer les tests directement avec Node.
import { periodePrecedente, estPonctuel } from "./periodes.js";

// Échelle sous-proportionnelle : une semaine vaut 5 jours (pas 7), un mois
// 15 jours (pas 30). Tenir une habitude *chaque jour* est le plus exigeant,
// c'est donc la régularité quotidienne qui est le mieux récompensée.
// `sansType` vaut autant qu'`unique` : dans les deux cas c'est une tâche cochée
// une fois, l'absence d'étiquette ne change rien à l'effort fourni.
export const XP_BASE = {
  quotidien: 10,
  hebdomadaire: 50,
  mensuel: 150,
  unique: 10,
  sansType: 10,
};

// Bonus de régularité, plafonné : sans plafond, une longue série produirait
// des gains absurdes.
export function multiplicateurSerie(serie) {
  if (serie >= 30) return 2;
  if (serie >= 7) return 1.5;
  if (serie >= 2) return 1.2;
  return 1;
}

// Seuil d'XP cumulé pour atteindre un niveau : 25 × N × (N−1).
// L'écart entre paliers grandit de 50 à chaque niveau.
export function seuilNiveau(n) {
  return 25 * n * (n - 1);
}

export function niveauDepuisXp(xp) {
  if (xp <= 0) return 1;
  return Math.floor((25 + Math.sqrt(625 + 100 * xp)) / 50);
}

// XP total, en repassant sur chaque validation pour retrouver la série
// qu'elle avait AU MOMENT où elle a été faite.
export function calculerXp(objectifs, completions) {
  const typeParId = new Map(objectifs.map((o) => [o.id, o.type]));

  const parObjectif = new Map();
  for (const c of completions) {
    if (!parObjectif.has(c.objectif_id)) parObjectif.set(c.objectif_id, []);
    parObjectif.get(c.objectif_id).push(c.periode);
  }

  let total = 0;
  for (const [id, periodes] of parObjectif) {
    // `has` et non `get` : un type NULL est un objectif sans étiquette, à
    // compter normalement, alors qu'un id absent est un objectif supprimé.
    if (!typeParId.has(id)) continue;
    const type = typeParId.get(id);
    const base = XP_BASE[type ?? "sansType"] ?? 0;

    periodes.sort();
    let serie = 0;
    let precedente = null;

    for (const p of periodes) {
      // Une série n'a de sens que pour les objectifs récurrents.
      if (estPonctuel(type)) {
        serie = 1;
      } else {
        const suitLaPrecedente = precedente !== null && periodePrecedente(type, p) === precedente;
        serie = suitLaPrecedente ? serie + 1 : 1;
      }
      total += Math.round(base * multiplicateurSerie(serie));
      precedente = p;
    }
  }

  return total;
}

// Progression vers le niveau suivant, pour la barre du profil.
export function progressionNiveau(xp) {
  const niveau = niveauDepuisXp(xp);
  const debut = seuilNiveau(niveau);
  const fin = seuilNiveau(niveau + 1);
  return {
    niveau,
    xpDansNiveau: xp - debut,
    xpRequis: fin - debut,
    prochainSeuil: fin,
    pourcentage: Math.round(((xp - debut) / (fin - debut)) * 100),
  };
}
