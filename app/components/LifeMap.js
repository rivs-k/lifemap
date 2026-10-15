"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";
import IconeDossier from "./IconeDossier";
import { estFaitMaintenant } from "../lib/periodes";
import { basculerCompletion } from "../lib/completions";
import { COULEUR_TYPE } from "../lib/couleurs";
import { parPosition } from "../lib/position";

const TYPES = ["", "quotidien", "hebdomadaire", "mensuel", "unique"];

const TYPE_LISTE = "application/x-liste";

// Composant AjoutListe
function AjoutListe({ label, placeholder, onAjouter }) {
  // États
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState("");

  // Valider
  function valider() {
    const v = valeur.trim();
    if (v) onAjouter(v);
    setValeur("");
    setOuvert(false);
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition rounded-lg px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <span aria-hidden="true">+</span> {label}
      </button>
    );
  }

  // Affichage
  return (
    <input
      autoFocus
      value={valeur}
      onChange={(e) => setValeur(e.target.value)}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === "Enter") valider();
        if (e.key === "Escape") {
          setValeur("");
          setOuvert(false);
        }
      }}
      placeholder={placeholder}
      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
    />
  );
}

// Composant AjoutObjectif
function AjoutObjectif({ t, onAjouter }) {
  // États
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");

  // Valider
  function valider() {
    const v = nom.trim();
    if (!v) return;
    onAjouter(v, type);
    setNom("");
    setType("");
    setOuvert(false);
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition rounded-lg px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <span aria-hidden="true">+</span> {t.dashboard.ajouterItem}
      </button>
    );
  }

  // Affichage
  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") valider();
          if (e.key === "Escape") setOuvert(false);
        }}
        placeholder={t.dashboard.nomItem}
        className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
      />
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label={t.dashboard.typeObjectif}
          className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
        >
          {TYPES.map((ty) => (
            <option key={ty} value={ty} className="bg-gray-900">
              {ty ? t.dashboard.categories[ty] : t.dashboard.categories.sansType}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={valider}
          className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-4 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          OK
        </button>
      </div>
    </div>
  );
}

// Composant LigneObjectif
function LigneObjectif({
  objectif,
  liste,
  t,
  fait,
  onBasculer,
  onArchiver,
}) {
  const libelleType = objectif.type ? t.dashboard.categories[objectif.type] : null;

  // Affichage
  return (
    <li className="group flex items-start gap-2">
      <button
        type="button"
        onClick={onBasculer}
        aria-pressed={fait}
        aria-label={objectif.nom}
        className={`w-5 h-5 mt-0.5 shrink-0 rounded-full border flex items-center justify-center text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
          fait ? "text-white" : "border-gray-600 text-transparent"
        }`}
        style={fait ? { backgroundColor: liste.couleur, borderColor: liste.couleur } : undefined}
      >
        ✓
      </button>

      <div className="flex-1 min-w-0">
        <span
          className={`block w-full text-base break-words ${
            fait ? "line-through text-gray-500" : ""
          }`}
        >
          {objectif.nom}
        </span>

        <div className="mt-1 flex items-center gap-2">
          {libelleType && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
              style={{
                color: COULEUR_TYPE[objectif.type],
                backgroundColor: `${COULEUR_TYPE[objectif.type]}22`,
              }}
            >
              {libelleType}
            </span>
          )}

          {objectif.objectif_communautaire_id && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 text-teal-500 bg-teal-500/10 border border-teal-500/30">
              {t.dashboard.objectifRejoint}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onArchiver}
        aria-label={t.dashboard.archiverItem}
        title={t.dashboard.archiverItem}
        className={`mt-0.5 shrink-0 rounded text-gray-400 transition hover:text-white focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
          fait ? "opacity-90 hover:opacity-100" : "text-lg leading-none opacity-100 md:opacity-0 md:group-hover:opacity-100"
        }`}
      >
        {fait ? <IconeDossier /> : "×"}
      </button>
    </li>
  );
}

