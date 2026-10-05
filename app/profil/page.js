"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import NavbarApp from "../components/NavbarApp";
import Archive from "../components/Archive";
import { useLangue } from "../components/LangueProvider";

const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo

export default function Profil() {
  const { t, langue } = useLangue();
  const router = useRouter();
  const refFichier = useRef(null);

  const [userId, setUserId] = useState(null);
  const [profil, setProfil] = useState(null);
  const [stats, setStats] = useState({ validations: 0, objectifs: 0 });
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/connexion");
      setUserId(user.id);

      // select("*") : la page reste fonctionnelle même si la colonne
      // avatar_url n'a pas encore été ajoutée par la migration.
      const [rp, ro, rc] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("objectifs").select("archive"),
        supabase.from("completions").select("objectif_id"),
      ]);

      const objectifs = ro.data || [];
      const completions = rc.data || [];
      const actifs = objectifs.filter((o) => !o.archive);

      setProfil({ email: user.email, ...rp.data });
      setStats({
        validations: completions.length,
        objectifs: actifs.length,
      });
      setChargement(false);
    }
    charger();
  }, [router]);

  async function changerPhoto(e) {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de re-choisir le même fichier ensuite
    if (!fichier) return;

    setErreur(null);
    if (!fichier.type.startsWith("image/")) return setErreur(t.profil.photoInvalide);
    if (fichier.size > TAILLE_MAX) return setErreur(t.profil.photoTropLourde);

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

  const cartes = [
    { libelle: t.profil.validations, valeur: stats.validations },
    { libelle: t.profil.objectifsActifs, valeur: stats.objectifs },
  ];

  return (
    <>
      <NavbarApp pseudo={profil.pseudo} avatarUrl={profil.avatar_url} />

      <main className="max-w-3xl mx-auto px-6 py-10 text-white">
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
          </div>

          <div className="min-w-0">
            <h1
              style={{ fontFamily: "var(--font-oswald)" }}
              className="text-3xl md:text-4xl font-bold text-teal-500 uppercase tracking-wide"
            >
              {profil.pseudo || t.profil.titre}
            </h1>

            <p className="mt-1 text-sm text-gray-300">{profil.email}</p>
            {membreDepuis && (
              <p className="mt-0.5 text-xs text-gray-500">
                {t.profil.membreDepuis} {membreDepuis}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/parametres"
            className="border border-gray-600 hover:border-teal-500 transition text-sm font-bold px-6 py-3 rounded-full focus:outline-none focus-visible:border-teal-500"
          >
            {t.parametres.titre}
          </Link>
          <button
            type="button"
            onClick={deconnexion}
            className="border border-gray-600 hover:border-teal-500 transition text-sm font-bold px-6 py-3 rounded-full focus:outline-none focus-visible:border-teal-500"
          >
            {t.profil.deconnexion}
          </button>
        </div>

        {erreur && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {erreur}
          </p>
        )}

        <h2 className="mt-10 font-bold text-lg">{t.profil.statistiques}</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
      </main>
    </>
  );
}
