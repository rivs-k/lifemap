"use client";

import { useLangue } from "./LangueProvider";

// Bascule FR/ENG. Les deux langues restent affichées, l'active en turquoise.
export default function SelecteurLangue() {
  const { langue, basculer, t } = useLangue();

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={t.changerLangue}
      className="border border-teal-700 rounded-full text-[11px] sm:text-sm font-bold px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 shrink-0 transition hover:border-teal-600 focus:outline-none focus-visible:border-teal-500"
    >
      <span className={langue === "fr" ? "text-teal-500" : "text-gray-500"}>FR</span>
      <span aria-hidden="true" className="text-gray-700">
        |
      </span>
      <span className={langue === "en" ? "text-teal-500" : "text-gray-500"}>ENG</span>
    </button>
  );
}
