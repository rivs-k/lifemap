const PREFIXES_APP = ["/dashboard", "/profil", "/agenda", "/explorer", "/parametres"];

// Est route app
export function estRouteApp(pathname) {
  return PREFIXES_APP.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
