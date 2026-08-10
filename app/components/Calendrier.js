"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

function cle(d) {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

function depuisCle(k) {
  const [a, m, j] = k.split("-").map(Number);
  return new Date(a, m - 1, j);
}

// Semaine lundi→dimanche, cohérent avec le calcul des séries.
function lundiDeLaSemaine(d) {
  const decalage = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - decalage);
}

// Dernier jour couvert (le jour de début si l'événement tient sur une journée).
function dernierJour(ev) {
  return ev.jour_fin || ev.jour;
}

// Les clés étant au format ISO, comparer les chaînes revient à comparer les dates.
function couvre(ev, k) {
  return ev.jour <= k && k <= dernierJour(ev);
}

function surPlusieursJours(ev) {
  return Boolean(ev.jour_fin) && ev.jour_fin !== ev.jour;
}

function formatPlage(ev, langue) {
  const f = new Intl.DateTimeFormat(langue, { day: "numeric", month: "short" });
  return `${f.format(depuisCle(ev.jour))} → ${f.format(depuisCle(ev.jour_fin))}`;
}

function formatHoraire(ev, t) {
  if (!ev.heure_debut && !ev.heure_fin) return t.agenda.touteLaJournee;
  const debut = ev.heure_debut ? ev.heure_debut.slice(0, 5) : "";
  const fin = ev.heure_fin ? ev.heure_fin.slice(0, 5) : "";
  return fin ? `${debut} - ${fin}` : debut;
}

// Découpe les événements d'une semaine en bandeaux : un seul élément qui
// s'étend sur plusieurs colonnes, au lieu d'une pastille par jour.
// Un événement à cheval sur deux semaines produit un bandeau par semaine.
function bandeauxDeLaSemaine(semaine, evenements) {
  const debutSemaine = cle(semaine[0]);
  const finSemaine = cle(semaine[6]);

  const concernes = evenements
    .filter((e) => e.jour <= finSemaine && dernierJour(e) >= debutSemaine)
    .sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));

  // Empilement : un bandeau se place sur la première ligne libre, pour que
  // deux événements simultanés ne se superposent pas.
  const finParLigne = [];

  return concernes.map((e) => {
    const debutIdx = e.jour <= debutSemaine ? 0 : semaine.findIndex((j) => cle(j) === e.jour);
    const finIdx =
      dernierJour(e) >= finSemaine ? 6 : semaine.findIndex((j) => cle(j) === dernierJour(e));

    let ligne = 0;
    while (finParLigne[ligne] !== undefined && finParLigne[ligne] >= debutIdx) ligne += 1;
    finParLigne[ligne] = finIdx;

    return {
      id: e.id,
      titre: e.titre,
      colonne: debutIdx + 1,
      etendue: finIdx - debutIdx + 1,
      ligne: ligne + 1,
      commenceIci: e.jour >= debutSemaine,
      termineIci: dernierJour(e) <= finSemaine,
    };
  });
}