// Composant LifeMap
export default function LifeMap({
  userId,
  listes,
  objectifs,
  completions,
  setListes,
  setObjectifs,
  setCompletions,
  ajouterListe,
}) {
  const { t } = useLangue();
  // États
  const [survolee, setSurvolee] = useState(null);
  const [erreur, setErreur] = useState(null);

  // Périodes de
  const periodesDe = (objectifId) =>
    completions.filter((c) => c.objectif_id === objectifId).map((c) => c.periode);
  const listesTriees = () => [...listes].sort(parPosition);
  // Objectifs de
  const objectifsDe = (listeId) =>
    objectifs.filter((o) => o.liste_id === listeId).sort(parPosition);

  // Supprimer liste
  async function supprimerListe(id) {
    await supabase.from("listes").delete().eq("id", id);
    setListes((l) => l.filter((x) => x.id !== id));
    setObjectifs((o) => o.filter((x) => x.liste_id !== id));
  }

  // Ajouter objectif
  async function ajouterObjectif(listeId, nom, type) {
    setErreur(null);
    const { data, error } = await supabase
      .from("objectifs")
      .insert({ user_id: userId, liste_id: listeId, nom, type: type || null, position: objectifsDe(listeId).length })
      .select()
      .single();
    if (error) {
      setErreur(`${t.dashboard.erreurAjoutObjectif} ${error.message}`);
      return;
    }
    setObjectifs((o) => [...o, data]);
  }

  // Archiver objectif
  async function archiverObjectif(id) {
    await supabase.from("objectifs").update({ archive: true }).eq("id", id);
    setObjectifs((o) => o.filter((x) => x.id !== id));
  }

  // Basculer
  const basculer = (objectif) =>
    basculerCompletion({ objectif, userId, completions, setCompletions });

  // Déplacer liste
  async function deplacerListe(listeId, indexCible) {
    const ordre = listesTriees();
    const depuis = ordre.findIndex((l) => l.id === listeId);
    if (depuis === -1 || depuis === indexCible) return;

    ordre.splice(indexCible, 0, ordre.splice(depuis, 1)[0]);
    const reindexees = ordre.map((l, i) => ({ ...l, position: i }));
    setListes(reindexees);

    await Promise.all(
      reindexees.map((l) =>
        supabase.from("listes").update({ position: l.position }).eq("id", l.id),
      ),
    );
  }

  // Affichage
  return (
    <section className="mt-8">
      <h2 className="font-bold text-xl mb-5">{t.dashboard.lifeMap}</h2>

      {erreur && (
        <p
          role="alert"
          className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-lg px-4 py-2"
        >
          {erreur}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start gap-4">
        {listesTriees().map((liste, indexListe) => (
          <div
            key={liste.id}
            onDragOver={(e) => {
              e.preventDefault();
              setSurvolee(liste.id);
            }}
            onDragLeave={() => setSurvolee((s) => (s === liste.id ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setSurvolee(null);
              const idListe = e.dataTransfer.getData(TYPE_LISTE);
              if (idListe) deplacerListe(idListe, indexListe);
            }}
            className={`w-full bg-gray-900/60 border rounded-2xl p-5 flex flex-col gap-3 transition ${
              survolee === liste.id ? "border-teal-500" : "border-gray-800"
            }`}
          >
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TYPE_LISTE, liste.id);
                e.stopPropagation();
              }}
              title={t.dashboard.deplacerListe}
              className="group flex items-center gap-2 cursor-grab active:cursor-grabbing"
            >
              <span
                aria-hidden="true"
                className="shrink-0 -ml-1 text-gray-600 group-hover:text-gray-400 transition"
              >
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                  <circle cx="2.5" cy="3" r="1.2" />
                  <circle cx="7.5" cy="3" r="1.2" />
                  <circle cx="2.5" cy="8" r="1.2" />
                  <circle cx="7.5" cy="8" r="1.2" />
                  <circle cx="2.5" cy="13" r="1.2" />
                  <circle cx="7.5" cy="13" r="1.2" />
                </svg>
              </span>
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: liste.couleur }}
              />
              <span className="font-bold text-base flex-1 truncate">
                {liste.titre}
              </span>
              <button
                type="button"
                onClick={() => supprimerListe(liste.id)}
                aria-label={t.dashboard.supprimerListe}
                className="text-gray-500 hover:text-white transition text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                ×
              </button>
            </div>

            <ul className="flex flex-col gap-2">
              {objectifsDe(liste.id).map((objectif) => (
                <LigneObjectif
                  key={objectif.id}
                  objectif={objectif}
                  liste={liste}
                  t={t}
                  fait={estFaitMaintenant(objectif.type, periodesDe(objectif.id))}
                  onBasculer={() => basculer(objectif)}
                  onArchiver={() => archiverObjectif(objectif.id)}
                />
              ))}
            </ul>

            <AjoutObjectif t={t} onAjouter={(nom, type) => ajouterObjectif(liste.id, nom, type)} />
          </div>
        ))}

        <div className="w-full border border-dashed border-gray-700 rounded-2xl p-5 flex items-start justify-center">
          <AjoutListe
            label={t.dashboard.ajouterListe}
            placeholder={t.dashboard.nomListe}
            onAjouter={ajouterListe}
          />
        </div>
      </div>
    </section>
  );
}
