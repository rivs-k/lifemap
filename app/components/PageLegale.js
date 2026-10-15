"use client";

import Link from "next/link";
import { useLangue } from "./LangueProvider";

// Composant PageLegale
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
      {t.pagesLegales[cle] ? (
        <div className="mt-8 flex flex-col gap-8">
          {t.pagesLegales[cle].map(({ titre, texte }) => (
            <section key={titre}>
              <h2 className="text-xl font-bold text-white">{titre}</h2>
              <p className="mt-2 text-gray-300 leading-relaxed">{texte}</p>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-gray-300">{t.footer.contenuAVenir}</p>
      )}
      <Link href="/" className="mt-10 inline-block text-teal-500 hover:text-teal-400 transition">
        ← {t.footer.retour}
      </Link>
    </main>
  );
}
