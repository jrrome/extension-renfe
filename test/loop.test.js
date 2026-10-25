import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { estadoInicial, FASE } from "../src/shared/state.js";
import { arrancarBucle, pararBucle } from "../src/content/loop.js";

for (const modo of ["normal", "parar durante la escritura", "parar desde otro contexto"]) {
  test(`reserva: ${modo}`, async () => {
    const dom = new JSDOM(`<input id="dateTrainList" value="25/10/2026">
      <table><tbody id="listTrainsTableTbodyNEW"><tr id="row09132">
        <td data-label="Salida">14.53</td><td data-label="Clase">Turista</td>
        <td><button id="continuar09132" tren="09132">Continuar</button></td>
      </tr></tbody></table>`);
    globalThis.document = dom.window.document;
    let clics = 0;
    document.querySelector("button").onclick = () => clics++;
    let estado = { ...estadoInicial(), running: true, fase: FASE.SCAN,
      activeTargetId: "actual", targets: [{ id: "actual", trenes: [{ numtren: "09132", salida: "14.53" }] }] };
    globalThis.chrome = { storage: { local: {
      async get() { return { estado: structuredClone(estado) }; },
      async set(datos) {
        estado = structuredClone(datos.estado);
        if (estado.fase === FASE.CONFIRM && modo !== "normal") {
          if (modo === "parar durante la escritura") pararBucle();
          estado.running = false;
          estado.fase = FASE.IDLE;
          estado.reservando = null;
        }
      },
    } } };
    try {
      await arrancarBucle();
      assert.equal(clics, modo === "normal" ? 1 : 0);
    } finally {
      pararBucle();
      dom.window.close();
    }
  });
}
