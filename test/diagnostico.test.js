import test from "node:test";
import assert from "node:assert/strict";
import { anotar, fijarVerboso, ultimaAnotacion } from "../src/content/diagnostico.js";

function capturandoConsola(fn) {
  const original = console.log;
  const lineas = [];
  console.log = (...args) => lineas.push(args);
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lineas;
}

test("por defecto no se imprime nada en consola", () => {
  fijarVerboso(false);
  const lineas = capturandoConsola(() => anotar({ ciclo: 1 }));
  assert.equal(lineas.length, 0);
});

test("con el modo verboso encendido si se imprime", () => {
  fijarVerboso(true);
  const lineas = capturandoConsola(() => anotar({ ciclo: 2 }));
  assert.equal(lineas.length, 1);
  assert.equal(lineas[0][0], "[bot renfe]");
  fijarVerboso(false);
});

test("el registro se guarda aunque no se imprima, que es cuando mas falta hace", () => {
  fijarVerboso(false);
  capturandoConsola(() => anotar({ ciclo: 9, nota: "algo" }));
  assert.equal(ultimaAnotacion().ciclo, 9);
  assert.equal(ultimaAnotacion().nota, "algo");
});
