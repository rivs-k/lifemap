"use client";

import { useEffect, useRef } from "react";

const FACTEUR = 0.15;
const HAUTEUR = "130vh";

// Composant FondDunes
export default function FondDunes() {
  // Références
  const ref = useRef(null);

  // Défilement
  useEffect(() => {
    const element = ref.current;
    let enAttente = false;

    function auScroll() {
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
