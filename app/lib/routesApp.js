// Routes de l'app connectée : leur propre shell (pas de navbar marketing ni de
// fond animé, un fond sombre uni à la place).
const PREFIXES_APP = ["/dashboard", "/profil", "/agenda", "/explorer", "/parametres"];

export function estRouteApp(pathname) {
  return PREFIXES_APP.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
