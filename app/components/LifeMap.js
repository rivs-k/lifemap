"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";
import IconeDossier from "./IconeDossier";
import AssistantObjectif from "./AssistantObjectif";
import { calculerSerie, estFaitMaintenant } from "../lib/periodes";
import { basculerCompletion } from "../lib/completions";

// Les choix du menu déroulant, dans l'ordre. La chaîne vide = « sans type » :
// une tâche qu'on coche une fois, sans remise à zéro ni série. Elle est en tête
// et sélectionnée par défaut — mettre une étiquette doit rester un choix.
const TYPES = ["", "quotidien", "hebdomadaire", "mensuel", "unique"];

// Type de données transporté quand on glisse une COLONNE. Les objectifs, eux,
// utilisent "text/plain" : c'est ce qui permet de ne pas confondre les deux.
const TYPE_LISTE = "application/x-liste";

// Pendant un survol, le navigateur masque le CONTENU du presse-papiers de glisser
// (getData renvoie ""), mais laisse lire la liste des types. C'est donc le seul
// moyen de savoir « est-ce une colonne ? » avant le dépôt.
function estGlissementDeListe(e) {
  return Array.from(e.dataTransfer.types).includes(TYPE_LISTE);
}

// Couleur associée à chaque type — identiques à celles de la carte « objectifs
// terminés », pour qu'on fasse le lien entre le tableau et les statistiques.
// Le libellé écrit reste l'information principale : la couleur ne fait que la
// renforcer (elle seule serait illisible pour un daltonien).
const COULEUR_TYPE = {
  quotidien: "#0d9488",
  hebdomadaire: "#9085e9",
  mensuel: "#d55181",
  unique: "#c98500",
};

// Couleurs proposées aux nouvelles listes, piochées à tour de rôle.
// Dérivée de COULEUR_TYPE pour n'avoir qu'une seule définition des teintes.
const PALETTE = Object.values(COULEUR_TYPE);

// Texte cliquable qui devient un champ de saisie : Entrée/clic-ailleurs valide,
// Échap annule. Ne déclenche pas le glisser-déposer du parent.
function TexteEditable({ valeur, onEnregistrer, className, titre, refElement }) {
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState(valeur);

  function ouvrir() {
    setV(valeur);
    setEdition(true);
  }

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
    <button ref={refElement} type="button" onClick={ouvrir} title={titre} className={className}>
      {valeur}
    </button>
  );
}

// Bouton « + Ajouter une liste » qui se transforme en champ de saisie au clic.
// Entrée ou clic ailleurs valide, Échap annule (comportement de Trello).
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

// Même principe que AjoutListe, mais avec en plus le menu déroulant du type.
// Pas de validation au clic-ailleurs ici : ouvrir le menu déroulant ferait
// perdre le focus au champ et annulerait la saisie en cours.
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

