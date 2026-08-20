"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageApp from "../components/PageApp";
import ChampTexte from "../components/ChampTexte";
import SelecteurLangue from "../components/SelecteurLangue";
import { useLangue } from "../components/LangueProvider";
import { supabase } from "../lib/supabase";
import { TESTS_CRITERES, motDePasseValide } from "../lib/motDePasse";

export default function Parametres() {
  const { t } = useLangue();
  return <PageApp titre={t.parametres.titre}>{() => <Contenu />}</PageApp>;
}

function Contenu() {
  const { t } = useLangue();
  const router = useRouter();
  const [mdp, setMdp] = useState("");
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [confirmeSuppr, setConfirmeSuppr] = useState(false);

  async function changerMotDePasse(e) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);
    if (!motDePasseValide(mdp)) return;

    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnCours(false);
    if (error) return setErreur(error.message);

    setMdp("");
    setSucces(true);
  }

  // La fonction SQL supprime le compte auth ; les cascades effacent le reste.
  async function supprimerCompte() {
    await supabase.rpc("supprimer_mon_compte");
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="max-w-lg flex flex-col gap-12">
      <section>
        <h2 className="font-bold text-lg mb-3">{t.parametres.langue}</h2>
        <SelecteurLangue />
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">{t.parametres.motDePasse}</h2>
        <form onSubmit={changerMotDePasse} className="flex flex-col gap-4">
          <ChampTexte
            id="nouveau-mdp"
            label={t.nouveauMotDePasse.champ}
            type="password"
            placeholder={t.auth.motDePassePlaceholder}
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
          >
            <ul className="mt-3 flex flex-col gap-1.5">
              {t.inscription.criteres.map((label, i) => {
                const ok = TESTS_CRITERES[i](mdp);
                return (
                  <li key={label} className={`flex items-center gap-2 text-sm ${ok ? "text-teal-500" : "text-gray-400"}`}>
                    <span aria-hidden="true">{ok ? "✓" : "○"}</span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </ChampTexte>

          {erreur && <p role="alert" className="text-sm text-red-400">{erreur}</p>}
          {succes && <p className="text-sm text-teal-500">{t.parametres.motDePasseSucces}</p>}

          <button
            type="submit"
            disabled={enCours || !motDePasseValide(mdp)}
            className="self-start bg-teal-700 hover:bg-teal-600 transition text-white font-bold px-6 py-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {enCours ? t.auth.chargement : t.parametres.motDePasseBouton}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">{t.parametres.compte}</h2>
        <p className="text-sm text-gray-400 mb-4">{t.parametres.supprimerAvertissement}</p>
        <button
          type="button"
          onClick={() => (confirmeSuppr ? supprimerCompte() : setConfirmeSuppr(true))}
          onBlur={() => setConfirmeSuppr(false)}
          className={`text-sm font-bold px-6 py-3 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
            confirmeSuppr
              ? "bg-red-900/60 text-red-300"
              : "border border-red-800 text-red-400 hover:text-red-300"
          }`}
        >
          {confirmeSuppr ? t.parametres.supprimerConfirmer : t.parametres.supprimerCompte}
        </button>
      </section>
    </div>
  );
}
