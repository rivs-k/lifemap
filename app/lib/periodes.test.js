import { test } from "node:test";
import assert from "node:assert/strict";
import { estPonctuel, periodeCourante, estFaitMaintenant } from "./periodes.js";

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

test("estFaitMaintenant - ponctuel", () => {
  assert.equal(estFaitMaintenant("unique", []), false);
  assert.equal(estFaitMaintenant("unique", ["2026-01-01"]), true);
});

test("estFaitMaintenant - récurrent", () => {
  const aujourdhui = new Date(2026, 6, 27);
  assert.equal(estFaitMaintenant("quotidien", ["2026-07-27"], aujourdhui), true);
  assert.equal(estFaitMaintenant("quotidien", ["2026-07-26"], aujourdhui), false);
});