// Une ligne d'objectif dans une liste : case à cocher, nom (renommable et
// repliable), étiquette de type, série 🔥 et bouton d'archivage.
// Composant à part car il a son propre état — savoir si le nom est replié ou
// non ne concerne que cette ligne, pas tout le tableau.
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

  // Le nom est-il coupé par le line-clamp ? Impossible à deviner d'après sa
  // longueur (ça dépend de la largeur de colonne et de la police) : on mesure.
  // On ne mesure pas en mode déplié, sinon le bouton disparaîtrait aussitôt.
  useEffect(() => {
    if (deplie) return;
    const el = refNom.current;
    if (!el) return;
    const observateur = new ResizeObserver(() => {
      setTronque(el.scrollHeight > el.clientHeight + 1);
    });
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [objectif.nom, deplie]);

  const libelleType = objectif.type ? t.dashboard.categories[objectif.type] : null;

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", objectif.id)}
      onDragOver={(e) => {
        // Une colonne survolée passe son chemin : c'est la colonne qui doit la
        // recevoir, pas la ligne. Sans ça, lâcher une colonne au-dessus d'un
        // objectif ne ferait rien du tout.
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
          {/* Pas d'étiquette du tout pour un objectif sans type : une pastille
              « Sans type » serait du bruit sur chaque ligne. */}
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

      {/* Une fois l'objectif validé, archiver devient l'action naturelle :
          l'icône le dit, et le bouton reste visible au lieu d'attendre le
          survol. Tant qu'il n'est pas fait, on garde le × discret. */}
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

// Le tableau de listes (façon Trello) du dashboard.
//
// Les données ne sont PAS détenues ici mais dans la page dashboard, qui les
// passe en props avec leurs setters. C'est ce qui permet aux cartes de
// statistiques de se mettre à jour en direct quand on coche un objectif :
// les deux affichages lisent la même source.
export default function LifeMap({
  userId,
  listes,
  objectifs,
  completions,
  setListes,
  setObjectifs,
  setCompletions,
}) {
  const { t } = useLangue();
  const [survolee, setSurvolee] = useState(null); // liste survolée pendant un drag
  const [assistantOuvert, setAssistantOuvert] = useState(false);
  const refDefilement = useRef(null);

  // Molette verticale → défilement horizontal des colonnes.
  // Écouteur natif non passif : React attache `wheel` en passif, ce qui
  // interdirait preventDefault().
  useEffect(() => {
    const el = refDefilement.current;
    if (!el) return;

    function auMolette(e) {
      if (el.scrollWidth <= el.clientWidth) return; // rien à faire défiler
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // geste déjà horizontal

      // Arrivé en butée, on rend la main à la page plutôt que de la bloquer.
      const versLaFin = e.deltaY > 0;
      const enButee = versLaFin
        ? el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
        : el.scrollLeft <= 0;
      if (enButee) return;

      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }

    el.addEventListener("wheel", auMolette, { passive: false });
    return () => el.removeEventListener("wheel", auMolette);
  }, []);

  // ── Lectures : petites aides pour piocher dans les props ──

  // Les périodes déjà validées pour un objectif (sert aux séries et au « fait ? »).
  function periodesDe(objectifId) {
    return completions.filter((c) => c.objectif_id === objectifId).map((c) => c.periode);
  }

  // Les colonnes dans l'ordre choisi par l'utilisateur (copie : le tri se fait
  // en place, on ne veut pas modifier la prop reçue).
  function listesTriees() {
    return [...listes].sort((a, b) => a.position - b.position);
  }

  // Les objectifs d'une liste, dans l'ordre choisi par l'utilisateur.
  function objectifsDe(listeId) {
    return objectifs
      .filter((o) => o.liste_id === listeId)
      .sort((a, b) => a.position - b.position);
  }

  // ── Écritures : chaque action met à jour la base ET l'état local, pour que
  //    l'interface réagisse sans attendre un rechargement ──

  async function ajouterListe(titre) {
    const couleur = PALETTE[listes.length % PALETTE.length];
    const { data } = await supabase
      .from("listes")
      .insert({ user_id: userId, titre, couleur, position: listes.length })
      .select()
      .single();
    if (data) setListes((l) => [...l, data]);
    // Renvoyé pour l'assistant IA : il crée la liste puis y ajoute aussitôt
    // les objectifs générés, avant que `listes` n'ait eu le temps de se mettre à jour.
    return data?.id;
  }

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
    const nb = objectifsDe(listeId).length;
    const { data } = await supabase
      .from("objectifs")
      // `|| null` : le menu déroulant renvoie la chaîne vide pour « sans type »,
      // que la contrainte de la base refuserait. C'est NULL qu'elle accepte.
      .insert({ user_id: userId, liste_id: listeId, nom, type: type || null, position: nb })
      .select()
      .single();
    if (data) setObjectifs((o) => [...o, data]);
  }

  // Insertion groupée (assistant IA) : les positions sont calculées une seule
  // fois puis incrémentées localement, plutôt que d'appeler `ajouterObjectif`
  // en boucle — celui-ci relit `objectifs` à chaque appel, qui ne se met à
  // jour qu'au prochain rendu, et donnerait donc la même position à tous.
  async function ajouterPlusieursObjectifs(listeId, items) {
    const debut = objectifsDe(listeId).length;
    const lignes = items.map((it, i) => ({
      user_id: userId,
      liste_id: listeId,
      nom: it.nom,
      type: it.type || null,
      position: debut + i,
    }));
    const { data } = await supabase.from("objectifs").insert(lignes).select();
    if (data) setObjectifs((o) => [...o, ...data]);
  }

  async function renommerObjectif(id, nom) {
    setObjectifs((o) => o.map((x) => (x.id === id ? { ...x, nom } : x)));
    await supabase.from("objectifs").update({ nom }).eq("id", id);
  }

  // Archiver ≠ supprimer : l'objectif sort du tableau mais reste en base, avec
  // tout son historique. On le retrouve dans l'archive du profil.
  async function archiverObjectif(id) {
    await supabase.from("objectifs").update({ archive: true }).eq("id", id);
    setObjectifs((o) => o.filter((x) => x.id !== id));
  }

  // Cocher / décocher : logique partagée avec le panneau « À faire ».
  function basculer(objectif) {
    return basculerCompletion({ objectif, userId, completions, setCompletions });
  }

  // Déplace un objectif vers listeCibleId à l'index donné (null = à la fin).
  // Recalcule les positions des listes concernées et les persiste.
  async function deplacerObjectif(objectifId, listeCibleId, indexCible) {
    const objet = objectifs.find((o) => o.id === objectifId);
    if (!objet) return;
    const source = objet.liste_id;

    const cible = objectifsDe(listeCibleId).filter((o) => o.id !== objectifId);
    const idx = indexCible == null ? cible.length : indexCible;
    cible.splice(idx, 0, objet);

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
        supabase
          .from("objectifs")
          .update({ liste_id: o.liste_id, position: o.position })
          .eq("id", o.id),
      ),
    );
  }

  function idDepuisDrop(e) {
    return e.dataTransfer.getData("text/plain");
  }

  // Réordonne les colonnes. On distingue les deux glissements par le type de
  // données transporté : TYPE_LISTE pour une colonne, "text/plain" pour un
  // objectif — sinon déposer une colonne serait pris pour un déplacement
  // d'objectif, et inversement.
  async function deplacerListe(listeId, indexCible) {
    const ordre = listesTriees();
    const depuis = ordre.findIndex((l) => l.id === listeId);
    if (depuis === -1 || depuis === indexCible) return;

    const [deplacee] = ordre.splice(depuis, 1);
    ordre.splice(indexCible, 0, deplacee);

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
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-xl">{t.dashboard.lifeMap}</h2>
        <button
          type="button"
          onClick={() => setAssistantOuvert(true)}
          className="flex items-center gap-1.5 text-sm font-bold border border-gray-700 hover:border-teal-500 transition rounded-full px-4 py-1.5 focus:outline-none focus-visible:border-teal-500"
        >
          <span aria-hidden="true">✨</span> {t.assistantIa.bouton}
        </button>
      </div>

      {assistantOuvert && (
        <AssistantObjectif
          listes={listesTriees()}
          onAjouterListe={ajouterListe}
          onAjouterObjectifs={ajouterPlusieursObjectifs}
          onFermer={() => setAssistantOuvert(false)}
        />
      )}

      {/* Mobile : listes empilées, on fait défiler la page verticalement.
          À partir de md : colonnes côte à côte avec défilement horizontal.
          items-start (desktop) : chaque colonne garde sa hauteur propre au
          lieu de s'étirer sur celle de la plus haute. */}
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
              const id = idDepuisDrop(e);
              if (id) deplacerObjectif(id, liste.id, null);
            }}
            className={`w-full md:w-[24rem] shrink-0 bg-gray-900/60 border rounded-2xl p-5 flex flex-col gap-3 transition ${
              survolee === liste.id ? "border-teal-500" : "border-gray-800"
            }`}
          >
            {/* En-tête de liste — sert aussi de poignée pour déplacer la
                colonne. On ne rend pas toute la colonne glissable : les
                objectifs qu'elle contient le sont déjà. */}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TYPE_LISTE, liste.id);
                e.stopPropagation();
              }}
              title={t.dashboard.deplacerListe}
              className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
            >
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
              {objectifsDe(liste.id).map((objectif, index) => {
                const periodes = periodesDe(objectif.id);
                return (
                  <LigneObjectif
                    key={objectif.id}
                    objectif={objectif}
                    liste={liste}
                    t={t}
                    index={index}
                    fait={estFaitMaintenant(objectif.type, periodes)}
                    serie={calculerSerie(objectif.type, periodes)}
                    onBasculer={() => basculer(objectif)}
                    onRenommer={(nom) => renommerObjectif(objectif.id, nom)}
                    onArchiver={() => archiverObjectif(objectif.id)}
                    onDeposer={(id, position) => deplacerObjectif(id, liste.id, position)}
                  />
                );
              })}
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
