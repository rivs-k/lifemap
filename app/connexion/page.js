"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChampTexte from "../components/ChampTexte";
import BoutonsFournisseurs from "../components/BoutonsFournisseurs";
import { useLangue } from "../components/LangueProvider";
import { supabase } from "../lib/supabase";
import { messageErreurAuth } from "../lib/erreursAuth";

export default function Connexion() {
  const { t } = useLangue();
  const router = useRouter();
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const donnees = new FormData(e.target);
    const { error } = await supabase.auth.signInWithPassword({
      email: donnees.get("email"),
      password: donnees.get("motdepasse"),
    });

    setChargement(false);
    if (error) return setErreur(messageErreurAuth(error, t));
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-full max-w-lg">
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-4xl md:text-5xl font-bold text-teal-500 uppercase tracking-wide drop-shadow-lg"
        >
          {t.connexion.titre}
        </h1>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5 text-left">
          <ChampTexte
            id="email"
            label={t.auth.email}
            type="email"
            required
            placeholder={t.auth.emailPlaceholder}
          />

          <ChampTexte
            id="motdepasse"
            label={t.auth.motDePasse}
            type="password"
            required
            placeholder={t.auth.motDePassePlaceholder}
          />

          <Link
            href="/mot-de-passe-oublie"
            className="-mt-2 self-end text-xs text-gray-400 hover:text-teal-400 transition focus:outline-none focus-visible:underline"
          >
            {t.connexion.motDePasseOublie}
          </Link>

          {erreur && (
            <p role="alert" className="text-sm text-red-400">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="mt-2 bg-teal-700 hover:bg-teal-600 transition text-white font-bold text-lg px-10 py-4 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {chargement ? t.auth.chargement : t.connexion.bouton}
          </button>
        </form>

        <BoutonsFournisseurs />

        <p className="mt-10 text-sm text-gray-200">
          {t.connexion.pasDeCompte}{" "}
          <Link
            href="/inscription"
            className="text-teal-500 hover:text-teal-400 transition font-bold focus:outline-none focus-visible:underline"
          >
            {t.connexion.lienInscription}
          </Link>
        </p>
      </div>
    </main>
  );
}
