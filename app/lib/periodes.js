// Périodes et séries du tracker d'habitudes. Tout est calculé en date locale.
// Clé de période : quotidien → le jour ; hebdomadaire → le lundi ouvrant la
// semaine ; mensuel → le 1er du mois ; unique/null → le jour (pas de série).

function versCle(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}

function depuisCle(cle) {
  const [a, m, j] = cle.split("-").map(Number);
  return new Date(a, m - 1, j);
}

// Lundi de la semaine contenant `d` (getDay : 0=dim … 6=sam).
function lundiDeLaSemaine(d) {
  const decalage = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - decalage);
}

// Un objectif « ponctuel » se coche une fois et reste coché : pas de série.
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

export function periodePrecedente(type, cle) {
  const d = depuisCle(cle);
  switch (type) {
    case "hebdomadaire":
      return versCle(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
    case "mensuel":
      return versCle(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    case "quotidien":
    default:
      return versCle(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  }
}

// Série : nombre de périodes consécutives validées se terminant à la période
// courante — ou à la précédente si la courante n'est pas encore faite (on ne
// casse pas la série tant que la période en cours n'est pas terminée).
export function calculerSerie(type, periodes, aujourdhui = new Date()) {
  if (estPonctuel(type)) return 0;

  const faites = new Set(periodes);
  const courante = periodeCourante(type, aujourdhui);
  const precedente = periodePrecedente(type, courante);

  let p;
  if (faites.has(courante)) p = courante;
  else if (faites.has(precedente)) p = precedente;
  else return 0;

  let serie = 0;
  while (faites.has(p)) {
    serie += 1;
    p = periodePrecedente(type, p);
  }
  return serie;
}

// Série de journées complètes : combien de jours d'affilée TOUS les objectifs
// quotidiens ont été validés (la flamme de la carte « objectif journalier »).
// Un objectif ne compte que pour les jours postérieurs à sa création. Même
// tolérance que `calculerSerie` pour la journée en cours.
export function serieJoursComplets(objectifs, completions, aujourdhui = new Date()) {
  if (objectifs.length === 0) return 0;

  // periode → les objectifs validés ce jour-là.
  const validesPar = new Map();
  for (const c of completions) {
    if (!validesPar.has(c.periode)) validesPar.set(c.periode, new Set());
    validesPar.get(c.periode).add(c.objectif_id);
  }

  function journeeComplete(cle) {
    const attendus = objectifs.filter((o) => !o.cree_le || versCle(new Date(o.cree_le)) <= cle);
    if (attendus.length === 0) return false;
    const valides = validesPar.get(cle);
    return valides ? attendus.every((o) => valides.has(o.id)) : false;
  }

  const courante = periodeCourante("quotidien", aujourdhui);
  let p = journeeComplete(courante) ? courante : periodePrecedente("quotidien", courante);

  let serie = 0;
  while (journeeComplete(p)) {
    serie += 1;
    p = periodePrecedente("quotidien", p);
  }
  return serie;
}

// L'objectif est-il validé pour la période courante ?
export function estFaitMaintenant(type, periodes, aujourdhui = new Date()) {
  if (estPonctuel(type)) return periodes.length > 0;
  return periodes.includes(periodeCourante(type, aujourdhui));
}
