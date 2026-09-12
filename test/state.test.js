import test from "node:test";
import assert from "node:assert/strict";
import { conDefectos, normalizarIntervalo, FASE } from "../src/shared/state.js";

test("un almacenamiento vacio produce un estado valido y parado", () => {
  const estado = conDefectos(undefined);
  assert.equal(estado.running, false);
  assert.equal(estado.fase, FASE.IDLE);
  assert.deepEqual(estado.targets, []);
  assert.equal(estado.settings.intervalSec, 5);
});

test("conserva lo guardado y rellena solo lo que falta", () => {
  const estado = conDefectos({ running: true, settings: { intervalSec: 12 } });
  assert.equal(estado.running, true);
  assert.equal(estado.settings.intervalSec, 12);
  assert.equal(estado.settings.maxErrorStreak, 5, "los ajustes que faltan se rellenan");
  assert.equal(estado.fase, FASE.IDLE);
});

test("el intervalo vacio o absurdo cae al minimo en vez de dejar el bucle sin pausa", () => {
  assert.equal(normalizarIntervalo(0), 2);
  assert.equal(normalizarIntervalo(""), 2);
  assert.equal(normalizarIntervalo(NaN), 2);
  assert.equal(normalizarIntervalo(undefined), 2);
  assert.equal(normalizarIntervalo(null), 2);
  assert.equal(normalizarIntervalo(-30), 2);
  assert.equal(normalizarIntervalo(1), 2);
});

test("el intervalo se corta en 60 para no pasarse del watchdog de 2 minutos", () => {
  assert.equal(normalizarIntervalo(61), 60);
  assert.equal(normalizarIntervalo(200), 60);
});

test("un intervalo razonable pasa entero y los decimales se redondean", () => {
  assert.equal(normalizarIntervalo(7), 7);
  assert.equal(normalizarIntervalo("7"), 7);
  assert.equal(normalizarIntervalo(7.4), 7);
  assert.equal(normalizarIntervalo(7.6), 8);
});
