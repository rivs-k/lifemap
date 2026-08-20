"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

// Mêmes couleurs de type que la Life Map et la carte de statistiques.
const COULEUR_TYPE = {
  quotidien: "#0d9488",
  hebdomadaire: "#9085e9",
  mensuel: "#d55181",
  unique: "#c98500",
};
const TYPES = ["quotidien", "hebdomadaire", "mensuel", "unique"];

// En-tête de colonne cliquable. « ▾ » signale une colonne triable.
function EnteteTriable({ libelle, colonne, tri, onTrier, aligne = "left" }) {
  const actif = tri.colonne === colonne;
  return (
    <th className={`px-3 py-2 font-bold text-xs uppercase tracking-wide text-${aligne}`}>
      <button
        type="button"
        onClick={() => onTrier(colonne)}
        className={`inline-flex items-center gap-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded ${
          actif ? "text-teal-500" : "text-gray-400 hover:text-white"
        }`}
      >
        {libelle}
        <span aria-hidden="true" className="text-[10px]">
          {actif ? (tri.sens === "asc" ? "▲" : "▼") : "▾"}
        </span>
      </button>
    </th>
  );
}

// Page des objectifs communautaires : seule partie de l'app où l'on voit les
// données des autres (lecture publique, écriture limitée à ses propres lignes).
// Les chiffres collectifs viennent de la fonction SQL `stats_communautaires`,
// car la sécurité de la base masque les lignes des autres.
export default function Explorer({ userId }) {
  const { t } = useLangue();
  const [objectifs, setObjectifs] = useState([]);
  const [stats, setStats] = useState({});
  const [votes, setVotes] = useState([]);
  const [mesParticipations, setMesParticipations] = useState(new Set());
  const [listes, setListes] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState({ colonne: "votes", sens: "desc" });
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [chargement, setChargement] = useState(true);

  const indexerStats = (data) =>
    setStats(Object.fromEntries((data || []).map((s) => [s.objectif_id, s])));

  useEffect(() => {
    async function charger() {
      const [ro, rv, rp, rl, rs] = await Promise.all([
        supabase
          .from("objectifs_communautaires")
          .select("*")
          .order("cree_le", { ascending: false }),
        supabase.from("votes_communautaires").select("objectif_communautaire_id, user_id"),
        supabase
          .from("participations")
          .select("objectif_communautaire_id")
          .eq("user_id", userId),
        supabase.from("listes").select("id, titre, position").order("position"),
        supabase.rpc("stats_communautaires"),
      ]);

      setObjectifs(ro.data || []);
      setVotes(rv.data || []);
      setMesParticipations(new Set((rp.data || []).map((p) => p.objectif_communautaire_id)));
      setListes(rl.data || []);
      indexerStats(rs.data);
      setChargement(false);
    }
    charger();
  }, [userId]);

  // Les agrégats dépendent de TOUS les participants : on les redemande à la base
  // dès qu'on rejoint ou quitte un objectif.
  async function rafraichirStats() {
    const { data } = await supabase.rpc("stats_communautaires");
    indexerStats(data);
  }

  // Total de votes par objectif, et ceux que j'ai votés (pour colorer la flèche).
  const votesParObjectif = votes.reduce((acc, v) => {
    acc[v.objectif_communautaire_id] = (acc[v.objectif_communautaire_id] || 0) + 1;
    return acc;
  }, {});
  const mesVotes = new Set(
    votes.filter((v) => v.user_id === userId).map((v) => v.objectif_communautaire_id),
  );

  // Le vote est une bascule : revoter retire son vote.
  async function basculerVote(oc) {
    if (mesVotes.has(oc.id)) {
      await supabase
        .from("votes_communautaires")
        .delete()
        .eq("objectif_communautaire_id", oc.id)
        .eq("user_id", userId);
      setVotes((v) =>
        v.filter((x) => !(x.objectif_communautaire_id === oc.id && x.user_id === userId)),
      );
    } else {
      await supabase
        .from("votes_communautaires")
        .insert({ objectif_communautaire_id: oc.id, user_id: userId });
      setVotes((v) => [...v, { objectif_communautaire_id: oc.id, user_id: userId }]);
    }
  }

  // Rejoindre = copier l'objectif dans SA Life Map, relié au communautaire. Ce
  // lien permet de compter les validations collectives : on coche dans son
  // tableau habituel et la progression du groupe monte.
  async function rejoindre(oc) {
    // L'objectif atterrit dans une liste dédiée, créée au besoin.
    let liste = listes.find((l) => l.titre === t.explorer.listeRejoints);
    if (!liste) {
      const { data } = await supabase
        .from("listes")
        .insert({
          user_id: userId,
          titre: t.explorer.listeRejoints,
          couleur: COULEUR_TYPE.quotidien,
          position: listes.length,
        })
        .select()
        .single();
      if (!data) return;
      liste = data;
      setListes((l) => [...l, data]);
    }

    await supabase.from("objectifs").insert({
      user_id: userId,
      liste_id: liste.id,
      nom: oc.titre,
      emoji: oc.emoji,
      type: oc.type,
      objectif_communautaire_id: oc.id,
      position: 0,
    });
    await supabase
      .from("participations")
      .insert({ objectif_communautaire_id: oc.id, user_id: userId });

    setMesParticipations((p) => new Set([...p, oc.id]));
    rafraichirStats();
  }

  async function quitter(oc) {
    await supabase
      .from("participations")
      .delete()
      .eq("objectif_communautaire_id", oc.id)
      .eq("user_id", userId);
    // On archive l'objectif personnel au lieu de le détruire : l'historique de
    // validations est conservé, comme partout ailleurs.
    await supabase
      .from("objectifs")
      .update({ archive: true })
      .eq("objectif_communautaire_id", oc.id)
      .eq("user_id", userId);

    setMesParticipations((p) => {
      const n = new Set(p);
      n.delete(oc.id);
      return n;
    });
    rafraichirStats();
  }

  // `cree_par` retient l'auteur : lui seul pourra modifier ou supprimer.
  async function proposer(e) {
    e.preventDefault();
    const form = e.target;
    const d = new FormData(form);
    const titre = (d.get("titre") || "").trim();
    if (!titre) return;

    const { data } = await supabase
      .from("objectifs_communautaires")
      .insert({
        cree_par: userId,
        titre,
        description: (d.get("description") || "").trim() || null,
        emoji: (d.get("emoji") || "").trim() || null,
        type: d.get("type"),
      })
      .select()
      .single();

    if (data) setObjectifs((o) => [data, ...o]);
    form.reset();
    setFormulaireOuvert(false);
    rafraichirStats();
  }

  // Recliquer la colonne triée inverse le sens ; sinon on change de colonne. Le
  // sens par défaut : A→Z pour un nom, décroissant pour un chiffre.
  function trierPar(colonne) {
    setTri((t0) =>
      t0.colonne === colonne
        ? { colonne, sens: t0.sens === "asc" ? "desc" : "asc" }
        : { colonne, sens: colonne === "nom" ? "asc" : "desc" },
    );
  }

  // La valeur sur laquelle comparer deux lignes, selon la colonne triée.
  function valeurTri(o) {
    const s = stats[o.id] || {};
    switch (tri.colonne) {
      case "nom":
        return o.titre.toLowerCase();
      case "termine":
        return Number(s.termine_total || 0);
      case "type":
        return o.type;
      case "progression":
        return s.participants ? Number(s.termine_periode) / Number(s.participants) : 0;
      case "participants":
        return Number(s.participants || 0);
      default:
        return votesParObjectif[o.id] || 0;
    }
  }

  // Lignes affichées : filtrées par la recherche (titre + description), puis triées.
  const terme = recherche.trim().toLowerCase();
  const lignes = objectifs
    .filter((o) =>
      terme ? `${o.titre} ${o.description || ""}`.toLowerCase().includes(terme) : true,
    )
    .sort((a, b) => {
      const va = valeurTri(a);
      const vb = valeurTri(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return tri.sens === "asc" ? cmp : -cmp;
    });

  // Valeurs dérivées d'une ligne, partagées par le tableau (desktop) et les cartes (mobile).
  function calculs(oc) {
    const s = stats[oc.id] || {};
    const participants = Number(s.participants || 0);
    const faits = Number(s.termine_periode || 0);
    return {
      participants,
      faits,
      total: Number(s.termine_total || 0),
      serie: Number(s.meilleure_serie || 0),
      pourcent: participants ? Math.round((faits / participants) * 100) : 0,
      tousFaits: participants > 0 && faits === participants,
      couleur: COULEUR_TYPE[oc.type],
      participe: mesParticipations.has(oc.id),
      aVote: mesVotes.has(oc.id),
      nbVotes: votesParObjectif[oc.id] || 0,
    };
  }

  if (chargement) {
    return <p className="text-gray-400">{t.profil.chargement}</p>;
  }

  return (
    <div>
      {/* Recherche + proposition */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t.explorer.recherche}
          className="flex-1 min-w-64 bg-black/40 border border-gray-700 rounded-full px-5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
        />
        <button
          type="button"
          onClick={() => setFormulaireOuvert((o) => !o)}
          className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-5 py-2.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          {formulaireOuvert ? t.explorer.annuler : t.explorer.proposer}
        </button>
      </div>

      {formulaireOuvert && (
        <form
          onSubmit={proposer}
          className="mt-4 bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-wrap gap-3"
        >
          <input
            name="emoji"
            maxLength={2}
            placeholder="🎯"
            aria-label="Emoji"
            className="w-16 text-center bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
          />
          <input
            name="titre"
            required
            placeholder={t.explorer.nomPlaceholder}
            className="flex-1 min-w-48 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
          />
          <input
            name="description"
            placeholder={t.explorer.descriptionPlaceholder}
            className="flex-1 min-w-64 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
          />
          <select
            name="type"
            defaultValue="quotidien"
            aria-label={t.explorer.type}
            className="bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
          >
            {TYPES.map((ty) => (
              <option key={ty} value={ty} className="bg-gray-900">
                {t.dashboard.categories[ty]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-5 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {t.explorer.creer}
          </button>
        </form>
      )}

      {/* Tableau */}
      {objectifs.length === 0 ? (
        <p className="mt-8 text-gray-400">{t.explorer.aucun}</p>
      ) : lignes.length === 0 ? (
        <p className="mt-8 text-gray-400">{t.explorer.aucunResultat}</p>
      ) : (
        <>
        {/* Mobile : une carte par objectif (un tableau de 8 colonnes serait illisible sur téléphone). */}
        <ul className="md:hidden mt-6 flex flex-col gap-3">
          {lignes.map((oc) => {
            const c = calculs(oc);
            return (
              <li
                key={oc.id}
                className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => basculerVote(oc)}
                    aria-pressed={c.aVote}
                    aria-label={t.explorer.votes}
                    className={`flex flex-col items-center shrink-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded ${
                      c.aVote ? "text-teal-500" : "text-gray-500 hover:text-white"
                    }`}
                  >
                    <span aria-hidden="true">👍</span>
                    <span className="text-sm font-bold tabular-nums">{c.nbVotes}</span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {oc.emoji && (
                        <span aria-hidden="true" className="text-xl shrink-0">
                          {oc.emoji}
                        </span>
                      )}
                      <span className="font-bold break-words">{oc.titre}</span>
                      {c.tousFaits && (
                        <span title={t.explorer.tousTermine} aria-label={t.explorer.tousTermine}>
                          🏆
                        </span>
                      )}
                    </div>
                    <span
                      className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ color: c.couleur, backgroundColor: `${c.couleur}22` }}
                    >
                      {t.dashboard.categories[oc.type]}
                    </span>
                  </div>
                </div>

                {oc.description && (
                  <p className="text-sm text-gray-400">{oc.description}</p>
                )}

                <div>
                  {c.serie >= 2 && (
                    <div className="text-xs text-amber-400 mb-1">
                      <span aria-hidden="true">🔥</span> {c.serie} {t.explorer.uniteSerie[oc.type]}
                    </div>
                  )}
                  <div className="h-5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      style={{
                        width: `${Math.max(c.pourcent, 12)}%`,
                        backgroundColor: c.couleur,
                      }}
                    >
                      {c.pourcent}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 tabular-nums">
                    {c.faits} / {c.participants} {t.explorer.completes}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 tabular-nums">
                    <span aria-hidden="true">👤</span> {c.participants.toLocaleString()} ·{" "}
                    {c.total.toLocaleString()} {t.explorer.fois}
                  </span>
                  <button
                    type="button"
                    onClick={() => (c.participe ? quitter(oc) : rejoindre(oc))}
                    className={`text-sm font-bold px-4 py-2 rounded-full border transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      c.participe
                        ? "border-red-800 text-red-400 hover:bg-red-950"
                        : "border-teal-600 text-teal-500 hover:bg-teal-950"
                    }`}
                  >
                    {c.participe ? t.explorer.quitter : t.explorer.participer}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Desktop : le tableau triable */}
        <div className="hidden md:block mt-6 overflow-x-auto defilement-listes">
          <table className="w-full min-w-[64rem] border-separate border-spacing-y-2">
            <thead>
              <tr>
                <EnteteTriable
                  libelle={t.explorer.votes}
                  colonne="votes"
                  tri={tri}
                  onTrier={trierPar}
                />
                <EnteteTriable
                  libelle={t.explorer.nom}
                  colonne="nom"
                  tri={tri}
                  onTrier={trierPar}
                />
                <th className="px-3 py-2 font-bold text-xs uppercase tracking-wide text-gray-400 text-left">
                  {t.explorer.description}
                </th>
                <EnteteTriable
                  libelle={t.explorer.termine}
                  colonne="termine"
                  tri={tri}
                  onTrier={trierPar}
                />
                <EnteteTriable
                  libelle={t.explorer.type}
                  colonne="type"
                  tri={tri}
                  onTrier={trierPar}
                />
                <EnteteTriable
                  libelle={t.explorer.progression}
                  colonne="progression"
                  tri={tri}
                  onTrier={trierPar}
                />
                <EnteteTriable
                  libelle={t.explorer.participants}
                  colonne="participants"
                  tri={tri}
                  onTrier={trierPar}
                />
                <th />
              </tr>
            </thead>

            <tbody>
              {lignes.map((oc) => {
                const {
                  participants, faits, total, serie, pourcent,
                  tousFaits, couleur, participe, aVote, nbVotes,
                } = calculs(oc);

                return (
                  <tr key={oc.id} className="bg-gray-900/60">
                    {/* Votes */}
                    <td className="px-3 py-3 rounded-l-2xl border-y border-l border-gray-800 align-middle">
                      <button
                        type="button"
                        onClick={() => basculerVote(oc)}
                        aria-pressed={aVote}
                        aria-label={t.explorer.votes}
                        className={`flex flex-col items-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded ${
                          aVote ? "text-teal-500" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <span aria-hidden="true">👍</span>
                        <span className="text-sm font-bold tabular-nums">
                          {nbVotes}
                        </span>
                      </button>
                    </td>

                    {/* Nom */}
                    <td className="px-3 py-3 border-y border-gray-800 align-middle">
                      <div className="flex items-center gap-2">
                        {oc.emoji && (
                          <span aria-hidden="true" className="text-xl">
                            {oc.emoji}
                          </span>
                        )}
                        <span className="font-bold">{oc.titre}</span>
                        {tousFaits && (
                          <span title={t.explorer.tousTermine} aria-label={t.explorer.tousTermine}>
                            🏆
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-3 border-y border-gray-800 align-middle max-w-64">
                      <span className="text-sm text-gray-400 line-clamp-2">{oc.description}</span>
                    </td>

                    {/* Terminé */}
                    <td className="px-3 py-3 border-y border-gray-800 align-middle whitespace-nowrap">
                      <span className="text-sm tabular-nums">
                        {total.toLocaleString()} {t.explorer.fois}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3 border-y border-gray-800 align-middle">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded whitespace-nowrap"
                        style={{ color: couleur, backgroundColor: `${couleur}22` }}
                      >
                        {t.dashboard.categories[oc.type]}
                      </span>
                    </td>

                    {/* Progression */}
                    <td className="px-3 py-3 border-y border-gray-800 align-middle min-w-56">
                      {serie >= 2 && (
                        <div className="text-xs text-amber-400 mb-1 whitespace-nowrap">
                          <span aria-hidden="true">🔥</span> {serie}{" "}
                          {t.explorer.uniteSerie[oc.type]}
                        </div>
                      )}
                      <div className="h-5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                          style={{ width: `${Math.max(pourcent, 12)}%`, backgroundColor: couleur }}
                        >
                          {pourcent}%
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 tabular-nums">
                        {faits} / {participants} {t.explorer.completes}
                      </div>
                    </td>

                    {/* Participants */}
                    <td className="px-3 py-3 border-y border-gray-800 align-middle whitespace-nowrap">
                      <span className="text-sm tabular-nums">
                        <span aria-hidden="true">👤</span> {participants.toLocaleString()}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-3 py-3 rounded-r-2xl border-y border-r border-gray-800 align-middle">
                      <button
                        type="button"
                        onClick={() => (participe ? quitter(oc) : rejoindre(oc))}
                        className={`text-sm font-bold px-4 py-2 rounded-full border transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                          participe
                            ? "border-red-800 text-red-400 hover:bg-red-950"
                            : "border-teal-600 text-teal-500 hover:bg-teal-950"
                        }`}
                      >
                        {participe ? t.explorer.quitter : t.explorer.participer}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Légende */}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
        <span>🔥 {t.explorer.uniteSerie.quotidien} ({t.dashboard.categories.quotidien})</span>
        <span>🔥 {t.explorer.uniteSerie.hebdomadaire} ({t.dashboard.categories.hebdomadaire})</span>
        <span>🔥 {t.explorer.uniteSerie.mensuel} ({t.dashboard.categories.mensuel})</span>
        <span>🏆 {t.explorer.tousTermine}</span>
      </div>
    </div>
  );
}
