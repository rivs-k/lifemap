"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SelecteurLangue from "./SelecteurLangue";
import { useLangue } from "./LangueProvider";
import { estRouteApp } from "../lib/routesApp";

export default function Navbar() {
  const { t } = useLangue();
  const pathname = usePathname();

  // Les pages de l'app connectée ont leur propre barre de nav (NavbarApp).
  if (estRouteApp(pathname)) return null;

  return (
    <header className="fixed top-0 w-full flex justify-between items-center px-8 py-6 z-20">
      <SelecteurLangue />
      <div className="flex gap-3">
        <Link
          href="/connexion"
          className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-5 py-2 rounded-full"
        >
          {t.navigation.seConnecter}
        </Link>
        <Link
          href="/inscription"
          className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-5 py-2 rounded-full"
        >
          {t.navigation.sEnregistrer}
        </Link>
      </div>
    </header>
  );
}
