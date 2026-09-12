export const FASE = {
  IDLE: "IDLE",
  SCAN: "SCAN",
  WAIT: "WAIT",
  REFRESH: "REFRESH",
  BOOK: "BOOK",
  CONFIRM: "CONFIRM",
  DONE: "DONE",
  PAUSED_SESSION: "PAUSED_SESSION",
  PAUSED_ERRORS: "PAUSED_ERRORS",
  PAUSED_CHALLENGE: "PAUSED_CHALLENGE",
};

export const VERSION = 1;
const CLAVE = "estado";

const AJUSTES_DEFECTO = { intervalSec: 5, maxErrorStreak: 5 };

export function estadoInicial() {
  return {
    version: VERSION,
    running: false,
    targets: [],
    activeTargetId: null,
    fase: FASE.IDLE,
    cycle: 0,
    errorStreak: 0,
    lastCycleAt: null,
    reservando: null,
    lastError: null,
    ultimoDiagnostico: null,
    estrategiaRefresco: null,
    result: null,
    settings: { ...AJUSTES_DEFECTO },
  };
}

export function conDefectos(guardado) {
  const base = estadoInicial();
  if (!guardado || typeof guardado !== "object") return base;
  return {
    ...base,
    ...guardado,
    settings: { ...AJUSTES_DEFECTO, ...(guardado.settings || {}) },
    version: VERSION,
  };
}

export async function leerEstado() {
  const datos = await chrome.storage.local.get(CLAVE);
  return conDefectos(datos[CLAVE]);
}

export async function guardarEstado(parcial) {
  const actual = await leerEstado();
  const siguiente = conDefectos({ ...actual, ...parcial });
  await chrome.storage.local.set({ [CLAVE]: siguiente });
  return siguiente;
}

export function objetivoActivo(estado) {
  return estado.targets.find((t) => t.id === estado.activeTargetId) || estado.targets[0] || null;
}

export function alCambiarEstado(callback) {
  chrome.storage.onChanged.addListener((cambios, area) => {
    if (area === "local" && cambios[CLAVE]) callback(conDefectos(cambios[CLAVE].newValue));
  });
}
