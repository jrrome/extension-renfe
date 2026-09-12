import test from "node:test";
import assert from "node:assert/strict";
import {
  conDefectos,
  normalizarIntervalo,
  estadoReiniciado,
  caducar,
  FASE,
  REANUDAR_MAX_MS,
  CADUCIDAD_MS,
  INTERVALO_MAX,
  SIN_LATIDO_MS,
  MARGEN_REFRESCO_MS,
} from "../src/shared/state.js";

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

test("el ciclo mas largo posible cabe dentro de la ventana del watchdog", () => {
  const cicloMasLargoMs = INTERVALO_MAX * 1000 + MARGEN_REFRESCO_MS;
  assert.ok(
    cicloMasLargoMs < SIN_LATIDO_MS,
    "si el intervalo maximo mas el margen de refresco no cabe en SIN_LATIDO_MS, " +
      "el watchdog del service worker mataria un bucle que va bien, no uno atascado",
  );
});

test("un intervalo razonable pasa entero y los decimales se redondean", () => {
  assert.equal(normalizarIntervalo(7), 7);
  assert.equal(normalizarIntervalo("7"), 7);
  assert.equal(normalizarIntervalo(7.4), 7);
  assert.equal(normalizarIntervalo(7.6), 8);
});

test("reiniciar conserva los ajustes y borra todo lo demas", () => {
  const sucio = {
    ...conDefectos(undefined),
    running: true,
    fase: FASE.DONE,
    cycle: 88,
    targets: [{ id: "actual", fecha: "12/09/2026", trenes: [{ numtren: "09132", salida: "14.53" }] }],
    activeTargetId: "actual",
    result: { numtren: "09132" },
    lastError: "algo paso",
    actualizadoEn: 1757000000000,
    settings: { intervalSec: 12, maxErrorStreak: 5, debug: true },
  };

  const limpio = estadoReiniciado(sucio);

  assert.equal(limpio.settings.intervalSec, 12, "el intervalo es una preferencia, no estado de busqueda");
  assert.equal(limpio.settings.debug, true);
  assert.equal(limpio.running, false);
  assert.equal(limpio.fase, FASE.IDLE);
  assert.equal(limpio.cycle, 0);
  assert.deepEqual(limpio.targets, []);
  assert.equal(limpio.activeTargetId, null);
  assert.equal(limpio.result, null);
  assert.equal(limpio.lastError, null);
  assert.equal(limpio.actualizadoEn, null);
});

test("reiniciar sobre un estado sin ajustes no revienta", () => {
  assert.equal(estadoReiniciado({}).settings.intervalSec, 5);
  assert.equal(estadoReiniciado(undefined).settings.intervalSec, 5);
});

const HORA = 60 * 60 * 1000;
const AHORA = 1757680000000;

function estadoBuscando(actualizadoEn) {
  return {
    ...conDefectos(undefined),
    running: true,
    fase: FASE.WAIT,
    cycle: 42,
    actualizadoEn,
    reservando: { numtren: "09132", at: actualizadoEn },
    targets: [{ id: "actual", fecha: "12/09/2026", trenes: [{ numtren: "09132", salida: "14.53" }] }],
    activeTargetId: "actual",
    settings: { intervalSec: 12, maxErrorStreak: 5, debug: false },
  };
}

test("un estado recien tocado no caduca", () => {
  const estado = estadoBuscando(AHORA - 5 * 60 * 1000);
  assert.deepEqual(caducar(estado, AHORA), estado);
});

test("un estado sin sello no caduca nunca", () => {
  const estado = { ...estadoBuscando(null) };
  assert.deepEqual(caducar(estado, AHORA), estado);
});

test("pasada una hora deja de reanudar solo pero conserva los trenes marcados", () => {
  const salida = caducar(estadoBuscando(AHORA - 2 * HORA), AHORA);
  assert.equal(salida.running, false, "no debe rearrancar una busqueda vieja por su cuenta");
  assert.equal(salida.fase, FASE.IDLE);
  assert.equal(salida.reservando, null, "una reserva a medias de hace dos horas ya no significa nada");
  assert.equal(salida.targets[0].trenes.length, 1, "los trenes marcados se conservan");
  assert.equal(salida.cycle, 42, "el ciclo se conserva hasta las 24 h");
  assert.equal(
    salida.actualizadoEn,
    AHORA - 2 * HORA,
    "el sello no se toca aqui, es lo que hace alcanzable el borrado de 24 h",
  );
});

test("pasadas 24 horas se olvida todo menos los ajustes", () => {
  const salida = caducar(estadoBuscando(AHORA - 25 * HORA), AHORA);
  assert.deepEqual(salida.targets, []);
  assert.equal(salida.cycle, 0);
  assert.equal(salida.running, false);
  assert.equal(salida.actualizadoEn, null);
  assert.equal(salida.settings.intervalSec, 12, "los ajustes sobreviven");
});

test("pasadas 24 horas limpia aunque no estuviera buscando", () => {
  const parado = { ...estadoBuscando(AHORA - 25 * HORA), running: false, fase: FASE.DONE };
  assert.deepEqual(caducar(parado, AHORA).targets, []);
});

test("aplicar la caducidad dos veces da lo mismo que aplicarla una", () => {
  for (const edad of [2 * HORA, 25 * HORA]) {
    const una = caducar(estadoBuscando(AHORA - edad), AHORA);
    assert.deepEqual(caducar(una, AHORA), una, `edad ${edad}`);
    assert.equal(
      caducar(una, AHORA),
      una,
      `edad ${edad}: la segunda pasada debe devolver el mismo objeto, no uno equivalente`,
    );
  }
});

test("los umbrales caducan justo en el limite, no un instante antes", () => {
  const enUmbralReanudar = caducar(estadoBuscando(AHORA - REANUDAR_MAX_MS), AHORA);
  assert.equal(enUmbralReanudar.running, false, "en el umbral exacto de una hora ya debe degradar");

  const justoAntesReanudar = caducar(estadoBuscando(AHORA - (REANUDAR_MAX_MS - 1)), AHORA);
  assert.equal(justoAntesReanudar.running, true, "un milisegundo antes del umbral no debe degradar todavia");

  const enUmbralCaducidad = caducar(estadoBuscando(AHORA - CADUCIDAD_MS), AHORA);
  assert.deepEqual(enUmbralCaducidad.targets, [], "en el umbral exacto de 24 h ya debe borrarlo todo");

  const justoAntesCaducidad = caducar(estadoBuscando(AHORA - (CADUCIDAD_MS - 1)), AHORA);
  assert.equal(justoAntesCaducidad.running, false, "un milisegundo antes de las 24 h solo degrada, no borra");
  assert.equal(justoAntesCaducidad.targets.length, 1, "un milisegundo antes de las 24 h todavia conserva los trenes");
});
