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

// el input del panel trae min y max, pero esos atributos no se aplican al leer .value:
// borrar el campo da "" y Number("") es 0, que dejaria el bucle sin pausa ninguna
const INTERVALO_MIN = 2;
const INTERVALO_MAX = 60;

export function normalizarIntervalo(valor) {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return INTERVALO_MIN;
  return Math.min(INTERVALO_MAX, Math.max(INTERVALO_MIN, n));
}

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
    actualizadoEn: null,
    reservando: null,
    lastError: null,
    ultimoDiagnostico: null,
    estrategiaRefresco: null,
    result: null,
    settings: { ...AJUSTES_DEFECTO },
  };
}

export function estadoReiniciado(actual) {
  const base = estadoInicial();
  return { ...base, settings: { ...base.settings, ...(actual?.settings || {}) } };
}

// dos relojes, no uno. el corto evita lo peligroso: que al abrir renfe dias despues
// rearranque sola una busqueda vieja y reserve algo que ya no quieres. el largo cumple
// el encargo de olvidarlo todo. entre medias se conservan los trenes marcados porque
// re-marcarlos a mano es justo la molestia que no aporta nada.
export const REANUDAR_MAX_MS = 60 * 60 * 1000;
export const CADUCIDAD_MS = 24 * 60 * 60 * 1000;

export function caducar(estado, ahora = Date.now()) {
  if (!estado.actualizadoEn) return estado;

  const inactivo = ahora - estado.actualizadoEn;
  if (inactivo >= CADUCIDAD_MS) return estadoReiniciado(estado);

  // no se toca actualizadoEn: el reloj de 24 h sigue corriendo y volver a aplicar
  // esto no cambia nada, que es lo que la hace segura de llamar en cada lectura
  if (inactivo >= REANUDAR_MAX_MS && (estado.running || estado.reservando)) {
    return { ...estado, running: false, fase: FASE.IDLE, reservando: null };
  }

  return estado;
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
