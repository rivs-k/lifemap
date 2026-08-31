// Périodes du tracker d'habitudes. Tout est calculé en date locale.
// Clé de période : quotidien → le jour ; hebdomadaire → le lundi ouvrant la
// semaine ; mensuel → le 1er du mois ; unique/null → le jour.

function versCle(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}

// Lundi de la semaine contenant `d` (getDay : 0=dim … 6=sam).
function lundiDeLaSemaine(d) {
  const decalage = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - decalage);
}

// Un objectif « ponctuel » se coche une fois et reste coché.
// C'est le cas d'`unique` et de l'absence de type.
export function estPonctuel(type) {
  return type === "unique" || !type;
}

export function periodeCourante(type, date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  switch (type) {
    case "hebdomadaire":
      return versCle(lundiDeLaSemaine(d));
    case "mensuel":
      return versCle(new Date(d.getFullYear(), d.getMonth(), 1));
    case "quotidien":
    case "unique":
    default:
      return versCle(d);
  }
}

// L'objectif est-il validé pour la période courante ?
export function estFaitMaintenant(type, periodes, aujourdhui = new Date()) {
  if (estPonctuel(type)) return periodes.length > 0;
  return periodes.includes(periodeCourante(type, aujourdhui));
}
