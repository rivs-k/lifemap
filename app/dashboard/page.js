"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import NavbarApp from "../components/NavbarApp";
import JaugeCirculaire from "../components/JaugeCirculaire";
import LifeMap from "../components/LifeMap";
import AFaire from "../components/AFaire";
import ChampTexte from "../components/ChampTexte";
import { useLangue } from "../components/LangueProvider";
import { periodeCourante, serieJoursComplets, estFaitMaintenant } from "../lib/periodes";
import { calculerXp, niveauDepuisXp } from "../lib/points";

function depuisCle(k) {
  const [a, m, j] = k.split("-").map(Number);
  return new Date(a, m - 1, j);
}

const formatJourCourt = (k, langue) =>
  new Intl.DateTimeFormat(langue, { weekday: "short" }).format(depuisCle(k));

const formatMoisCourt = (k, langue) =>
  new Intl.DateTimeFormat(langue, { month: "short" }).format(depuisCle(k));

// Types affichés dans la carte « objectifs terminés » + couleurs validées.
// « Sans type » ferme la liste, en gris neutre : c'est une absence d'étiquette,
// pas une cinquième catégorie qui mériterait sa propre couleur.
const TYPES_STATS = [
  { cle: "quotidien", couleur: "#0d9488" },
  { cle: "hebdomadaire", couleur: "#9085e9" },
  { cle: "mensuel", couleur: "#d55181" },
  { cle: "unique", couleur: "#c98500" },
  { cle: "sansType", couleur: "#6b7280" },
];

// Ordre d'affichage des cartes résumé, tel qu'on l'a à la première visite.
const CARTES_DEFAUT = ["journalier", "termines", "evenement", "aFaire"];

// Le type de données transporté quand on glisse une carte. Distinct de ceux de
// la Life Map : une carte lâchée sur une colonne ne doit rien déclencher.
const TYPE_CARTE = "application/x-carte";

// L'ordre des cartes est une préférence d'affichage, pas une donnée : il reste
// dans le navigateur plutôt qu'en base (aucune migration, aucune requête).
const CLE_ORDRE = "lifemap:ordre-cartes";

// On ne fait pas confiance à ce qu'on relit : le stockage survit aux mises à
// jour du code. On ne garde que les cartes connues, puis on complète avec celles
// qui manquent — une carte ajoutée plus tard apparaît donc à la fin.
function lireOrdre() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_ORDRE));
    const connues = (brut || []).filter((c) => CARTES_DEFAUT.includes(c));
    return [...new Set([...connues, ...CARTES_DEFAUT])];
  } catch {
    return CARTES_DEFAUT;
  }
}

