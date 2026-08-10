import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estPonctuel,
  periodeCourante,
  periodePrecedente,
  calculerSerie,
  serieJoursComplets,
  estFaitMaintenant,
} from "./periodes.js";

test("estPonctuel", () => {
  assert.equal(estPonctuel("unique"), true);
  assert.equal(estPonctuel(null), true);
  assert.equal(estPonctuel(undefined), true);
  assert.equal(estPonctuel("quotidien"), false);
  assert.equal(estPonctuel("hebdomadaire"), false);
  assert.equal(estPonctuel("mensuel"), false);
});

test("periodeCourante - quotidien", () => {
  assert.equal(periodeCourante("quotidien", new Date(2026, 6, 27)), "2026-07-27");
});

test("periodeCourante - hebdomadaire (lundi ouvrant la semaine)", () => {
  // 2026-07-27 est un lundi
  assert.equal(periodeCourante("hebdomadaire", new Date(2026, 6, 27)), "2026-07-27");
  // 2026-07-31 est un vendredi de la même semaine
  assert.equal(periodeCourante("hebdomadaire", new Date(2026, 6, 31)), "2026-07-27");
  // 2026-08-02 est un dimanche : encore la semaine du 27, pas celle du 3 août
  assert.equal(periodeCourante("hebdomadaire", new Date(2026, 7, 2)), "2026-07-27");
});

test("periodeCourante - mensuel", () => {
  assert.equal(periodeCourante("mensuel", new Date(2026, 6, 27)), "2026-07-01");
});

test("periodePrecedente", () => {
  assert.equal(periodePrecedente("quotidien", "2026-07-27"), "2026-07-26");
  assert.equal(periodePrecedente("hebdomadaire", "2026-07-27"), "2026-07-20");
  assert.equal(periodePrecedente("mensuel", "2026-07-01"), "2026-06-01");
  assert.equal(periodePrecedente("mensuel", "2026-01-01"), "2025-12-01");
});

test("calculerSerie - un objectif ponctuel n'a jamais de série", () => {
  assert.equal(calculerSerie("unique", ["2026-07-27"]), 0);
});

test("calculerSerie - périodes consécutives se terminant aujourd'hui", () => {
  const aujourdhui = new Date(2026, 6, 27);
  const periodes = ["2026-07-25", "2026-07-26", "2026-07-27"];
  assert.equal(calculerSerie("quotidien", periodes, aujourdhui), 3);
});

test("calculerSerie - tolère que la période courante ne soit pas encore faite", () => {
  const aujourdhui = new Date(2026, 6, 27);
  const periodes = ["2026-07-25", "2026-07-26"]; // rien fait aujourd'hui
  assert.equal(calculerSerie("quotidien", periodes, aujourdhui), 2);
});

test("calculerSerie - un trou casse la série", () => {
  const aujourdhui = new Date(2026, 6, 27);
  const periodes = ["2026-07-20", "2026-07-26", "2026-07-27"];
  assert.equal(calculerSerie("quotidien", periodes, aujourdhui), 2);
});

test("calculerSerie - 0 si rien de récent", () => {
  const aujourdhui = new Date(2026, 6, 27);
  assert.equal(calculerSerie("quotidien", ["2026-07-01"], aujourdhui), 0);
});

test("serieJoursComplets - jours pleins consécutifs", () => {
  const aujourdhui = new Date(2026, 6, 27);
  const objectifs = [
    { id: "a", cree_le: "2026-07-01" },
    { id: "b", cree_le: "2026-07-01" },
  ];
  const completions = [
    { objectif_id: "a", periode: "2026-07-26" },
    { objectif_id: "b", periode: "2026-07-26" },
    { objectif_id: "a", periode: "2026-07-27" },
    { objectif_id: "b", periode: "2026-07-27" },
  ];
  assert.equal(serieJoursComplets(objectifs, completions, aujourdhui), 2);
});

test("serieJoursComplets - un objectif non validé casse le jour", () => {
  const aujourdhui = new Date(2026, 6, 27);
  const objectifs = [
    { id: "a", cree_le: "2026-07-01" },
    { id: "b", cree_le: "2026-07-01" },
  ];
  const completions = [{ objectif_id: "a", periode: "2026-07-27" }];
  assert.equal(serieJoursComplets(objectifs, completions, aujourdhui), 0);
});

test("serieJoursComplets - un objectif créé aujourd'hui ne casse pas les jours passés", () => {
  const aujourdhui = new Date(2026, 6, 27);
  const objectifs = [
    { id: "a", cree_le: "2026-07-01" },
    { id: "b", cree_le: "2026-07-27" },
  ];
  const completions = [
    { objectif_id: "a", periode: "2026-07-26" },
    { objectif_id: "a", periode: "2026-07-27" },
    { objectif_id: "b", periode: "2026-07-27" },
  ];
  assert.equal(serieJoursComplets(objectifs, completions, aujourdhui), 2);
});

test("serieJoursComplets - aucun objectif", () => {
  assert.equal(serieJoursComplets([], []), 0);
});

test("estFaitMaintenant - ponctuel", () => {
  assert.equal(estFaitMaintenant("unique", []), false);
  assert.equal(estFaitMaintenant("unique", ["2026-01-01"]), true);
});

test("estFaitMaintenant - récurrent", () => {
  const aujourdhui = new Date(2026, 6, 27);
  assert.equal(estFaitMaintenant("quotidien", ["2026-07-27"], aujourdhui), true);
  assert.equal(estFaitMaintenant("quotidien", ["2026-07-26"], aujourdhui), false);
});
