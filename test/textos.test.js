import test from "node:test";
import assert from "node:assert/strict";
import { textoDeFase, haceCuanto } from "../src/shared/textos.js";
import { FASE } from "../src/shared/state.js";

test("las tres fases del ciclo son una sola cosa para el usuario", () => {
  for (const fase of [FASE.SCAN, FASE.WAIT, FASE.REFRESH]) {
    assert.equal(textoDeFase(fase, false), "Buscando plaza", fase);
  }
});

test("en modo debug cada fase dice su nombre tecnico", () => {
  assert.equal(textoDeFase(FASE.SCAN, true), "Comprobando trenes");
  assert.equal(textoDeFase(FASE.WAIT, true), "Esperando");
  assert.equal(textoDeFase(FASE.REFRESH, true), "Refrescando busqueda");
});

test("confirmar se simplifica pero las pausas dicen lo mismo en ambos modos", () => {
  assert.equal(textoDeFase(FASE.CONFIRM, false), "Reservando");
  assert.equal(textoDeFase(FASE.CONFIRM, true), "Confirmando reserva");

  for (const fase of [FASE.IDLE, FASE.DONE, FASE.PAUSED_ERRORS, FASE.PAUSED_CHALLENGE]) {
    assert.equal(textoDeFase(fase, false), textoDeFase(fase, true), fase);
  }
});

test("una fase desconocida se muestra tal cual en vez de desaparecer", () => {
  assert.equal(textoDeFase("RARA", false), "RARA");
});

test("haceCuanto sin sello no dice nada", () => {
  assert.equal(haceCuanto(null), "");
  assert.equal(haceCuanto(undefined), "");
  assert.equal(haceCuanto(0), "");
});

test("haceCuanto cambia de unidad al minuto y a la hora", () => {
  const ahora = 1757680000000;
  assert.equal(haceCuanto(ahora - 12_000, ahora), "hace 12 s");
  assert.equal(haceCuanto(ahora - 59_000, ahora), "hace 59 s");
  assert.equal(haceCuanto(ahora - 60_000, ahora), "hace 1 min");
  assert.equal(haceCuanto(ahora - 90_000, ahora), "hace 1 min");
  assert.equal(haceCuanto(ahora - 59 * 60_000, ahora), "hace 59 min");
  assert.equal(haceCuanto(ahora - 60 * 60_000, ahora), "hace 1 h");
  assert.equal(haceCuanto(ahora - 150 * 60_000, ahora), "hace 2 h");
});

test("un reloj que va hacia atras no produce tiempos negativos", () => {
  const ahora = 1757680000000;
  assert.equal(haceCuanto(ahora + 5000, ahora), "hace 0 s");
});
