import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

// el detector de repintado es el nucleo del arreglo: la version anterior daba por
// bueno cualquier cambio del tbody, incluidos los que provoca la propia extension
// al remontar los checkboxes, y por eso el bucle giraba sobre datos rancios.
async function conTabla(fixture) {
  const html = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), "utf8");
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`);
  global.document = dom.window.document;
  const mod = await import(`../src/content/refresh/inPlace.js?${Math.random()}`);
  return { doc: dom.window.document, ...mod };
}

test("tras marcar las filas, si nadie las toca no cuentan como repintadas", async () => {
  const { marcarFilas, filasReemplazadas } = await conTabla("trains-real.html");
  marcarFilas("c1");
  assert.equal(filasReemplazadas("c1"), false);
});

test("anadir un checkbox a una fila no cuenta como repintado de renfe", async () => {
  const { doc, marcarFilas, filasReemplazadas } = await conTabla("trains-real.html");
  marcarFilas("c1");

  // esto es exactamente lo que hacia montarCheckboxes y lo que enganaba al detector
  const celda = doc.querySelector('tr[id="row09132"] td');
  celda.appendChild(doc.createElement("input"));

  assert.equal(filasReemplazadas("c1"), false, "sigue siendo la misma tabla");
});

test("si renfe sustituye las filas por otras nuevas si cuenta como repintado", async () => {
  const { doc, marcarFilas, filasReemplazadas } = await conTabla("trains-real.html");
  marcarFilas("c1");

  const tbody = doc.querySelector("#listTrainsTableTbodyNEW");
  tbody.innerHTML = '<tr id="row99999"><td data-label="Salida">08.00</td></tr>';

  assert.equal(filasReemplazadas("c1"), true);
});

test("una marca de un ciclo anterior no vale para el ciclo actual", async () => {
  const { marcarFilas, filasReemplazadas } = await conTabla("trains-real.html");
  marcarFilas("c1");
  assert.equal(filasReemplazadas("c2"), true, "otra marca significa filas distintas");
});

// renfe vacia el tbody y despues lo repuebla. dar por terminado el repintado al
// verlo vacio hacia que el bucle escanease a mitad de render y encontrase 0 trenes.
test("una tabla vacia NO es un repintado terminado, es un render a medias", async () => {
  const { doc, marcarFilas, filasReemplazadas } = await conTabla("trains-real.html");
  marcarFilas("c1");
  doc.querySelector("#listTrainsTableTbodyNEW").innerHTML = "";
  assert.equal(filasReemplazadas("c1"), false, "hay que esperar a que lleguen las filas");
});

test("el repintado esta terminado cuando hay filas nuevas de verdad", async () => {
  const { doc, marcarFilas, filasReemplazadas } = await conTabla("trains-real.html");
  marcarFilas("c1");
  const tbody = doc.querySelector("#listTrainsTableTbodyNEW");

  tbody.innerHTML = "";
  assert.equal(filasReemplazadas("c1"), false, "vacio todavia no");

  tbody.innerHTML = '<tr id="row99999"><td data-label="Salida">08.00</td></tr>';
  assert.equal(filasReemplazadas("c1"), true, "con filas nuevas si");
});
