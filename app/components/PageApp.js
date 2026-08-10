"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";
import NavbarApp from "./NavbarApp";
import { calculerXp, niveauDepuisXp } from "../lib/points";

// Coquille commune aux pages de l'app connectée (Agenda, Explorer).
// Elle regroupe ce que ces pages partageaient mot pour mot :
//   1. la garde d'authentification (rediriger vers /connexion si non connecté) ;
//   2. le chargement des infos affichées par la navbar (pseudo, avatar, badge) ;
//   3. la mise en page (navbar + titre + conteneur).
// Le contenu propre à chaque page est fourni via une fonction enfant qui
// reçoit l'identifiant de l'utilisateur :  <PageApp titre="…">{(userId) => …}</PageApp>
export default function PageApp({ titre, children }) {
  const { t } = useLangue();
  const router = useRouter();
  // `null` tant que rien n'est chargé — sert aussi d'indicateur de chargement.
  const [donnees, setDonnees] = useState(null);

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion");
        return;
      }

      // Objectifs archivés compris : leurs validations comptent dans l'XP.
      const [rp, ro, rc] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("objectifs").select("id, type"),
        supabase.from("completions").select("objectif_id, periode"),
      ]);

      setDonnees({
        userId: user.id,
        pseudo: rp.data?.pseudo || user.email,
        avatarUrl: rp.data?.avatar_url || null,
        niveau: niveauDepuisXp(calculerXp(ro.data || [], rc.data || [])),
      });
    }
    charger();
  }, [router]);

  if (!donnees) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white px-6">
        <p className="text-gray-300">{t.profil.chargement}</p>
      </main>
    );
  }

  return (
    <>
      <NavbarApp
        pseudo={donnees.pseudo}
        avatarUrl={donnees.avatarUrl}
        niveau={donnees.niveau}
      />

      <main className="max-w-[120rem] mx-auto px-[19px] md:px-[88px] py-10 text-white">
        <h1
          style={{ fontFamily: "var(--font-oswald)" }}
          className="text-3xl md:text-4xl font-bold mb-8"
        >
          {titre}
        </h1>

        {children(donnees.userId)}
      </main>
    </>
  );
}
