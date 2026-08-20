"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";
import IconeDossier from "./IconeDossier";
import { calculerSerie, estFaitMaintenant } from "../lib/periodes";
import { basculerCompletion } from "../lib/completions";
import { COULEUR_TYPE } from "../lib/couleurs";
import { parPosition } from "../lib/position";

// Choix du menu déroulant, dans l'ordre. La chaîne vide = « sans type » (coché
// une fois, sans remise à zéro ni série), en tête et sélectionné par défaut.
const TYPES = ["", "quotidien", "hebdomadaire", "mensuel", "unique"];

// Type transporté quand on glisse une COLONNE ; les objectifs utilisent
// "text/plain". C'est ce qui permet de ne pas confondre les deux.
const TYPE_LISTE = "application/x-liste";

// Pendant un survol, getData renvoie "" mais la liste des types reste lisible :
// seul moyen de savoir « est-ce une colonne ? » avant le dépôt.
const estGlissementDeListe = (e) => Array.from(e.dataTransfer.types).includes(TYPE_LISTE);

// Texte cliquable qui devient un champ : Entrée/clic-ailleurs valide, Échap
// annule. Ne déclenche pas le glisser-déposer du parent.
function TexteEditable({ valeur, onEnregistrer, className, titre, refElement }) {
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState(valeur);

  function valider() {
    const nv = v.trim();
    if (nv && nv !== valeur) onEnregistrer(nv);
    setEdition(false);
  }

  if (edition) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === "Enter") valider();
          if (e.key === "Escape") setEdition(false);
        }}
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 bg-black/40 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-teal-500"
      />
    );
  }

  return (
    <button
      ref={refElement}
      type="button"
      onClick={() => {
        setV(valeur);
        setEdition(true);
      }}
      title={titre}
      className={className}
    >
      {valeur}
    </button>
  );
}

