// Critères de sécurité du mot de passe, partagés par l'inscription et la
// réinitialisation. Les tests sont couplés PAR POSITION aux libellés
// `inscription.criteres` du dictionnaire : garder les deux listes dans le
// même ordre.
export const TESTS_CRITERES = [
  (mdp) => mdp.length >= 8,
  (mdp) => /[A-Z]/.test(mdp),
  (mdp) => /[a-z]/.test(mdp),
  (mdp) => /[0-9]/.test(mdp),
  (mdp) => /[^A-Za-z0-9]/.test(mdp),
];

export function motDePasseValide(mdp) {
  return TESTS_CRITERES.every((test) => test(mdp));
}
