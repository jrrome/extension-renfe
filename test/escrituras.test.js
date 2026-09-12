import test from "node:test";
import assert from "node:assert/strict";

// un storage de mentira con retardo. el retardo es el que hace que las escrituras se
// solapen de verdad: sin el, el test pasaria aunque la cola no existiera.
const almacen = {};
const RETARDO = 5;

globalThis.chrome = {
  storage: {
    local: {
      async get(clave) {
        await new Promise((r) => setTimeout(r, RETARDO));
        return clave in almacen ? { [clave]: almacen[clave] } : {};
      },
      async set(obj) {
        await new Promise((r) => setTimeout(r, RETARDO));
        Object.assign(almacen, obj);
      },
    },
    onChanged: { addListener() {} },
  },
};

const { leerEstado, guardarEstado, reiniciarEstado } = await import("../src/shared/state.js");

function vaciar() {
  for (const k of Object.keys(almacen)) delete almacen[k];
}

test("dos escrituras solapadas no se pisan", async () => {
  vaciar();
  await Promise.all([guardarEstado({ cycle: 7 }), guardarEstado({ errorStreak: 3 })]);

  const estado = await leerEstado();
  assert.equal(estado.cycle, 7, "la primera escritura sobrevivio");
  assert.equal(estado.errorStreak, 3, "la segunda tambien");
});

test("marcar dos trenes seguidos conserva los dos", async () => {
  vaciar();
  const uno = { id: "actual", fecha: "12/09/2026", trenes: [{ numtren: "09132", salida: "14.53" }] };
  await guardarEstado({ targets: [uno], activeTargetId: "actual" });

  const dos = { ...uno, trenes: [...uno.trenes, { numtren: "09140", salida: "15.07" }] };
  await Promise.all([guardarEstado({ targets: [dos] }), guardarEstado({ fase: "SCAN" })]);

  const estado = await leerEstado();
  assert.equal(estado.targets[0].trenes.length, 2);
  assert.equal(estado.fase, "SCAN");
});

test("cada escritura deja el estado sellado con la hora", async () => {
  vaciar();
  const antes = Date.now();
  const estado = await guardarEstado({ cycle: 1 });
  assert.ok(estado.actualizadoEn >= antes, "guardarEstado sella");
});

test("leer un estado de hace 25 horas lo devuelve olvidado", async () => {
  vaciar();
  almacen.estado = {
    version: 1,
    running: true,
    fase: "WAIT",
    cycle: 40,
    targets: [{ id: "actual", fecha: "11/09/2026", trenes: [{ numtren: "09132", salida: "14.53" }] }],
    activeTargetId: "actual",
    actualizadoEn: Date.now() - 25 * 60 * 60 * 1000,
    settings: { intervalSec: 9, maxErrorStreak: 5, debug: true },
  };

  const estado = await leerEstado();
  assert.deepEqual(estado.targets, [], "los trenes de ayer no siguen vigilados");
  assert.equal(estado.running, false);
  assert.equal(estado.settings.intervalSec, 9, "los ajustes sobreviven");
  assert.equal(estado.settings.debug, true);
});

test("reiniciar deja el storage limpio y conserva los ajustes", async () => {
  vaciar();
  await guardarEstado({
    cycle: 20,
    targets: [{ id: "actual", fecha: "12/09/2026", trenes: [{ numtren: "09132", salida: "14.53" }] }],
    settings: { intervalSec: 30, maxErrorStreak: 5, debug: true },
  });

  await reiniciarEstado();

  const estado = await leerEstado();
  assert.deepEqual(estado.targets, []);
  assert.equal(estado.cycle, 0);
  assert.equal(estado.settings.intervalSec, 30);
  assert.equal(estado.settings.debug, true);
});

test("un intervalo corrupto en el storage se acota al leerlo", async () => {
  vaciar();
  almacen.estado = { version: 1, settings: { intervalSec: 0 } };
  assert.equal((await leerEstado()).settings.intervalSec, 2);
});
