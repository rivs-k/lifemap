"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { messageErreurAuth } from "../lib/erreursAuth";
import { useLangue } from "./LangueProvider";

// Nom affiché → identifiant de provider attendu par Supabase Auth.
const fournisseurs = [{ nom: "Google", provider: "google" }];

export default function BoutonsFournisseurs() {
  const { t } = useLangue();
  const [enCours, setEnCours] = useState(null);
  const [erreur, setErreur] = useState(null);

  async function connecter(provider) {
    setErreur(null);
    setEnCours(provider);

    // Redirige vers le fournisseur puis revient sur /dashboard avec la
    // session dans l'URL ; le client Supabase la détecte au chargement.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });

    // Pas de redirection en cas d'erreur (ex. provider non activé côté
    // Supabase) : on reste sur la page, il faut donc lever le chargement.
    if (error) {
      setErreur(messageErreurAuth(error, t));
      setEnCours(null);
    }
  }

  return (
    <>
      <div className="mt-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-600" />
        <span className="text-xs text-gray-300 uppercase tracking-wide">{t.auth.ou}</span>
        <div className="h-px flex-1 bg-gray-600" />
      </div>

      {erreur && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {erreur}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {fournisseurs.map(({ nom, provider }) => (
          <button
            key={nom}
            type="button"
            onClick={() => connecter(provider)}
            disabled={enCours !== null}
            className="bg-black/60 backdrop-blur-sm border border-gray-600 hover:border-teal-500 transition font-bold px-5 py-4 rounded-full focus:outline-none focus-visible:border-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {enCours === provider ? t.auth.chargement : `${t.auth.continuerAvec} ${nom}`}
          </button>
        ))}
      </div>
    </>
  );
}
