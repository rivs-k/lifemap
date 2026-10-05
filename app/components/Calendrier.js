"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";

function cle(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
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
const dernierJour = (ev) => ev.jour_fin || ev.jour;

// Les clés étant au format ISO, comparer les chaînes revient à comparer les dates.
const couvre = (ev, k) => ev.jour <= k && k <= dernierJour(ev);

const surPlusieursJours = (ev) => Boolean(ev.jour_fin) && ev.jour_fin !== ev.jour;

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

// Couleur de pastille dérivée de l'id : stable et distincte d'un événement à
// l'autre (elle ne porte pas de sens, elle sert juste à les différencier).
const PALETTE_EV = ["#0d9488", "#9085e9", "#d55181", "#c98500", "#3b82f6"];
function couleurEvenement(ev) {
  const somme = [...ev.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  return PALETTE_EV[somme % PALETTE_EV.length];
}

export default function Calendrier({ userId }) {
  const { t, langue } = useLangue();
  // null tant que le composant n'est pas monté : évite un décalage d'hydratation
  // (le rendu serveur ne tomberait pas sur le même jour que le client).
  const [mois, setMois] = useState(null);
  const [selection, setSelection] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Initialisation après montage : la page est prérendue au build, donc une
    // date calculée côté serveur serait fausse dans le navigateur.
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
      const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);

      // Tout événement qui CHEVAUCHE le mois : il peut avoir commencé avant et
      // se poursuivre dedans. Un simple intervalle sur `jour` les raterait.
      const re = await supabase
        .from("evenements")
        .select("*")
        .lte("jour", cle(dernier))
        .or(`jour_fin.gte.${cle(debut)},jour.gte.${cle(debut)}`)
        .order("jour", { ascending: true })
        .order("heure_debut", { ascending: true, nullsFirst: true });

      if (annule) return;
      setEvenements(re.data || []);
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
  // En-têtes des colonnes (Lun, Mar…), traduits dans le dictionnaire.
  const entetes = t.agenda.joursSemaine;

  const cleAujourdhui = cle(new Date());
  const evenementsDuJour = evenements.filter((e) => couvre(e, selection));

  return (
    <div>
      {/* En-tête : navigation entre les mois */}
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
        </div>
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
            {semaines.map((semaine) => (
              <div key={cle(semaine[0])} className="grid grid-cols-7 gap-1">
                {semaine.map((jour) => {
                  const k = cle(jour);
                  const dansLeMois = jour.getMonth() === mois.getMonth();
                  const estSelection = k === selection;
                  // Une pastille par événement couvrant ce jour, chacune colorée.
                  const evsDuJour = evenements.filter((e) => couvre(e, k));

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelection(k)}
                      className={`min-h-[76px] flex flex-col justify-start gap-1 rounded-lg border p-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        estSelection
                          ? "border-teal-500 bg-teal-950"
                          : dansLeMois
                            ? "border-gray-800 bg-gray-900 hover:border-gray-600"
                            : "border-gray-900 bg-gray-950"
                      }`}
                    >
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
                      {evsDuJour.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {evsDuJour.map((e) => (
                            <span
                              key={e.id}
                              aria-hidden="true"
                              title={e.titre}
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: couleurEvenement(e) }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
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
