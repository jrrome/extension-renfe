import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { estadoInicial, FASE } from "../src/shared/state.js";

for (const boton of ["parar", "reiniciar"]) {
  for (const ids of [[], [10, 20]]) {
    test(`${boton} desde otra pagina, con ${ids.length} pestanas Renfe`, async () => {
      const dom = new JSDOM(readFileSync(new URL("../src/popup/popup.html", import.meta.url), "utf8"));
      globalThis.document = dom.window.document;
      const mensajes = [];
      let consulta;
      let estado = { ...estadoInicial(), running: true, fase: FASE.WAIT,
        reservando: { numtren: "09132" }, targets: [{ id: "actual", trenes: [] }] };
      let guardado;
      const alGuardar = new Promise((resolve) => { guardado = resolve; });
      globalThis.chrome = {
        storage: {
          local: {
            async get() { return { estado: structuredClone(estado) }; },
            async set(datos) { estado = structuredClone(datos.estado); guardado(); },
          },
          onChanged: { addListener() {} },
        },
        tabs: {
          async query(filtro) { consulta = filtro; return ids.map((id) => ({ id })); },
          async sendMessage(id, mensaje) {
            mensajes.push({ id, tipo: mensaje.tipo });
            if (id === 20) throw new Error("sin content script");
          },
        },
      };
      try {
        await import(`../src/popup/popup.js?${boton}-${ids.length}`);
        await new Promise((resolve) => setImmediate(resolve));
        document.getElementById(boton).click();
        await alGuardar;
        assert.deepEqual(consulta, { url: "https://venta.renfe.com/*" });
        assert.equal(estado.running, false);
        assert.equal(estado.fase, FASE.IDLE);
        assert.equal(estado.reservando, null);
        assert.deepEqual(mensajes, ids.map((id) => ({ id, tipo: boton })));
        if (boton === "reiniciar") assert.deepEqual(estado.targets, []);
      } finally {
        dom.window.close();
      }
    });
  }
}
