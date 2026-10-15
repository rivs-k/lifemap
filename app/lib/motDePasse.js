// Tests critères
export const TESTS_CRITERES = [
  (mdp) => mdp.length >= 8,
  (mdp) => /[A-Z]/.test(mdp),
  (mdp) => /[a-z]/.test(mdp),
  (mdp) => /[0-9]/.test(mdp),
  (mdp) => /[^A-Za-z0-9]/.test(mdp),
];

// Mot de passe valide
export function motDePasseValide(mdp) {
  return TESTS_CRITERES.every((test) => test(mdp));
}
