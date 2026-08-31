"use client";

import Link from "next/link";
import { useLangue } from "./LangueProvider";

export default function PageLegale({ cle }) {
  const { t } = useLangue();

  return (
    <main className="relative z-10 max-w-3xl mx-auto px-6 pt-32 pb-20 min-h-screen">
      <h1
        style={{ fontFamily: "var(--font-oswald)" }}
        className="text-4xl font-bold uppercase tracking-wide text-teal-500"
      >
        {t.footer[cle]}
      </h1>
      <p className="mt-6 text-gray-300">{t.footer.contenuAVenir}</p>
      <Link href="/" className="mt-10 inline-block text-teal-500 hover:text-teal-400 transition">
        ← {t.footer.retour}
      </Link>
    </main>
  );
}
