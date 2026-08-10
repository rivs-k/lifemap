// Petit rond affichant le niveau, à cheval sur le bord bas de la photo de profil.
// À placer dans un parent en `relative`.
//
// Positionnement : `bottom-0` colle le bas de la pastille au bas de la photo,
// puis `translate-y-1/2` la descend de la moitié de sa hauteur — son centre
// tombe donc exactement sur le bord de la photo, quelle que soit sa taille.
//
// `taille` : "petite" pour la barre de nav, "grande" pour la page profil.
export default function PastilleNiveau({ niveau, libelle, taille = "petite" }) {
  const petite = taille === "petite";

  return (
    <span
      aria-label={`${libelle} ${niveau}`}
      title={`${libelle} ${niveau}`}
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center justify-center rounded-full bg-teal-600 text-white font-bold tabular-nums border border-black/50 ${
        petite ? "min-w-[16px] h-4 px-1 text-[9px]" : "min-w-[26px] h-6 px-1.5 text-xs"
      }`}
    >
      {niveau}
    </span>
  );
}
