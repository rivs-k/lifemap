"use client";

import Link from "next/link";
import Image from "next/image";
import { useLangue } from "./components/LangueProvider";
import Footer from "./components/Footer";

const APERCUS = [
  { src: "/capture-explorer.jpg", alt: "captureExplorer", w: 2428, h: 985 },
  { src: "/capture-agenda.jpg", alt: "captureAgenda", w: 2413, h: 1180 },
  { src: "/capture-dashboard.jpg", alt: "captureDashboard", w: 2382, h: 1273 },
];

export default function Home() {
  const { t } = useLangue();

  return (
    <>
      <main className="text-white">
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <Image
          src="/logo-icon.png"
          alt=""
          width={160}
          height={160}
          className="h-24 w-24 md:h-40 md:w-40"
          priority
        />
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="mt-4 text-7xl md:text-9xl font-bold text-teal-500 tracking-wide"
        >
          LIFEMAP
        </h1>
        <p className="mt-4 text-lg text-gray-300">{t.slogan}</p>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
        <h2
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-3xl md:text-5xl font-bold text-teal-500 uppercase tracking-wide text-center max-w-3xl"
        >
          {t.presentation.titre}
        </h2>
        <p className="mt-6 text-lg text-gray-300 text-center max-w-2xl">{t.presentation.texte}</p>

        <div className="mt-14 w-full max-w-[1600px] grid gap-5 items-start md:grid-cols-3">
          {APERCUS.map((a) => (
            <div
              key={a.src}
              className="rounded-2xl border border-gray-800 overflow-hidden shadow-2xl shadow-black/50"
            >
              <Image
                src={a.src}
                alt={t.presentation[a.alt]}
                width={a.w}
                height={a.h}
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="py-48 px-8 md:px-20 grid md:grid-cols-2 gap-24 items-center">
        <ul
          style={{ fontFamily: "var(--font-oswald)" }}
          className="space-y-10 text-2xl md:text-3xl font-medium text-teal-500 uppercase tracking-wide"
        >
          {t.objectifs.map((objectif) => (
            <li key={objectif}>{objectif}</li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-6">
          {t.stats.map(({ valeur, libelle }) => (
            <div key={libelle} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
              <div className="text-teal-500 text-3xl font-bold">{valeur}</div>
              <div className="text-gray-400 text-sm mt-1">{libelle}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h2
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-2xl md:text-3xl text-teal-500 uppercase font-medium tracking-wide max-w-3xl mb-14"
        >
          {t.cta.titre}
        </h2>
        <Link
          href="/inscription"
          className="bg-teal-700 hover:bg-teal-600 transition text-white font-bold text-lg px-10 py-4 rounded-full"
        >
          {t.cta.bouton}
        </Link>
      </section>
      </main>
      <Footer />
    </>
  );
}
