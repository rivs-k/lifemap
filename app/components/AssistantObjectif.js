"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

const TYPES = ["quotidien", "hebdomadaire", "mensuel", "unique"];
const NOUVELLE_LISTE = "__nouvelle__";

export default function AssistantObjectif({ listes, onAjouterListe, onAjouterObjectifs, onFermer }) {
  const { t } = useLangue();
  const [texte, setTexte] = useState("");
  const [listeCibleId, setListeCibleId] = useState(listes[0]?.id || NOUVELLE_LISTE);
  const [nomNouvelleListe, setNomNouvelleListe] = useState("");
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  // null tant que rien n'a été généré : distingue « saisie » de « résultats ».
  const [suggestions, setSuggestions] = useState(null);

  async function generer(e) {
    e.preventDefault();
    const v = texte.trim();
    if (!v) return;
    setErreur(null);
    setChargement(true);

    const { data: { session } } = await supabase.auth.getSession();

    let reponse;
    try {
      reponse = await fetch("/api/decouper-objectif", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ objectif: v }),
      });
    } catch {
      setChargement(false);
      setErreur(t.assistantIa.erreur);
      return;
    }

    setChargement(false);
    if (!reponse.ok) {
      setErreur(t.assistantIa.erreur);
      return;
    }
    const donnees = await reponse.json();
    setSuggestions((donnees.objectifs || []).map((o) => ({ ...o, inclus: true })));
  }

  function basculerInclus(index) {
    setSuggestions((s) => s.map((o, i) => (i === index ? { ...o, inclus: !o.inclus } : o)));
  }

  function modifierChamp(index, champ, valeur) {
    setSuggestions((s) => s.map((o, i) => (i === index ? { ...o, [champ]: valeur } : o)));
  }

  async function ajouterALaLifeMap() {
    const retenus = suggestions
      .filter((o) => o.inclus && o.nom.trim())
      .map((o) => ({ nom: o.nom.trim(), type: o.type }));
    if (retenus.length === 0) return;
    setEnvoi(true);

    let listeId = listeCibleId;
    if (listeId === NOUVELLE_LISTE) {
      listeId = await onAjouterListe(nomNouvelleListe.trim() || texte.trim());
    }
    await onAjouterObjectifs(listeId, retenus);

    setEnvoi(false);
    onFermer();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <h3
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-xl font-bold text-teal-500 uppercase tracking-wide"
        >
          {t.assistantIa.titre}
        </h3>

        {!suggestions ? (
          <form onSubmit={generer} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-gray-300">{t.assistantIa.intro}</p>

            <textarea
              autoFocus
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder={t.assistantIa.placeholder}
              rows={3}
              className="w-full bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500 resize-none"
            />

            <div>
              <label className="block text-xs text-gray-400 mb-1">{t.assistantIa.listeCible}</label>
              <select
                value={listeCibleId}
                onChange={(e) => setListeCibleId(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                {listes.map((l) => (
                  <option key={l.id} value={l.id} className="bg-gray-900">
                    {l.titre}
                  </option>
                ))}
                <option value={NOUVELLE_LISTE} className="bg-gray-900">
                  {t.assistantIa.nouvelleListe}
                </option>
              </select>
            </div>

            {listeCibleId === NOUVELLE_LISTE && (
              <input
                value={nomNouvelleListe}
                onChange={(e) => setNomNouvelleListe(e.target.value)}
                placeholder={t.assistantIa.nomNouvelleListePlaceholder}
                className="w-full bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
              />
            )}

            {erreur && (
              <p role="alert" className="text-sm text-red-400">
                {erreur}
              </p>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={onFermer}
                className="text-sm text-gray-400 hover:text-white transition px-4 py-2"
              >
                {t.assistantIa.annuler}
              </button>
              <button
                type="submit"
                disabled={chargement || !texte.trim()}
                className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-5 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {chargement ? t.auth.chargement : t.assistantIa.generer}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-gray-300">{t.assistantIa.resultatsIntro}</p>

            <ul className="flex flex-col gap-2">
              {suggestions.map((o, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 bg-black/30 border border-gray-800 rounded-xl px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={o.inclus}
                    onChange={() => basculerInclus(i)}
                    className="shrink-0 accent-teal-600"
                  />
                  <span aria-hidden="true">{o.emoji}</span>
                  <input
                    value={o.nom}
                    onChange={(e) => modifierChamp(i, "nom", e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm text-white focus:outline-none"
                  />
                  <select
                    value={o.type}
                    onChange={(e) => modifierChamp(i, "type", e.target.value)}
                    className="bg-black/40 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {TYPES.map((ty) => (
                      <option key={ty} value={ty} className="bg-gray-900">
                        {t.dashboard.categories[ty]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={onFermer}
                className="text-sm text-gray-400 hover:text-white transition px-4 py-2"
              >
                {t.assistantIa.annuler}
              </button>
              <button
                type="button"
                onClick={ajouterALaLifeMap}
                disabled={envoi || !suggestions.some((o) => o.inclus)}
                className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-5 py-2 rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {envoi ? t.auth.chargement : t.assistantIa.ajouter}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