export default function Calendrier({ userId }) {
  const { t, langue } = useLangue();
  // null tant que le composant n'est pas monté : évite que le rendu serveur
  // et le rendu client ne tombent pas sur le même jour.
  const [mois, setMois] = useState(null);
  const [selection, setSelection] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [joursActifs, setJoursActifs] = useState(new Set());
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Initialisation après montage, volontairement : la page est prérendue au
    // build, donc une date calculée pendant le rendu serveur serait fausse dans
    // le navigateur (décalage d'hydratation). L'état reste null jusqu'au montage.
    const n = new Date();
    /* eslint-disable react-hooks/set-state-in-effect -- date disponible seulement côté client */
    setMois(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelection(cle(n));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!mois) return;
    let annule = false;

    async function charger() {
      setChargement(true);
      const debut = new Date(mois.getFullYear(), mois.getMonth(), 1);
      const finExclue = new Date(mois.getFullYear(), mois.getMonth() + 1, 1);
      const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);

      const [re, rc] = await Promise.all([
        // Tout événement qui CHEVAUCHE le mois : il peut avoir commencé avant
        // et se poursuivre dedans. Un simple intervalle sur `jour` les raterait.
        supabase
          .from("evenements")
          .select("*")
          .lte("jour", cle(dernier))
          .or(`jour_fin.gte.${cle(debut)},jour.gte.${cle(debut)}`)
          .order("jour", { ascending: true })
          .order("heure_debut", { ascending: true, nullsFirst: true }),
        supabase
          .from("completions")
          .select("cree_le")
          .gte("cree_le", debut.toISOString())
          .lt("cree_le", finExclue.toISOString()),
      ]);

      if (annule) return;
      setEvenements(re.data || []);
      setJoursActifs(new Set((rc.data || []).map((c) => cle(new Date(c.cree_le)))));
      setChargement(false);
    }

    charger();
    return () => {
      annule = true;
    };
  }, [mois]);

  async function ajouterEvenement(e) {
    e.preventDefault();
    const form = e.target;
    const donnees = new FormData(form);
    const titre = (donnees.get("titre") || "").trim();
    if (!titre) return;

    const { data } = await supabase
      .from("evenements")
      .insert({
        user_id: userId,
        titre,
        jour: selection,
        jour_fin: donnees.get("jour_fin") || null,
        heure_debut: donnees.get("heure_debut") || null,
        heure_fin: donnees.get("heure_fin") || null,
      })
      .select()
      .single();

    if (data) setEvenements((ev) => [...ev, data]);
    form.reset();
  }

  async function supprimerEvenement(id) {
    await supabase.from("evenements").delete().eq("id", id);
    setEvenements((ev) => ev.filter((x) => x.id !== id));
  }

  if (!mois) {
    return <p className="text-gray-400">{t.profil.chargement}</p>;
  }

  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
  const debutGrille = lundiDeLaSemaine(premier);
  const jours = Array.from(
    { length: 42 },
    (_, i) =>
      new Date(debutGrille.getFullYear(), debutGrille.getMonth(), debutGrille.getDate() + i),
  );
  const semaines = Array.from({ length: 6 }, (_, i) => jours.slice(i * 7, i * 7 + 7));

  const titreMois = new Intl.DateTimeFormat(langue, {
    month: "long",
    year: "numeric",
  }).format(premier);
  const formatJourCourt = new Intl.DateTimeFormat(langue, { weekday: "short" });
  // 1er janvier 2024 était un lundi : sert de base aux en-têtes de colonnes.
  const entetes = Array.from({ length: 7 }, (_, i) =>
    formatJourCourt.format(new Date(2024, 0, 1 + i)),
  );

  const pluriel = new Intl.PluralRules(langue);
  const cleAujourdhui = cle(new Date());
  const evenementsDuJour = evenements.filter((e) => couvre(e, selection));
  const nbJoursActifsDuMois = jours.filter(
    (j) => j.getMonth() === mois.getMonth() && joursActifs.has(cle(j)),
  ).length;

  const HAUTEUR_BANDEAU = 20; // px, hauteur d'une ligne de bandeau
  const HAUTEUR_DATE = 26; // px réservés au numéro du jour

  return (
    <div>
      {/* En-tête : navigation + résumé du mois */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label={t.agenda.moisPrecedent}
            onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))}
            className="border border-gray-700 hover:border-teal-500 transition rounded-full w-9 h-9 flex items-center justify-center focus:outline-none focus-visible:border-teal-500"
          >
            ‹
          </button>
          <h2
            style={{ fontFamily: "var(--font-oswald)" }}
            className="text-lg sm:text-xl font-bold capitalize min-w-32 sm:min-w-48 text-center"
          >
            {titreMois}
          </h2>
          <button
            type="button"
            aria-label={t.agenda.moisSuivant}
            onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))}
            className="border border-gray-700 hover:border-teal-500 transition rounded-full w-9 h-9 flex items-center justify-center focus:outline-none focus-visible:border-teal-500"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => {
              const n = new Date();
              setMois(new Date(n.getFullYear(), n.getMonth(), 1));
              setSelection(cle(n));
            }}
            className="ml-2 text-sm text-gray-400 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-2 py-1"
          >
            {t.agenda.aujourdhui}
          </button>
        </div>

        <p className="text-sm text-gray-400">
          {evenements.length} {t.agenda.evenements[pluriel.select(evenements.length)]} ·{" "}
          {nbJoursActifsDuMois} {t.agenda.joursActifs[pluriel.select(nbJoursActifsDuMois)]}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Grille du mois, semaine par semaine */}
        <div>
          <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
            {entetes.map((e) => (
              <div key={e} className="text-center capitalize py-1">
                {e}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {semaines.map((semaine) => {
              const bandeaux = bandeauxDeLaSemaine(semaine, evenements);
              const nbLignes = bandeaux.reduce((max, b) => Math.max(max, b.ligne), 0);
              // La hauteur des cases s'ajuste au nombre de bandeaux empilés.
              const hauteur = HAUTEUR_DATE + nbLignes * (HAUTEUR_BANDEAU + 2) + 10;

              return (
                <div key={cle(semaine[0])} className="relative">
                  {/* Couche 1 : les cases */}
                  <div className="grid grid-cols-7 gap-1">
                    {semaine.map((jour) => {
                      const k = cle(jour);
                      const dansLeMois = jour.getMonth() === mois.getMonth();
                      const estSelection = k === selection;

                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setSelection(k)}
                          style={{ minHeight: Math.max(hauteur, 76) }}
                          className={`flex flex-col justify-start rounded-lg border p-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                            estSelection
                              ? "border-teal-500 bg-teal-950"
                              : dansLeMois
                                ? "border-gray-800 bg-gray-900 hover:border-gray-600"
                                : "border-gray-900 bg-gray-950"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                k === cleAujourdhui
                                  ? "text-teal-500"
                                  : dansLeMois
                                    ? "text-gray-300"
                                    : "text-gray-600"
                              }`}
                            >
                              {jour.getDate()}
                            </span>
                            {joursActifs.has(k) && (
                              <span
                                aria-label={t.agenda.legendeActif}
                                className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Couche 2 : les bandeaux, superposés et étendus sur plusieurs
                      colonnes. pointer-events-none pour ne pas gêner la sélection. */}
                  <div
                    className="pointer-events-none absolute inset-x-0 grid grid-cols-7 gap-x-1 gap-y-0.5 px-0"
                    style={{ top: HAUTEUR_DATE, gridAutoRows: `${HAUTEUR_BANDEAU}px` }}
                  >
                    {bandeaux.map((b) => (
                      <div
                        key={b.id}
                        title={b.titre}
                        style={{
                          gridColumn: `${b.colonne} / span ${b.etendue}`,
                          gridRow: b.ligne,
                        }}
                        className={`mx-1 truncate bg-teal-700/70 text-white text-[11px] leading-5 px-1.5 ${
                          b.commenceIci ? "rounded-l-md" : ""
                        } ${b.termineIci ? "rounded-r-md" : ""}`}
                      >
                        {b.titre}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            {t.agenda.legendeActif}
          </p>
        </div>

        {/* Panneau du jour sélectionné */}
        <aside className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <h3 className="font-bold">
            {selection &&
              new Intl.DateTimeFormat(langue, {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(depuisCle(selection))}
          </h3>

          {chargement ? (
            <p className="mt-4 text-sm text-gray-400">{t.profil.chargement}</p>
          ) : evenementsDuJour.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">{t.agenda.aucunCeJour}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {evenementsDuJour.map((e) => (
                <li
                  key={e.id}
                  className="group flex items-start gap-2 border border-gray-800 rounded-xl p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{e.titre}</div>
                    {surPlusieursJours(e) && (
                      <div className="text-xs text-teal-500">{formatPlage(e, langue)}</div>
                    )}
                    <div className="text-xs text-gray-400">{formatHoraire(e, t)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => supprimerEvenement(e.id)}
                    aria-label={t.agenda.supprimer}
                    className="text-gray-600 hover:text-white transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={ajouterEvenement} className="mt-5 flex flex-col gap-2">
            <input
              name="titre"
              required
              placeholder={t.agenda.titrePlaceholder}
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
            />
            <label className="block text-xs text-gray-400">
              {t.agenda.jourFin}
              <input
                name="jour_fin"
                type="date"
                min={selection}
                className="mt-1 w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </label>

            <div className="flex gap-2">
              <label className="flex-1 min-w-0 block text-xs text-gray-400">
                {t.agenda.debut}
                <input
                  name="heure_debut"
                  type="time"
                  className="mt-1 w-full bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </label>
              <label className="flex-1 min-w-0 block text-xs text-gray-400">
                {t.agenda.fin}
                <input
                  name="heure_fin"
                  type="time"
                  className="mt-1 w-full bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </label>
            </div>
            <button
              type="submit"
              className="bg-teal-700 hover:bg-teal-600 transition text-sm font-bold px-4 py-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {t.agenda.ajouter}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
