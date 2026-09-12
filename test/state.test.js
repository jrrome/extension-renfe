import test from "node:test";
import assert from "node:assert/strict";
import { conDefectos, FASE } from "../src/shared/state.js";

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
