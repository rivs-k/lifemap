// Jauge circulaire (donut) pour une valeur unique en pourcentage.
//
// La taille vient du CSS (classe passée par l'appelant), pas d'une valeur en
// JavaScript : c'est ce qui permet de la réduire sur mobile via un point de
// rupture. Le dessin utilise un repère fixe de 100×100 que le viewBox étire.
const REPERE = 100;

export default function JaugeCirculaire({
  valeur,
  epaisseur = 10, // en % du diamètre
  couleur = "#14b8a6",
  className = "",
  children,
}) {
  const borne = Math.min(Math.max(valeur, 0), 100);
  const rayon = (REPERE - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const offset = circonference * (1 - borne / 100);

  return (
    <div className={`relative ${className}`} role="img" aria-label={`${borne} %`}>
      <svg viewBox={`0 0 ${REPERE} ${REPERE}`} className="w-full h-full -rotate-90">
        <circle
          cx={REPERE / 2}
          cy={REPERE / 2}
          r={rayon}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={epaisseur}
        />
        <circle
          cx={REPERE / 2}
          cy={REPERE / 2}
          r={rayon}
          fill="none"
          stroke={couleur}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
