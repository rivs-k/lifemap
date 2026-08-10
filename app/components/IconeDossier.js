// Icône « archiver » : dossier ouvert, au trait.
// Dessinée en SVG plutôt qu'en emoji : elle hérite de la couleur du texte
// (donc elle s'éclaircit au survol comme le reste) et reste nette à toute taille.
export default function IconeDossier({ className = "w-[18px] h-[18px]" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Dossier arrière, avec son onglet */}
      <path d="M4 19V6.5A1.5 1.5 0 0 1 5.5 5h3.6a1.5 1.5 0 0 1 1.2.6l.9 1.2h7.3A1.5 1.5 0 0 1 20 8.3v2.2" />
      {/* Rabat avant, ouvert */}
      <path d="M3.3 18.6 5.5 12a1.5 1.5 0 0 1 1.4-1h13.4a1.5 1.5 0 0 1 1.45 1.9l-1.8 6.2a1.5 1.5 0 0 1-1.45 1.1H4.8a1.5 1.5 0 0 1-1.5-1.6z" />
    </svg>
  );
}