export default function Dashboard() {
  const { t, langue } = useLangue();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [pseudo, setPseudo] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [listes, setListes] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [completions, setCompletions] = useState([]);
  // id → type de TOUS les objectifs (archivés compris) : le total « depuis le
  // début » doit inclure l'historique des objectifs sortis du tableau.
  const [typesObjectifs, setTypesObjectifs] = useState([]);
  const [prochainEvenement, setProchainEvenement] = useState(null);
  const [ordreCartes, setOrdreCartes] = useState(CARTES_DEFAUT);
  const [chargement, setChargement] = useState(true);
  // Un compte créé via Google arrive sans pseudo (contrairement à l'inscription
  // par email, où le formulaire le demande) : on bloque sur cet écran tant
  // qu'il n'en a pas choisi un.
  const [pseudoManquant, setPseudoManquant] = useState(false);
  const [enregistrementPseudo, setEnregistrementPseudo] = useState(false);

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion");
        return;
      }
      setUserId(user.id);

      const [rp, rl, ro, rc, rt, rev] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("listes").select("*").order("position"),
        supabase.from("objectifs").select("*").eq("archive", false).order("position"),
        supabase.from("completions").select("objectif_id, periode, cree_le"),
        supabase.from("objectifs").select("id, type"),
        // À venir OU encore en cours (commencé avant aujourd'hui, pas terminé).
        supabase
          .from("evenements")
          .select("*")
          .or(
            `jour.gte.${periodeCourante("quotidien")},jour_fin.gte.${periodeCourante("quotidien")}`,
          )
          .order("jour", { ascending: true })
          .order("heure_debut", { ascending: true, nullsFirst: true })
          .limit(1),
      ]);

      setPseudo(rp.data?.pseudo || user.email);
      setPseudoManquant(!rp.data?.pseudo);
      setAvatarUrl(rp.data?.avatar_url || null);
      setListes(rl.data || []);
      setObjectifs(ro.data || []);
      setCompletions(rc.data || []);
      setTypesObjectifs(rt.data || []);
      setProchainEvenement(rev.data?.[0] || null);
      // Lu ici et pas dans le useState : localStorage n'existe pas au rendu
      // serveur, et l'écran de chargement nous laisse le temps.
      setOrdreCartes(lireOrdre());
      setChargement(false);
    }
    charger();
  }, [router]);

  async function choisirPseudo(e) {
    e.preventDefault();
    const v = new FormData(e.target).get("pseudo").trim();
    if (!v) return;

    setEnregistrementPseudo(true);
    await supabase.from("profiles").update({ pseudo: v }).eq("id", userId);
    setPseudo(v);
    setPseudoManquant(false);
    setEnregistrementPseudo(false);
  }

  if (chargement) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white px-6">
        <p className="text-gray-300">{t.profil.chargement}</p>
      </main>
    );
  }

  if (pseudoManquant) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="w-full max-w-md">
          <h1
            style={{ fontFamily: "var(--font-oswald)" }}
            className="text-3xl md:text-4xl font-bold text-teal-500 uppercase tracking-wide"
          >
            {t.choixPseudo.titre}
          </h1>
          <p className="mt-3 text-gray-300">{t.choixPseudo.intro}</p>

          <form onSubmit={choisirPseudo} className="mt-8 flex flex-col gap-5 text-left">
            <ChampTexte
              id="pseudo"
              label={t.inscription.pseudo}
              type="text"
              required
              autoFocus
              placeholder={t.choixPseudo.placeholder}
            />

            <button
              type="submit"
              disabled={enregistrementPseudo}
              className="mt-2 bg-teal-700 hover:bg-teal-600 transition text-white font-bold text-lg px-10 py-4 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enregistrementPseudo ? t.auth.chargement : t.choixPseudo.bouton}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Règles de pluriel de la langue affichée (en français, 0 reste au singulier).
  const pluriel = new Intl.PluralRules(langue);

  const periodesDe = (id) =>
    completions.filter((c) => c.objectif_id === id).map((c) => c.periode);

  // ── Carte 1 : objectif journalier ──
  const quotidiens = objectifs.filter((o) => o.type === "quotidien");
  const faitsAujourdhui = quotidiens.filter((o) =>
    estFaitMaintenant("quotidien", periodesDe(o.id)),
  );
  const restantsAujourdhui = quotidiens.length - faitsAujourdhui.length;
  const pourcentageJour = quotidiens.length
    ? Math.round((100 * faitsAujourdhui.length) / quotidiens.length)
    : 0;
  // La flamme compte les journées PLEINES (tous les quotidiens validés), pas la
  // meilleure série d'un objectif isolé : à côté du « 2 faits · 5 restants »,
  // une flamme qui viendrait d'une seule habitude se lirait de travers.
  const serieComplete = serieJoursComplets(quotidiens, completions);

  // ── Carte 2 : objectifs terminés depuis le début, par type ──
  // `typesObjectifs` est figé au chargement (il couvre les objectifs archivés),
  // `objectifs` est l'état vivant : il contient ceux créés à l'instant. On fusionne
  // les deux, sinon un objectif tout juste créé ne serait pas compté.
  const typeParObjectif = new Map([
    ...typesObjectifs.map((o) => [o.id, o.type]),
    ...objectifs.map((o) => [o.id, o.type]),
  ]);
  const parType = { quotidien: 0, hebdomadaire: 0, mensuel: 0, unique: 0, sansType: 0 };
  completions.forEach((c) => {
    // `has` avant `get` : un type NULL est un objectif sans étiquette, qu'il
    // faut compter, alors qu'un id inconnu est un objectif supprimé.
    if (!typeParObjectif.has(c.objectif_id)) return;
    const ty = typeParObjectif.get(c.objectif_id) ?? "sansType";
    if (ty in parType) parType[ty] += 1;
  });
  const totalTermines = TYPES_STATS.reduce((s, { cle }) => s + parType[cle], 0);
  const maxCategorie = Math.max(1, ...TYPES_STATS.map(({ cle }) => parType[cle]));

  // Niveau affiché sur la photo de profil. `typesObjectifs` couvre aussi les
  // objectifs archivés, dont les validations comptent dans l'XP.
  const niveau = niveauDepuisXp(calculerXp(typesObjectifs, completions));

  // ── Réordonner les cartes ──
  // On déplace la carte glissée à la place de celle qu'on survole, puis on
  // enregistre. Même principe que les colonnes de la Life Map, en plus court :
  // il n'y a rien à écrire en base.
  function deplacerCarte(cle, indexCible) {
    const ordre = [...ordreCartes];
    const depuis = ordre.indexOf(cle);
    if (depuis === -1 || depuis === indexCible) return;
    ordre.splice(indexCible, 0, ordre.splice(depuis, 1)[0]);
    setOrdreCartes(ordre);
    localStorage.setItem(CLE_ORDRE, JSON.stringify(ordre));
  }

  // Le contenu de chaque carte, rangé par clé : c'est `ordreCartes` qui décide
  // de l'ordre d'affichage. `classe` = ce qui diffère d'une carte à l'autre,
  // le reste de l'habillage est commun et écrit une seule fois plus bas.
  const contenuCartes = {
    journalier: {
      classe: "flex flex-col",
      contenu: (
        <>
          <div className="flex items-center justify-between gap-1">
            <h2 className="font-bold text-[11px] md:text-sm leading-tight">
              {t.dashboard.objectifJournalier}
            </h2>
            {serieComplete >= 2 && (
              <span className="flex items-center gap-0.5 text-[11px] md:text-sm font-bold text-amber-400 shrink-0">
                <span aria-hidden="true">🔥</span>
                {serieComplete}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center py-1">
            <JaugeCirculaire
              valeur={pourcentageJour}
              className="w-11 h-11 md:w-[76px] md:h-[76px]"
            >
              <span className="text-[11px] md:text-lg font-bold">{pourcentageJour}%</span>
            </JaugeCirculaire>
          </div>

          {/* Combien de quotidiens faits aujourd'hui, et combien il en reste.
              Le singulier/pluriel suit les règles de la langue courante. */}
          <p className="text-center text-[10px] md:text-xs leading-tight tabular-nums">
            <span className="font-bold text-teal-500">{faitsAujourdhui.length}</span>{" "}
            <span className="text-gray-400">
              {t.dashboard.faits[pluriel.select(faitsAujourdhui.length)]}
            </span>
            <span className="text-gray-600"> · </span>
            <span className="font-bold text-gray-200">{restantsAujourdhui}</span>{" "}
            <span className="text-gray-400">
              {t.dashboard.restants[pluriel.select(restantsAujourdhui)]}
            </span>
          </p>

          {pourcentageJour === 100 && quotidiens.length > 0 && (
            <p
              className="text-center text-[10px] md:text-xs font-bold leading-tight mt-0.5"
              style={{ color: "#0ca30c" }}
            >
              {t.dashboard.tresBien}
            </p>
          )}
        </>
      ),
    },

    termines: {
      classe: "",
      contenu: (
        <>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <h2 className="font-bold text-[11px] md:text-sm leading-tight">
                {t.dashboard.objectifsTermines}
              </h2>
              <span className="text-[10px] md:text-xs text-gray-400">{t.dashboard.total}</span>
            </div>
            <span className="text-lg md:text-2xl font-bold shrink-0">{totalTermines}</span>
          </div>

          <ul className="mt-1.5 md:mt-2 flex flex-col gap-1 md:gap-1.5">
            {TYPES_STATS.map(({ cle, couleur }) => (
              <li key={cle} className="flex items-center gap-1.5 md:gap-3">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: couleur }}
                />
                {/* Largeur flexible : une largeur fixe débordait de la carte
                    depuis qu'elle a été rétrécie. */}
                <span className="text-[10px] md:text-sm text-gray-300 flex-1 min-w-0 truncate">
                  {t.dashboard.categories[cle]}
                </span>
                {/* Largeur fixe plutôt que flexible : la barre garde une
                    taille lisible et laisse le reste au libellé, qui doit
                    pouvoir afficher « Hebdomadaire » en entier.
                    Masquée sur mobile, où la carte est trop étroite. */}
                <span className="hidden md:block w-12 shrink-0 h-2 rounded-full bg-white/5">
                  <span
                    className="block h-2 rounded-full"
                    style={{
                      width: `${(parType[cle] / maxCategorie) * 100}%`,
                      backgroundColor: couleur,
                    }}
                  />
                </span>
                <span className="text-[10px] md:text-sm font-bold text-right tabular-nums shrink-0">
                  {parType[cle]}
                </span>
              </li>
            ))}
          </ul>
        </>
      ),
    },

    evenement: {
      classe: "",
      contenu: (
        <>
          <h2 className="font-bold text-[11px] md:text-sm leading-tight">
            {t.dashboard.prochainEvenement}
          </h2>

          {prochainEvenement ? (
            <div className="mt-1.5 md:mt-4 flex flex-col md:flex-row md:items-center gap-0.5 md:gap-3">
              {/* Mobile : la date tient sur une ligne. Le pavé sur trois
                  lignes coûtait à lui seul le tiers de la hauteur. */}
              <div className="md:hidden text-[10px] font-bold uppercase text-teal-500 leading-tight">
                {formatJourCourt(prochainEvenement.jour, langue)}{" "}
                {Number(prochainEvenement.jour.slice(8, 10))}{" "}
                {formatMoisCourt(prochainEvenement.jour, langue)}
              </div>

              <div className="hidden md:block bg-white/5 rounded-xl px-3 py-2 text-center shrink-0">
                <div className="text-xs text-gray-400 uppercase leading-tight">
                  {formatJourCourt(prochainEvenement.jour, langue)}
                </div>
                <div className="text-2xl font-bold leading-tight">
                  {Number(prochainEvenement.jour.slice(8, 10))}
                </div>
                <div className="text-xs text-gray-400 uppercase leading-tight">
                  {formatMoisCourt(prochainEvenement.jour, langue)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-[11px] md:text-base truncate">
                  {prochainEvenement.titre}
                </div>
                {prochainEvenement.jour_fin &&
                  prochainEvenement.jour_fin !== prochainEvenement.jour && (
                    <div className="text-xs text-teal-500 mt-0.5">
                      →{" "}
                      {new Intl.DateTimeFormat(langue, {
                        day: "numeric",
                        month: "short",
                      }).format(depuisCle(prochainEvenement.jour_fin))}
                    </div>
                  )}
                <div className="text-[10px] md:text-sm text-gray-400 mt-0.5 md:mt-1">
                  {prochainEvenement.heure_debut || prochainEvenement.heure_fin
                    ? [prochainEvenement.heure_debut, prochainEvenement.heure_fin]
                        .filter(Boolean)
                        .map((h) => h.slice(0, 5))
                        .join(" - ")
                    : t.agenda.touteLaJournee}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 md:py-8 text-[10px] md:text-sm text-gray-500 text-center">
              {t.dashboard.aucunEvenement}
            </div>
          )}
        </>
      ),
    },
  };

  return (
    <>
      <NavbarApp pseudo={pseudo} avatarUrl={avatarUrl} niveau={niveau} />

      <main className="max-w-[120rem] mx-auto px-[19px] md:px-[88px] py-10 text-white">
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-3xl md:text-4xl font-bold"
        >
          {t.dashboard.bonjour}, {pseudo}
        </h1>
        <p className="mt-2 text-gray-400">{t.dashboard.sousTitre}</p>

        {/* Bandeau du haut : les cartes résumé et le panneau « à faire ».
            L'ordre des quatre est libre, il est porté par la propriété CSS
            `order` — l'ordre du HTML, lui, ne bouge pas. */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 md:items-stretch">
          {/* Mobile : rangée des trois cartes qui défile horizontalement, le
              panneau « à faire » restant en dessous (d'où le -order-1).
              À partir de md : `contents` efface cette boîte, les cartes
              deviennent des éléments de la rangée du dessus — c'est ce qui
              permet à « à faire » de se glisser entre elles. */}
          {/* À partir de md, les trois cartes font toutes un cinquième de la
              rangée : largeur identique, un cran au-dessus de ce que réclame
              leur contenu. Elles ne s'étirent pas pour remplir la rangée. */}
          <div className="flex md:contents -order-1 gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 defilement-listes">
            {/* Chaque carte est glissable et sert aussi de cible : on la lâche
                sur une autre pour prendre sa place. */}
            {ordreCartes.map((cle, index) =>
              cle === "aFaire" ? null : (
                <section
                  key={cle}
                  draggable
                  style={{ order: index }}
                  onDragStart={(e) => e.dataTransfer.setData(TYPE_CARTE, cle)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const glissee = e.dataTransfer.getData(TYPE_CARTE);
                    if (glissee) deplacerCarte(glissee, index);
                  }}
                  title={t.dashboard.deplacerCarte}
                  className={`w-[40vw] shrink-0 md:w-auto md:basis-[20%] md:grow-0 md:shrink-0 md:min-w-0 bg-gray-900/60 border border-gray-800 rounded-2xl p-2 md:p-3 cursor-grab active:cursor-grabbing ${contenuCartes[cle].classe}`}
                >
                  {contenuCartes[cle].contenu}
                </section>
              ),
            )}
          </div>

          {/* Panneau « à faire ». Largeur fixée à 20 % de la rangée (il en
              prenait 40) ; les trois cartes se partagent ce qui reste.
              Ici on n'installe que la cible du dépôt : c'est l'en-tête du
              panneau, à l'intérieur, qui sert de poignée. */}
          <div
            style={{ order: ordreCartes.indexOf("aFaire") }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const glissee = e.dataTransfer.getData(TYPE_CARTE);
              if (glissee) deplacerCarte(glissee, ordreCartes.indexOf("aFaire"));
            }}
            className="md:basis-[20%] md:grow-0 md:shrink-0 md:min-w-0"
          >
            <AFaire
              userId={userId}
              objectifs={objectifs}
              completions={completions}
              setCompletions={setCompletions}
              poignee={{
                draggable: true,
                title: t.dashboard.deplacerCarte,
                onDragStart: (e) => e.dataTransfer.setData(TYPE_CARTE, "aFaire"),
              }}
            />
          </div>
        </div>

        <LifeMap
          userId={userId}
          listes={listes}
          objectifs={objectifs}
          completions={completions}
          setListes={setListes}
          setObjectifs={setObjectifs}
          setCompletions={setCompletions}
        />
      </main>
    </>
  );
}
