"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useLangue } from "./LangueProvider";
import NavbarApp from "./NavbarApp";

// Coquille commune aux pages connectées (Agenda, Explorer) : garde d'auth,
// chargement des infos de la navbar (pseudo, avatar) et mise en page. Le
// contenu est une fonction enfant recevant l'userId :
//   <PageApp titre="…">{(userId) => …}</PageApp>
export default function PageApp({ titre, children }) {
  const { t } = useLangue();
  const router = useRouter();
  // `null` tant que rien n'est chargé — sert aussi d'indicateur de chargement.
  const [donnees, setDonnees] = useState(null);

  useEffect(() => {
    async function charger() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/connexion");

      const rp = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setDonnees({
        userId: user.id,
        pseudo: rp.data?.pseudo || user.email,
        avatarUrl: rp.data?.avatar_url || null,
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
      <NavbarApp pseudo={donnees.pseudo} avatarUrl={donnees.avatarUrl} />

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
