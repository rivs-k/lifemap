"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChampTexte from "../components/ChampTexte";
import { useLangue } from "../components/LangueProvider";
import { supabase } from "../lib/supabase";
import { TESTS_CRITERES, motDePasseValide } from "../lib/motDePasse";

export default function NouveauMotDePasse() {
  const { t } = useLangue();
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [verification, setVerification] = useState(true);
  const [motdepasse, setMotdepasse] = useState("");
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    // Le lien du mail contient un jeton de récupération : supabase-js le
    // détecte dans l'URL et ouvre une session temporaire. Elle seule autorise
    // à changer le mot de passe sans connaître l'ancien.
    const { data } = supabase.auth.onAuthStateChange((evenement, session) => {
      if (evenement === "PASSWORD_RECOVERY" || session) setPret(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPret(true);
      setVerification(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);

    if (!motDePasseValide(motdepasse)) return;

    setChargement(true);
    const { error } = await supabase.auth.updateUser({ password: motdepasse });
    setChargement(false);

    if (error) {
      setErreur(error.message);
      return;
    }
    // La session de récupération devient une session normale : on peut
    // envoyer l'utilisateur directement dans l'app.
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-full max-w-lg">
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-4xl md:text-5xl font-bold text-teal-500 uppercase tracking-wide drop-shadow-lg"
        >
          {t.nouveauMotDePasse.titre}
        </h1>

        {verification ? (
          <p className="mt-10 text-gray-300">{t.profil.chargement}</p>
        ) : !pret ? (
          <>
            <p role="alert" className="mt-10 text-sm text-red-400">
              {t.nouveauMotDePasse.lienInvalide}
            </p>
            <p className="mt-6 text-sm text-gray-200">
              <Link
                href="/mot-de-passe-oublie"
                className="text-teal-500 hover:text-teal-400 transition font-bold focus:outline-none focus-visible:underline"
              >
                {t.nouveauMotDePasse.demanderLien}
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5 text-left">
            <ChampTexte
              id="motdepasse"
              label={t.nouveauMotDePasse.champ}
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
              disabled={chargement || !motDePasseValide(motdepasse)}
              className="mt-2 bg-teal-700 hover:bg-teal-600 transition text-white font-bold text-lg px-10 py-4 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {chargement ? t.auth.chargement : t.nouveauMotDePasse.bouton}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
