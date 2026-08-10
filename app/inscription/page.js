"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChampTexte from "../components/ChampTexte";
import BoutonsFournisseurs from "../components/BoutonsFournisseurs";
import { useLangue } from "../components/LangueProvider";
import { supabase } from "../lib/supabase";
import { messageErreurAuth } from "../lib/erreursAuth";
import { TESTS_CRITERES } from "../lib/motDePasse";


export default function Inscription() {
  const { t } = useLangue();
  const router = useRouter();
  const [motdepasse, setMotdepasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);

    const donnees = new FormData(e.target);
    const { data, error } = await supabase.auth.signUp({
      email: donnees.get("email"),
      password: donnees.get("motdepasse"),
      options: { data: { pseudo: donnees.get("pseudo") } },
    });

    setChargement(false);
    if (error) {
      setErreur(messageErreurAuth(error, t));
      return;
    }
    // Session présente = confirmation email désactivée : l'utilisateur est déjà
    // connecté. Sinon, un email de confirmation a été envoyé.
    if (data.session) {
      router.push("/dashboard");
    } else {
      setSucces(true);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-24">
      <div className="w-full max-w-lg">
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-4xl md:text-5xl font-bold text-teal-500 uppercase tracking-wide drop-shadow-lg"
        >
          {t.inscription.titre}
        </h1>

        {succes ? (
          <p role="status" className="mt-10 text-lg text-teal-500">
            {t.inscription.succesConfirmation}
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5 text-left">
              <ChampTexte
                id="pseudo"
                label={t.inscription.pseudo}
                type="text"
                required
                placeholder={t.inscription.pseudoPlaceholder}
              />

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
                value={motdepasse}
                onChange={(e) => setMotdepasse(e.target.value)}
              >
                <ul className="mt-4 flex flex-col gap-2">
                  {t.inscription.criteres.map((label, i) => {
                    const valide = TESTS_CRITERES[i](motdepasse);
                    return (
                      <li
                        key={label}
                        className={`flex items-center gap-2 text-sm transition ${
                          valide ? "text-teal-500" : "text-gray-400"
                        }`}
                      >
                        <span aria-hidden="true">{valide ? "✓" : "○"}</span>
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </ChampTexte>

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
                {chargement ? t.auth.chargement : t.inscription.bouton}
              </button>
            </form>

            <BoutonsFournisseurs />

            <p className="mt-10 text-sm text-gray-200">
              {t.inscription.dejaCompte}{" "}
              <Link
                href="/connexion"
                className="text-teal-500 hover:text-teal-400 transition font-bold focus:outline-none focus-visible:underline"
              >
                {t.inscription.lienConnexion}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
