import { test } from "node:test";
import assert from "node:assert/strict";
import {
  XP_BASE,
  multiplicateurSerie,
  seuilNiveau,
  niveauDepuisXp,
  calculerXp,
  progressionNiveau,
} from "./points.js";

test("multiplicateurSerie - paliers", () => {
  assert.equal(multiplicateurSerie(1), 1);
  assert.equal(multiplicateurSerie(2), 1.2);
  assert.equal(multiplicateurSerie(6), 1.2);
  assert.equal(multiplicateurSerie(7), 1.5);
  assert.equal(multiplicateurSerie(29), 1.5);
  assert.equal(multiplicateurSerie(30), 2);
  assert.equal(multiplicateurSerie(100), 2);
});

test("seuilNiveau - écart de 50 par palier", () => {
  assert.equal(seuilNiveau(1), 0);
  assert.equal(seuilNiveau(2), 50);
  assert.equal(seuilNiveau(3), 150);
  assert.equal(seuilNiveau(4), 300);
});

test("niveauDepuisXp - correspond aux seuils de seuilNiveau", () => {
  assert.equal(niveauDepuisXp(0), 1);
  assert.equal(niveauDepuisXp(49), 1);
  assert.equal(niveauDepuisXp(50), 2);
  assert.equal(niveauDepuisXp(149), 2);
  assert.equal(niveauDepuisXp(150), 3);
  assert.equal(niveauDepuisXp(299), 3);
  assert.equal(niveauDepuisXp(300), 4);
});

test("calculerXp - une seule validation, pas de bonus", () => {
  const objectifs = [{ id: "a", type: "quotidien" }];
  const completions = [{ objectif_id: "a", periode: "2026-07-27" }];
  assert.equal(calculerXp(objectifs, completions), 10);
});

test("calculerXp - le bonus de série progresse avec les périodes consécutives", () => {
  const objectifs = [{ id: "a", type: "quotidien" }];
  const completions = [
    { objectif_id: "a", periode: "2026-07-25" },
    { objectif_id: "a", periode: "2026-07-26" },
    { objectif_id: "a", periode: "2026-07-27" },
  ];
  // série 1 → x1 (10), série 2 → x1,2 (12), série 3 → x1,2 (12)
  assert.equal(calculerXp(objectifs, completions), 10 + 12 + 12);
});

test("calculerXp - un trou dans les périodes relance la série à 1", () => {
  const objectifs = [{ id: "a", type: "quotidien" }];
  const completions = [
    { objectif_id: "a", periode: "2026-07-01" },
    { objectif_id: "a", periode: "2026-07-27" },
  ];
  assert.equal(calculerXp(objectifs, completions), 10 + 10);
});

test("calculerXp - un objectif ponctuel n'a jamais de bonus de série", () => {
  const objectifs = [{ id: "a", type: "unique" }];
  const completions = [{ objectif_id: "a", periode: "2026-07-27" }];
  assert.equal(calculerXp(objectifs, completions), 10);
});

test("calculerXp - ignore les validations d'objectifs supprimés", () => {
  const objectifs = [{ id: "a", type: "quotidien" }];
  const completions = [{ objectif_id: "supprime", periode: "2026-07-27" }];
  assert.equal(calculerXp(objectifs, completions), 0);
});

test("calculerXp - un objectif sans type compte comme sansType", () => {
  const objectifs = [{ id: "a", type: null }];
  const completions = [{ objectif_id: "a", periode: "2026-07-27" }];
  assert.equal(calculerXp(objectifs, completions), XP_BASE.sansType);
});

test("progressionNiveau - position dans le niveau courant", () => {
  const p = progressionNiveau(75); // niveau 2 (50-150)
  assert.equal(p.niveau, 2);
  assert.equal(p.xpDansNiveau, 25);
  assert.equal(p.xpRequis, 100);
  assert.equal(p.pourcentage, 25);
});
