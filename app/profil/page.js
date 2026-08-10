"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import NavbarApp from "../components/NavbarApp";
import Archive from "../components/Archive";
import PastilleNiveau from "../components/PastilleNiveau";
import { useLangue } from "../components/LangueProvider";
import { calculerSerie } from "../lib/periodes";
import { calculerXp, progressionNiveau } from "../lib/points";

const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo

export default function Profil() {
  const { t, langue } = useLangue();
  const router = useRouter();
  const refFichier = useRef(null);

  const [userId, setUserId] = useState(null);
  const [profil, setProfil] = useState(null);
  const [stats, setStats] = useState({
    validations: 0,
    meilleureSerie: 0,
    objectifs: 0,
    xp: 0,
  });
  const [editionPseudo, setEditionPseudo] = useState(false);
  const [pseudoSaisi, setPseudoSaisi] = useState("");
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

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

      // select("*") : la page reste fonctionnelle même si la colonne
      // avatar_url n'a pas encore été ajoutée par la migration.
      const [rp, ro, rc] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        // Tous les objectifs, archivés compris : leurs validations ont été
        // gagnées, elles comptent donc dans l'XP.
        supabase.from("objectifs").select("id, type, archive"),
        supabase.from("completions").select("objectif_id, periode"),
      ]);

      const objectifs = ro.data || [];
      const actifs = objectifs.filter((o) => !o.archive);
      const completions = rc.data || [];
      const periodesDe = (id) =>
        completions.filter((c) => c.objectif_id === id).map((c) => c.periode);

      setProfil({ email: user.email, ...rp.data });
      setStats({
        validations: completions.length,
        objectifs: actifs.length,
        meilleureSerie: actifs.reduce(
          (max, o) => Math.max(max, calculerSerie(o.type, periodesDe(o.id))),
          0,
        ),
        xp: calculerXp(objectifs, completions),
      });
      setChargement(false);
    }
    charger();
  }, [router]);

  async function enregistrerPseudo() {
    const v = pseudoSaisi.trim();
    setEditionPseudo(false);
    if (!v || v === profil.pseudo) return;
    setProfil((p) => ({ ...p, pseudo: v }));
    await supabase.from("profiles").update({ pseudo: v }).eq("id", userId);
  }

  async function changerPhoto(e) {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de re-choisir le même fichier ensuite
    if (!fichier) return;

    setErreur(null);
    if (!fichier.type.startsWith("image/")) {
      setErreur(t.profil.photoInvalide);
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      setErreur(t.profil.photoTropLourde);
      return;
    }

    setEnvoiPhoto(true);
    const extension = (fichier.name.split(".").pop() || "png").toLowerCase();
    // Le premier segment du chemin doit être l'id : c'est ce que vérifie la
    // règle de sécurité du bucket.
    const chemin = `${userId}/avatar.${extension}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(chemin, fichier, { upsert: true, contentType: fichier.type });

    if (error) {
      setErreur(error.message);
      setEnvoiPhoto(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(chemin);
    // Le chemin ne change pas d'un envoi à l'autre : sans ce paramètre, le
    // navigateur continuerait d'afficher l'ancienne image en cache.
    const url = `${data.publicUrl}?v=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setProfil((p) => ({ ...p, avatar_url: url }));
    setEnvoiPhoto(false);
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  if (chargement) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white px-6">
        <p className="text-gray-300">{t.profil.chargement}</p>
      </main>
    );
  }

  const initiale = (profil.pseudo || profil.email || "?").charAt(0).toUpperCase();
  const membreDepuis = profil.cree_le
    ? new Intl.DateTimeFormat(langue, { month: "long", year: "numeric" }).format(
        new Date(profil.cree_le),
      )
    : null;

  // Niveau et XP sont calculés depuis l'historique, pas lus en base : décocher
  // un objectif retire donc ses points automatiquement.
  const progression = progressionNiveau(stats.xp);

  const cartes = [
    { libelle: t.profil.niveau, valeur: progression.niveau },
    { libelle: t.profil.xp, valeur: stats.xp },
    { libelle: t.profil.validations, valeur: stats.validations },
    { libelle: t.profil.meilleureSerie, valeur: stats.meilleureSerie },
    { libelle: t.profil.objectifsActifs, valeur: stats.objectifs },
  ];

  return (
    <>
      <NavbarApp
        pseudo={profil.pseudo}
        avatarUrl={profil.avatar_url}
        niveau={progression.niveau}
      />

      <main className="max-w-3xl mx-auto px-6 py-10 text-white">
        {/* En-tête : photo + identité */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative">
            {profil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- image distante (Supabase Storage) : next/image imposerait de déclarer le domaine
              <img
                src={profil.avatar_url}
                alt=""
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-24 h-24 rounded-full bg-teal-700 flex items-center justify-center text-3xl font-bold"
              >
                {initiale}
              </div>
            )}

            <button
              type="button"
              onClick={() => refFichier.current?.click()}
              disabled={envoiPhoto}
              className="absolute -bottom-1 -right-3 bg-gray-900 border border-gray-600 hover:border-teal-500 transition rounded-full w-9 h-9 flex items-center justify-center text-sm disabled:opacity-50 focus:outline-none focus-visible:border-teal-500"
              aria-label={t.profil.changerPhoto}
              title={t.profil.changerPhoto}
            >
              {envoiPhoto ? "…" : "📷"}
            </button>

            <input
              ref={refFichier}
              type="file"
              accept="image/*"
              onChange={changerPhoto}
              className="hidden"
            />

            <PastilleNiveau
              niveau={progression.niveau}
              libelle={t.profil.niveau}
              taille="grande"
            />
          </div>

          <div className="min-w-0">
            {editionPseudo ? (
              <input
                autoFocus
                value={pseudoSaisi}
                onChange={(e) => setPseudoSaisi(e.target.value)}
                onBlur={enregistrerPseudo}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enregistrerPseudo();
                  if (e.key === "Escape") setEditionPseudo(false);
                }}
                className="bg-black/40 border border-gray-700 rounded-lg px-3 py-1 text-2xl font-bold text-white focus:outline-none focus:border-teal-500"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPseudoSaisi(profil.pseudo || "");
                  setEditionPseudo(true);
                }}
                title={t.dashboard.renommer}
                style={{ fontFamily: "var(--font-oswald)" }}
                className="text-3xl md:text-4xl font-bold text-teal-500 uppercase tracking-wide text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                {profil.pseudo || t.profil.titre}
              </button>
            )}

            <p className="mt-1 text-sm text-gray-300">{profil.email}</p>
            {membreDepuis && (
              <p className="mt-0.5 text-xs text-gray-500">
                {t.profil.membreDepuis} {membreDepuis}
              </p>
            )}
          </div>
        </div>

        {erreur && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {erreur}
          </p>
        )}

        {/* Progression vers le niveau suivant */}
        <div className="mt-8">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold">
              {t.profil.niveau} {progression.niveau}
            </span>
            <span className="text-gray-400 tabular-nums">
              {progression.xpDansNiveau} / {progression.xpRequis} {t.profil.xp}
            </span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-white/5">
            <div
              className="h-2.5 rounded-full bg-teal-600 transition-all"
              style={{ width: `${progression.pourcentage}%` }}
            />
          </div>
        </div>

        {/* Statistiques */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cartes.map(({ libelle, valeur }) => (
            <div
              key={libelle}
              className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 text-center"
            >
              <div className="text-teal-500 text-2xl font-bold tabular-nums">{valeur}</div>
              <div className="text-gray-400 text-xs mt-1">{libelle}</div>
            </div>
          ))}
        </div>

        <Archive />

        <button
          type="button"
          onClick={deconnexion}
          className="mt-12 border border-gray-600 hover:border-teal-500 transition text-sm font-bold px-6 py-3 rounded-full focus:outline-none focus-visible:border-teal-500"
        >
          {t.profil.deconnexion}
        </button>
      </main>
    </>
  );
}
