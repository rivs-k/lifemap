"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

// Composant BoutonsFournisseurs
export default function BoutonsFournisseurs() {
  const { t } = useLangue();
  // États
  const [erreur, setErreur] = useState(null);

  // Connecter google
  async function connecterGoogle() {
    setErreur(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });

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

      <p className="mt-3 text-xs text-gray-400 text-center">
        {t.inscription.cgu.google}{" "}
        <Link href="/cgu" target="_blank" className="text-teal-500 hover:text-teal-400 underline">
          {t.inscription.cgu.lienCgu}
        </Link>{" "}
        {t.inscription.cgu.et}{" "}
        <Link href="/confidentialite" target="_blank" className="text-teal-500 hover:text-teal-400 underline">
          {t.inscription.cgu.lienConfidentialite}
        </Link>
        .
      </p>
    </>
  );
}
