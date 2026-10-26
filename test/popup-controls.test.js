import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { estadoInicial, FASE } from "../src/shared/state.js";

let instancia = 0;
async function preparar(t, { pestanas = [], trenes = [{ numtren: "09132", salida: "14.53" }], running = true } = {}) {
  const dom = new JSDOM(readFileSync(new URL("../src/popup/popup.html", import.meta.url), "utf8"));
  t.after(() => dom.window.close());
  globalThis.document = dom.window.document;
  let estado = { ...estadoInicial(), running, fase: running ? FASE.WAIT : FASE.IDLE,
    reservando: running ? { numtren: "09132" } : null,
    settings: { ...estadoInicial().settings, debug: true },
    targets: [{ id: "actual", fecha: "26/10/2026", trenes }], activeTargetId: "actual" };
  const listeners = [];
  const llamadas = [];
  let siguienteEscritura;
  globalThis.chrome = {
    storage: {
      local: {
        async get() { return { estado: structuredClone(estado) }; },
        async set(datos) {
          estado = structuredClone(datos.estado);
          listeners.forEach(fn => fn({ estado: { newValue: estado } }, "local"));
          siguienteEscritura?.();
        },
      },
      onChanged: { addListener(fn) { listeners.push(fn); } },
    },
    tabs: {
      async query() { return pestanas; },
      async sendMessage() {},
      async update(id, opciones) { llamadas.push({ tipo: "activar", id, opciones }); },
      async create(opciones) { llamadas.push({ tipo: "crear", opciones }); },
    },
    windows: { async update(id, opciones) { llamadas.push({ tipo: "ventana", id, opciones }); } },
  };
  await import(`../src/popup/popup.js?controles=${++instancia}`);
  await new Promise(resolve => setImmediate(resolve));
  return {
    doc: document, estado: () => estado, llamadas,
    async cambiar(accion) {
      const escrito = new Promise(resolve => { siguienteEscritura = resolve; });
      accion();
      await escrito;
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test("quitar el ultimo tren desde el popup detiene la busqueda y limpia la reserva", async t => {
  const c = await preparar(t);
  await c.cambiar(() => c.doc.querySelector(".ui-remove").click());
  assert.deepEqual(c.estado().targets[0].trenes, []);
  assert.equal(c.estado().running, false);
  assert.equal(c.estado().reservando, null);
  assert.equal(c.doc.getElementById("parar").hidden, true);
});

test("quitar uno de varios trenes conserva los restantes y la busqueda", async t => {
  const c = await preparar(t, { trenes: [{ numtren: "09132", salida: "14.53" }, { numtren: "09140", salida: "15.07" }] });
  await c.cambiar(() => c.doc.querySelector(".ui-remove").click());
  assert.deepEqual(c.estado().targets[0].trenes.map(t => t.numtren), ["09140"]);
  assert.equal(c.estado().running, true);
});

test("el intervalo del popup se acota y conserva los demas ajustes", async t => {
  const c = await preparar(t);
  await c.cambiar(() => {
    const input = c.doc.getElementById("intervalo");
    input.value = "0";
    input.dispatchEvent(new c.doc.defaultView.Event("change"));
  });
  assert.equal(c.estado().settings.intervalSec, 2);
  assert.equal(c.estado().settings.debug, true);
  assert.equal(c.doc.querySelector('[data-intervalo="-1"]').disabled, true);
});

test("abrir Renfe reutiliza y enfoca una pestana existente", async t => {
  const c = await preparar(t, { running: false, pestanas: [{ id: 8, windowId: 3 }] });
  c.doc.getElementById("abrir").click();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(c.llamadas, [
    { tipo: "activar", id: 8, opciones: { active: true } },
    { tipo: "ventana", id: 3, opciones: { focused: true } },
  ]);
});

test("abrir Renfe crea una pestana cuando no hay ninguna abierta", async t => {
  const c = await preparar(t, { running: false });
  c.doc.getElementById("abrir").click();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(c.llamadas, [{ tipo: "crear", opciones: { url: "https://venta.renfe.com/vol/myPassesCard.do" } }]);
});
