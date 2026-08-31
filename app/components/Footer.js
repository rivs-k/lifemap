"use client";

import Link from "next/link";
import { useLangue } from "./LangueProvider";

const LIENS = [
  { cle: "legal", href: "/mentions-legales" },
  { cle: "confidentialite", href: "/confidentialite" },
  { cle: "rgpd", href: "/rgpd" },
  { cle: "cgu", href: "/cgu" },
];

export default function Footer() {
  const { t } = useLangue();

  return (
    <footer className="relative z-10 border-t border-gray-800 bg-black/50 px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 text-sm text-gray-400 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LIENS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white transition">
              {t.footer[l.cle]}
            </Link>
          ))}
        </nav>
        <a href={`mailto:${t.footer.email}`} className="hover:text-white transition">
          {t.footer.contact}
        </a>
      </div>
      <p className="max-w-5xl mx-auto mt-6 text-xs text-gray-600">
        © {new Date().getFullYear()} LifeMap. {t.footer.droits}
      </p>
    </footer>
  );
}
