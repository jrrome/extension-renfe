import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

// caracterizacion de checkboxes.js contra el html real de renfe. escrito despues
// de la implementacion, sirve de red de seguridad frente a cambios de la tabla.
async function conDocumento() {
  const html = readFileSync(new URL("./fixtures/trains-real.html", import.meta.url), "utf8");
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  const mod = await import(`../src/content/checkboxes.js?${Math.random()}`);
  return { doc: dom.window.document, ...mod };
}

test("inyecta un checkbox en cada una de las 18 filas de tren", async () => {
  const { doc, montarCheckboxes } = await conDocumento();
  montarCheckboxes([], () => {});
  assert.equal(doc.querySelectorAll(".renfebot-check").length, 18);
});

test("no duplica checkboxes si se monta dos veces", async () => {
  const { doc, montarCheckboxes } = await conDocumento();
  montarCheckboxes([], () => {});
  montarCheckboxes([], () => {});
  assert.equal(doc.querySelectorAll(".renfebot-check").length, 18);
});

test("marca los checkboxes de los trenes ya vigilados", async () => {
  const { doc, montarCheckboxes } = await conDocumento();
  montarCheckboxes([{ numtren: "09132", salida: "14.53" }], () => {});
  const fila = doc.querySelector('tr[id="row09132"] .renfebot-check');
  assert.equal(fila.checked, true);
  assert.equal(doc.querySelector('tr[id="row12528"] .renfebot-check').checked, false);
});

test("al marcar informa del numero de tren y su hora de salida", async () => {
  const { doc, montarCheckboxes } = await conDocumento();
  const avisos = [];
  montarCheckboxes([], (numtren, salida, marcado) => avisos.push({ numtren, salida, marcado }));

  const caja = doc.querySelector('tr[id="row09140"] .renfebot-check');
  caja.checked = true;
  caja.dispatchEvent(new doc.defaultView.Event("change"));

  assert.deepEqual(avisos, [{ numtren: "09140", salida: "15.07", marcado: true }]);
});

test("sincronizar refleja la lista de vigilados sin volver a montar", async () => {
  const { doc, montarCheckboxes, sincronizarCheckboxes } = await conDocumento();
  montarCheckboxes([], () => {});
  sincronizarCheckboxes([{ numtren: "34345", salida: "16.10" }]);
  assert.equal(doc.querySelector('tr[id="row34345"] .renfebot-check').checked, true);
});
