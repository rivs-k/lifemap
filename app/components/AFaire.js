"use client";

import { useLangue } from "./LangueProvider";
import { estFaitMaintenant } from "../lib/periodes";
import { basculerCompletion } from "../lib/completions";

// Le quotidien passe en premier (à faire aujourd'hui), les objectifs sans type
// ferment la marche. `?? 4` : sans type, en dernier.
const ORDRE_TYPES = { quotidien: 0, hebdomadaire: 1, mensuel: 2, unique: 3 };
const rang = (type) => ORDRE_TYPES[type] ?? 4;

// Panneau « À faire aujourd'hui » : objectifs non validés pour leur période,
// cochables depuis le dashboard ; partage l'état (objectifs, completions) avec
// la Life Map. `poignee` : attributs de drag posés sur l'en-tête seul (pas le
// panneau, qui contient cases à cocher et liste défilante).
export default function AFaire({ userId, objectifs, completions, setCompletions, poignee }) {
  const { t } = useLangue();

  const periodesDe = (id) =>
    completions.filter((c) => c.objectif_id === id).map((c) => c.periode);

  const restants = objectifs
    .filter((o) => !estFaitMaintenant(o.type, periodesDe(o.id)))
    .sort((a, b) => rang(a.type) - rang(b.type));

  return (
    <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-3 flex flex-col min-h-0">
      <div
        {...poignee}
        className="flex items-baseline justify-between gap-2 cursor-grab active:cursor-grabbing"
      >
        <h2 className="font-bold text-sm">{t.dashboard.aFaire}</h2>
        {restants.length > 0 && (
          <span className="text-xs text-gray-400 tabular-nums shrink-0">
            {restants.length}
          </span>
        )}
      </div>

      {objectifs.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">{t.dashboard.aucunObjectif}</p>
      ) : restants.length === 0 ? (
        <p className="mt-3 text-xs font-bold" style={{ color: "#0ca30c" }}>
          {t.dashboard.toutFait}
        </p>
      ) : (
        // Hauteur plafonnée + défilement : sinon une longue liste étirerait la rangée.
        <ul className="mt-2 flex flex-col gap-1.5 max-h-[7.5rem] overflow-y-auto defilement-listes pr-1">
          {restants.map((objectif) => (
            <li key={objectif.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  basculerCompletion({ objectif, userId, completions, setCompletions })
                }
                aria-label={objectif.nom}
                className="w-4 h-4 shrink-0 rounded-full border border-gray-600 hover:border-teal-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              />

              {objectif.emoji && (
                <span aria-hidden="true" className="text-xs shrink-0">
                  {objectif.emoji}
                </span>
              )}

              <span className="text-xs flex-1 min-w-0 truncate">{objectif.nom}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