// Bouton « + Ajouter une liste » qui devient un champ au clic. Entrée ou
// clic-ailleurs valide, Échap annule (comportement de Trello).
function AjoutListe({ label, placeholder, onAjouter }) {
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState("");

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

// Comme AjoutListe, avec en plus le menu déroulant du type. Pas de validation
// au clic-ailleurs : ouvrir le menu ferait perdre le focus et annulerait.
function AjoutObjectif({ t, onAjouter }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");

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

// Une ligne d'objectif : case à cocher, nom (renommable/repliable), étiquette
// de type, série 🔥 et archivage. Composant à part car il a son propre état
// (nom replié ou non), qui ne concerne que cette ligne.
function LigneObjectif({
  objectif,
  liste,
  t,
  fait,
  serie,
  index,
  onBasculer,
  onRenommer,
  onArchiver,
  onDeposer,
}) {
  const [deplie, setDeplie] = useState(false);
  const [tronque, setTronque] = useState(false);
  const refNom = useRef(null);

  // Le nom est-il coupé par le line-clamp ? Impossible à deviner (dépend de la
  // largeur et de la police) : on mesure. Pas en mode déplié, sinon le bouton
  // disparaîtrait aussitôt.
  useEffect(() => {
    if (deplie) return;
    const el = refNom.current;
    if (!el) return;
    const observateur = new ResizeObserver(() =>
      setTronque(el.scrollHeight > el.clientHeight + 1),
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [objectif.nom, deplie]);

  const libelleType = objectif.type ? t.dashboard.categories[objectif.type] : null;

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", objectif.id)}
      onDragOver={(e) => {
        // Une colonne survolée passe son chemin : c'est la colonne qui la
        // reçoit, pas la ligne.
        if (estGlissementDeListe(e)) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        if (estGlissementDeListe(e)) return;
        e.preventDefault();
        e.stopPropagation();
        const id = e.dataTransfer.getData("text/plain");
        if (id && id !== objectif.id) onDeposer(id, index);
      }}
      className="group flex items-start gap-2 cursor-grab active:cursor-grabbing"
    >
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
        <TexteEditable
          refElement={refNom}
          valeur={objectif.nom}
          onEnregistrer={onRenommer}
          titre={t.dashboard.renommer}
          className={`w-full text-base text-left break-words rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
            deplie ? "" : "line-clamp-2"
          } ${fait ? "line-through text-gray-500" : ""}`}
        />

        <div className="mt-1 flex items-center gap-2">
          {/* Pas d'étiquette pour un objectif sans type : « Sans type » serait
              du bruit sur chaque ligne. */}
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

          {tronque && (
            <button
              type="button"
              onClick={() => setDeplie((d) => !d)}
              className="text-xs text-gray-400 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
            >
              {deplie ? t.dashboard.voirMoins : t.dashboard.voirPlus}
            </button>
          )}
        </div>
      </div>

      {serie >= 2 && (
        <span className="mt-0.5 text-xs font-bold text-amber-400 shrink-0">
          <span aria-hidden="true">🔥</span>
          {serie}
        </span>
      )}

      {/* Objectif validé : archiver devient l'action naturelle (icône, bouton
          visible). Sinon on garde le × discret, révélé au survol. */}
      <button
        type="button"
        onClick={onArchiver}
        aria-label={t.dashboard.archiverItem}
        title={t.dashboard.archiverItem}
        className={`mt-0.5 shrink-0 rounded text-gray-400 transition hover:text-white focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
          fait ? "opacity-90 hover:opacity-100" : "text-lg leading-none opacity-0 group-hover:opacity-100"
        }`}
      >
        {fait ? <IconeDossier /> : "×"}
      </button>
    </li>
  );
}

// Le tableau de listes (façon Trello) du dashboard. Les données vivent dans la
// page dashboard, passées en props avec leurs setters : les cartes de stats et
// le tableau lisent la même source et se mettent à jour ensemble.
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
  const [survolee, setSurvolee] = useState(null); // liste survolée pendant un drag
  const [erreur, setErreur] = useState(null); // échec d'une écriture en base
  const refDefilement = useRef(null);

  // Molette verticale → défilement horizontal des colonnes. Écouteur natif non
  // passif : React attache `wheel` en passif, ce qui interdirait preventDefault().
  useEffect(() => {
    const el = refDefilement.current;
    if (!el) return;

    function auMolette(e) {
      if (el.scrollWidth <= el.clientWidth) return; // rien à faire défiler
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // geste déjà horizontal

      // En butée, on rend la main à la page plutôt que de la bloquer.
      const enButee = e.deltaY > 0
        ? el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
        : el.scrollLeft <= 0;
      if (enButee) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }

    el.addEventListener("wheel", auMolette, { passive: false });
    return () => el.removeEventListener("wheel", auMolette);
  }, []);

  // Lectures dans les props.
  const periodesDe = (objectifId) =>
    completions.filter((c) => c.objectif_id === objectifId).map((c) => c.periode);
  const listesTriees = () => [...listes].sort(parPosition);
  const objectifsDe = (listeId) =>
    objectifs.filter((o) => o.liste_id === listeId).sort(parPosition);

  // Écritures : chaque action met à jour la base ET l'état local, pour que
  // l'interface réagisse sans attendre un rechargement.

  async function renommerListe(id, titre) {
    setListes((l) => l.map((x) => (x.id === id ? { ...x, titre } : x)));
    await supabase.from("listes").update({ titre }).eq("id", id);
  }

  async function supprimerListe(id) {
    await supabase.from("listes").delete().eq("id", id);
    setListes((l) => l.filter((x) => x.id !== id));
    setObjectifs((o) => o.filter((x) => x.liste_id !== id));
  }

  async function ajouterObjectif(listeId, nom, type) {
    setErreur(null);
    const { data, error } = await supabase
      .from("objectifs")
      // `|| null` : le menu renvoie "" pour « sans type », que la base refuse ;
      // elle accepte NULL.
      .insert({ user_id: userId, liste_id: listeId, nom, type: type || null, position: objectifsDe(listeId).length })
      .select()
      .single();
    if (error) {
      setErreur(`${t.dashboard.erreurAjoutObjectif} ${error.message}`);
      return;
    }
    setObjectifs((o) => [...o, data]);
  }

  async function renommerObjectif(id, nom) {
    setObjectifs((o) => o.map((x) => (x.id === id ? { ...x, nom } : x)));
    await supabase.from("objectifs").update({ nom }).eq("id", id);
  }

  // Archiver ≠ supprimer : l'objectif sort du tableau mais reste en base avec
  // son historique. On le retrouve dans l'archive du profil.
  async function archiverObjectif(id) {
    await supabase.from("objectifs").update({ archive: true }).eq("id", id);
    setObjectifs((o) => o.filter((x) => x.id !== id));
  }

  // Cocher / décocher : logique partagée avec le panneau « À faire ».
  const basculer = (objectif) =>
    basculerCompletion({ objectif, userId, completions, setCompletions });

  // Déplace un objectif vers listeCibleId à l'index donné (null = à la fin).
  // Recalcule et persiste les positions des listes concernées.
  async function deplacerObjectif(objectifId, listeCibleId, indexCible) {
    const objet = objectifs.find((o) => o.id === objectifId);
    if (!objet) return;
    const source = objet.liste_id;

    const cible = objectifsDe(listeCibleId).filter((o) => o.id !== objectifId);
    cible.splice(indexCible == null ? cible.length : indexCible, 0, objet);

    const affectes = new Map();
    cible.forEach((o, i) => affectes.set(o.id, { ...o, liste_id: listeCibleId, position: i }));
    if (source !== listeCibleId) {
      objectifsDe(source)
        .filter((o) => o.id !== objectifId)
        .forEach((o, i) => affectes.set(o.id, { ...o, position: i }));
    }

    setObjectifs((prev) => prev.map((o) => affectes.get(o.id) || o));
    await Promise.all(
      [...affectes.values()].map((o) =>
        supabase.from("objectifs").update({ liste_id: o.liste_id, position: o.position }).eq("id", o.id),
      ),
    );
  }

  // Réordonne les colonnes. Les deux glissements se distinguent par le type
  // transporté : TYPE_LISTE pour une colonne, "text/plain" pour un objectif.
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

      {/* Mobile : listes empilées (défilement vertical de la page). À partir de
          md : colonnes côte à côte, défilement horizontal. items-start (desktop) :
          chaque colonne garde sa hauteur propre. */}
      <div
        ref={refDefilement}
        className="defilement-listes flex flex-col md:flex-row items-stretch md:items-start gap-4 md:overflow-x-auto pb-4"
      >
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
              // Colonne déposée sur une autre : on réordonne les colonnes.
              const idListe = e.dataTransfer.getData(TYPE_LISTE);
              if (idListe) {
                deplacerListe(idListe, indexListe);
                return;
              }
              const id = e.dataTransfer.getData("text/plain");
              if (id) deplacerObjectif(id, liste.id, null);
            }}
            className={`w-full md:w-[24rem] shrink-0 bg-gray-900/60 border rounded-2xl p-5 flex flex-col gap-3 transition ${
              survolee === liste.id ? "border-teal-500" : "border-gray-800"
            }`}
          >
            {/* En-tête de liste — sert aussi de poignée pour déplacer la
                colonne. On ne rend pas toute la colonne glissable : ses
                objectifs le sont déjà. */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TYPE_LISTE, liste.id);
                e.stopPropagation();
              }}
              title={t.dashboard.deplacerListe}
              className="group flex items-center gap-2 cursor-grab active:cursor-grabbing"
            >
              {/* Poignée de déplacement, révélée au survol de l'en-tête. */}
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
              <TexteEditable
                valeur={liste.titre}
                onEnregistrer={(titre) => renommerListe(liste.id, titre)}
                titre={t.dashboard.renommer}
                className="font-bold text-base flex-1 truncate text-left hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              />
              <button
                type="button"
                onClick={() => supprimerListe(liste.id)}
                aria-label={t.dashboard.supprimerListe}
                className="text-gray-500 hover:text-white transition text-lg leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                ×
              </button>
            </div>

            {/* Objectifs */}
            <ul className="flex flex-col gap-2">
              {objectifsDe(liste.id).map((objectif, index) => (
                <LigneObjectif
                  key={objectif.id}
                  objectif={objectif}
                  liste={liste}
                  t={t}
                  index={index}
                  fait={estFaitMaintenant(objectif.type, periodesDe(objectif.id))}
                  serie={calculerSerie(objectif.type, periodesDe(objectif.id))}
                  onBasculer={() => basculer(objectif)}
                  onRenommer={(nom) => renommerObjectif(objectif.id, nom)}
                  onArchiver={() => archiverObjectif(objectif.id)}
                  onDeposer={(id, position) => deplacerObjectif(id, liste.id, position)}
                />
              ))}
            </ul>

            <AjoutObjectif t={t} onAjouter={(nom, type) => ajouterObjectif(liste.id, nom, type)} />
          </div>
        ))}

        {/* Colonne « ajouter une liste » */}
        <div className="w-full md:w-[24rem] shrink-0 border border-dashed border-gray-700 rounded-2xl p-5 flex items-start justify-center">
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
