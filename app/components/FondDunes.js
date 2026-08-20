"use client";

import { useEffect, useRef } from "react";

// L'image défile à 15 % de la vitesse du contenu : plus bas = plus lointain.
const FACTEUR = 0.15;
// Plus haute que l'écran pour ne pas découvrir de vide en montant (page la plus longue : l'accueil).
const HAUTEUR = "130vh";

export default function FondDunes() {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    let enAttente = false;

    function auScroll() {
      // Un seul calcul par frame (scroll se déclenche bien plus souvent).
      if (enAttente) return;
      enAttente = true;
      requestAnimationFrame(() => {
        element.style.transform = `translate3d(0, ${-window.scrollY * FACTEUR}px, 0)`;
        enAttente = false;
      });
    }

    auScroll();
    window.addEventListener("scroll", auScroll, { passive: true });
    return () => window.removeEventListener("scroll", auScroll);
  }, []);

  return (
    <div
      ref={ref}
      style={{ backgroundImage: "url('/dune-bg.jpg')", height: HAUTEUR }}
      className="fixed top-0 left-0 w-full bg-cover bg-center opacity-60 will-change-transform"
    />
  );
}
