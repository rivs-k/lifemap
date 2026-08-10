"use client";

import { useState } from "react";
import Link from "next/link";
import ChampTexte from "../components/ChampTexte";
import { useLangue } from "../components/LangueProvider";
import { supabase } from "../lib/supabase";

export default function MotDePasseOublie() {
  const { t } = useLangue();
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);

    const email = new FormData(e.target).get("email");
    await supabase.auth.resetPasswordForEmail(email, {
      // Où Supabase renvoie l'utilisateur après le clic sur le lien du mail.
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });

    // On affiche le même message quoi qu'il arrive, y compris en cas d'erreur :
    // dire « cet email est inconnu » permettrait de deviner qui a un compte.
    setChargement(false);
    setEnvoye(true);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-full max-w-lg">
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-4xl md:text-5xl font-bold text-teal-500 uppercase tracking-wide drop-shadow-lg"
        >
          {t.oubli.titre}
        </h1>

        {envoye ? (
          <p role="status" className="mt-10 text-lg text-teal-500">
            {t.oubli.envoye}
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-gray-300">{t.oubli.intro}</p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 text-left">
              <ChampTexte
                id="email"
                label={t.auth.email}
                type="email"
                required
                placeholder={t.auth.emailPlaceholder}
              />

              <button
                type="submit"
                disabled={chargement}
                className="mt-2 bg-teal-700 hover:bg-teal-600 transition text-white font-bold text-lg px-10 py-4 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {chargement ? t.auth.chargement : t.oubli.bouton}
              </button>
            </form>
          </>
        )}

        <p className="mt-10 text-sm text-gray-200">
          <Link
            href="/connexion"
            className="text-teal-500 hover:text-teal-400 transition font-bold focus:outline-none focus-visible:underline"
          >
            {t.oubli.retour}
          </Link>
        </p>
      </div>
    </main>
  );
}
