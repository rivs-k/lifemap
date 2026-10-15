// Vers clé
const versCle = (d) => d.toLocaleDateString("sv-SE");

// Lundi de la semaine
function lundiDeLaSemaine(d) {
  const decalage = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - decalage);
}

// Est ponctuel
export function estPonctuel(type) {
  return type === "unique" || !type;
}

// Période courante
export function periodeCourante(type) {
  const date = new Date();
  switch (type) {
    case "hebdomadaire":
      return versCle(lundiDeLaSemaine(date));
    case "mensuel":
      return versCle(new Date(date.getFullYear(), date.getMonth(), 1));
    default:
      return versCle(date);
  }
}

// Est fait maintenant
export function estFaitMaintenant(type, periodes) {
  if (estPonctuel(type)) return periodes.length > 0;
  return periodes.includes(periodeCourante(type));
}
