// Routes de l'application connectée (dashboard). Elles ont leur propre shell :
// pas de navbar marketing, pas de fond animé — un fond sombre uni à la place.
const PREFIXES_APP = ["/dashboard", "/profil", "/agenda", "/explorer"];

export function estRouteApp(pathname) {
  return PREFIXES_APP.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
