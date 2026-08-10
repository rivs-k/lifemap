"use client";

import { useEffect, useRef } from "react";

// L'image défile à 15 % de la vitesse du contenu : plus le facteur est bas,
// plus l'image paraît lointaine.
const FACTEUR = 0.15;

// L'image doit être plus haute que l'écran pour avoir de la marge : en montant,
// elle découvrirait sinon du vide en bas de page. 130vh couvre le déplacement
// maximal de la page la plus longue (l'accueil, ~3 écrans).
const HAUTEUR = "130vh";

export default function FondDunes() {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    let enAttente = false;

    function auScroll() {
      // L'événement scroll se déclenche bien plus souvent que les rafraîchissements
      // d'écran : on ne garde qu'un calcul par frame.
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
