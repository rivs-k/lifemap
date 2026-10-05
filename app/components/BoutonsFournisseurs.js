"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

export default function BoutonsFournisseurs() {
  const { t } = useLangue();
  const [erreur, setErreur] = useState(null);

  async function connecterGoogle() {
    setErreur(null);

    // Redirige vers Google puis revient sur /dashboard, session en URL.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });

    // Pas de redirection en cas d'erreur : on reste sur la page et on l'affiche.
    if (error) setErreur(error.message);
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

      <button
        type="button"
        onClick={connecterGoogle}
        className="mt-8 w-full bg-black/60 backdrop-blur-sm border border-gray-600 hover:border-teal-500 transition font-bold px-5 py-4 rounded-full focus:outline-none focus-visible:border-teal-500"
      >
        {t.auth.continuerAvec} Google
      </button>
    </>
  );
}
