"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { textes } from "../dictionnaires";

const ContexteLangue = createContext(null);

// Composant LangueProvider
export function LangueProvider({ children }) {
  const [langue, setLangue] = useState("fr");

  // Langue page
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

// Hook langue
export const useLangue = () => useContext(ContexteLangue);
