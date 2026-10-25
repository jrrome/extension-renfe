import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { volverAlFormulario } from "../src/content/refresh/byNavigation.js";

function preparar(t) {
  const dom = new JSDOM('<a id="botonVolver" href="#">Volver</a>', {
    url: "https://venta.renfe.com/vol/trainFormalization.do?c=demo",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  t.after(() => dom.window.close());
  return document.getElementById("botonVolver");
}

test("una pestana oculta no demuestra que Renfe haya navegado", async (t) => {
  const enlace = preparar(t);
  enlace.onclick = (e) => e.preventDefault();
  assert.equal(document.visibilityState, "prerender");
  Object.defineProperty(document, "visibilityState", { value: "hidden" });
  assert.equal((await volverAlFormulario({ tiempoEsperaMs: 0 })).ok, false);
});

test("un cambio de fragmento tampoco cuenta como navegacion", async (t) => {
  const enlace = preparar(t);
  enlace.onclick = (e) => { e.preventDefault(); location.hash = "otra-seccion"; };
  assert.equal((await volverAlFormulario({ tiempoEsperaMs: 0 })).ok, false);
});

test("pagehide si confirma que la pagina se esta abandonando", async (t) => {
  const enlace = preparar(t);
  enlace.onclick = (e) => { e.preventDefault(); window.dispatchEvent(new window.Event("pagehide")); };
  assert.equal((await volverAlFormulario({ tiempoEsperaMs: 0 })).ok, true);
});
