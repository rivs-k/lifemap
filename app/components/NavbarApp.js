"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLangue } from "./LangueProvider";
import SelecteurLangue from "./SelecteurLangue";
import PastilleNiveau from "./PastilleNiveau";

export default function NavbarApp({ pseudo, avatarUrl, niveau }) {
  const { t } = useLangue();
  const pathname = usePathname();
  const initiale = (pseudo || "?").charAt(0).toUpperCase();

  const onglets = [
    { href: "/dashboard", label: t.dashboard.lifeMapNav },
    { href: "/agenda", label: t.dashboard.agenda },
    { href: "/explorer", label: t.dashboard.explorer },
  ].map((o) => ({
    ...o,
    actif: pathname === o.href || pathname.startsWith(`${o.href}/`),
  }));

  return (
    <header className="sticky top-0 z-20 bg-black/50 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[120rem] mx-auto flex items-center justify-between gap-2 px-[19px] sm:px-6 md:px-[88px] py-4">
        {/* Bascule FR/ENG + logo. Sans elle, on ne pouvait plus changer de
            langue une fois connecté : la navbar publique est masquée ici. */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <SelecteurLangue />

          {/* Le mot « LIFEMAP » est masqué sur petit écran, l'icône suffit */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span aria-hidden="true" className="text-lg sm:text-2xl">🧭</span>
            <span
              style={{ fontFamily: "var(--font-oswald)" }}
              className="hidden lg:inline text-xl font-bold tracking-wide"
            >
              LIFEMAP
            </span>
          </Link>
        </div>

        {/* Onglets */}
        <nav className="flex gap-1 sm:gap-2">
          {onglets.map(({ href, label, actif }) => (
            <Link
              key={href}
              href={href}
              aria-current={actif ? "page" : undefined}
              className={`text-[11px] sm:text-sm font-bold px-2 sm:px-5 py-1.5 sm:py-2 rounded-full border whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                actif
                  ? "border-teal-500 text-teal-500"
                  : "border-transparent text-gray-300 hover:border-gray-700 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Notifications + menu utilisateur */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/profil"
            className="flex items-center gap-2 rounded-full transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {/* `relative` : sert de repère à la pastille de niveau */}
            <span className="relative shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- image distante (Supabase Storage) : next/image imposerait de déclarer le domaine
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-gray-700"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-sm font-bold"
                >
                  {initiale}
                </span>
              )}

              {niveau != null && <PastilleNiveau niveau={niveau} libelle={t.profil.niveau} />}
            </span>
            <span className="text-sm font-bold hidden sm:inline">{pseudo}</span>
            <span aria-hidden="true" className="hidden sm:inline text-gray-400 text-xs">
              ▾
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
