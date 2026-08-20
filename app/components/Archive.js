"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

function LigneArchive({ objectif, listes, t, onRestaurer, onSupprimer }) {
  // Liste d'origine si elle existe encore, sinon la première disponible.
  const [listeCible, setListeCible] = useState(
    listes.some((l) => l.id === objectif.liste_id) ? objectif.liste_id : listes[0]?.id || "",
  );
  const [confirme, setConfirme] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-xl p-3">
      {objectif.emoji && <span aria-hidden="true">{objectif.emoji}</span>}
      <span className="flex-1 min-w-0 truncate">{objectif.nom}</span>
      {objectif.type && (
        <span className="text-xs text-gray-400 shrink-0">
          {t.dashboard.categories[objectif.type]}
        </span>
      )}

      {listes.length > 0 && (
        <select
          value={listeCible}
          onChange={(e) => setListeCible(e.target.value)}
          aria-label={t.profil.archive.versListe}
          className="bg-black/40 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          {listes.map((l) => (
            <option key={l.id} value={l.id} className="bg-gray-900">
              {l.titre}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        disabled={!listeCible}
        onClick={() => onRestaurer(objectif, listeCible)}
        className="border border-gray-600 hover:border-teal-500 transition text-sm font-bold px-3 py-1.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:border-teal-500"
      >
        {t.profil.archive.restaurer}
      </button>

      <button
        type="button"
        onClick={() => (confirme ? onSupprimer(objectif) : setConfirme(true))}
        onBlur={() => setConfirme(false)}
        className={`text-sm font-bold px-3 py-1.5 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
          confirme
            ? "bg-red-900/60 text-red-300"
            : "border border-gray-600 text-gray-400 hover:text-white"
        }`}
      >
        {confirme ? t.profil.archive.confirmer : t.profil.archive.supprimer}
      </button>
    </li>
  );
}

export default function Archive() {
  const { t } = useLangue();
  const [objectifs, setObjectifs] = useState([]);
  const [listes, setListes] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      const [ro, rl] = await Promise.all([
        supabase
          .from("objectifs")
          .select("*")
          .eq("archive", true)
          .order("cree_le", { ascending: false }),
        supabase.from("listes").select("id, titre").order("position"),
      ]);
      setObjectifs(ro.data || []);
      setListes(rl.data || []);
      setChargement(false);
    }
    charger();
  }, []);

  async function restaurer(objectif, listeId) {
    // On place l'objectif restauré à la fin de la liste cible.
    const { count } = await supabase
      .from("objectifs")
      .select("id", { count: "exact", head: true })
      .eq("liste_id", listeId)
      .eq("archive", false);

    await supabase
      .from("objectifs")
      .update({ archive: false, liste_id: listeId, position: count ?? 0 })
      .eq("id", objectif.id);

    setObjectifs((o) => o.filter((x) => x.id !== objectif.id));
  }

  async function supprimer(objectif) {
    // Les completions liées partent en cascade (ON DELETE CASCADE).
    await supabase.from("objectifs").delete().eq("id", objectif.id);
    setObjectifs((o) => o.filter((x) => x.id !== objectif.id));
  }

  return (
    <section className="mt-12 text-left">
      <h2 className="font-bold text-lg">{t.profil.archive.titre}</h2>

      {chargement ? (
        <p className="mt-4 text-sm text-gray-400">{t.profil.chargement}</p>
      ) : objectifs.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">{t.profil.archive.vide}</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-gray-500">{t.profil.archive.avertissement}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {objectifs.map((o) => (
              <LigneArchive
                key={o.id}
                objectif={o}
                listes={listes}
                t={t}
                onRestaurer={restaurer}
                onSupprimer={supprimer}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
