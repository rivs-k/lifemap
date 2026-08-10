"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { textes } from "../dictionnaires";

const ContexteLangue = createContext(null);

export function LangueProvider({ children }) {
  const [langue, setLangue] = useState("fr");

  // Garde <html lang> synchronisé : les lecteurs d'écran s'en servent
  // pour choisir la bonne prononciation.
  useEffect(() => {
    document.documentElement.lang = langue;
  }, [langue]);

  const basculer = () => setLangue((actuelle) => (actuelle === "fr" ? "en" : "fr"));

  return (
    <ContexteLangue.Provider value={{ langue, basculer, t: textes[langue] }}>
      {children}
    </ContexteLangue.Provider>
  );
}

export function useLangue() {
  const contexte = useContext(ContexteLangue);
  if (!contexte) {
    throw new Error("useLangue doit être appelé à l’intérieur de <LangueProvider>");
  }
  return contexte;
}
