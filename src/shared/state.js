export const FASE = {
  IDLE: "IDLE",
  SCAN: "SCAN",
  WAIT: "WAIT",
  REFRESH: "REFRESH",
  CONFIRM: "CONFIRM",
  DONE: "DONE",
  PAUSED_ERRORS: "PAUSED_ERRORS",
  PAUSED_CHALLENGE: "PAUSED_CHALLENGE",
};

export const VERSION = 1;
const CLAVE = "estado";

const AJUSTES_DEFECTO = { intervalSec: 5, maxErrorStreak: 5, debug: false };

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

  const settings = { ...AJUSTES_DEFECTO, ...(guardado.settings || {}) };
  return {
    ...base,
    ...guardado,
    settings: {
      ...settings,
      intervalSec: normalizarIntervalo(settings.intervalSec),
      debug: Boolean(settings.debug),
    },
    version: VERSION,
  };
}

export async function leerEstado(ahora = Date.now()) {
  const datos = await chrome.storage.local.get(CLAVE);
  return caducar(conDefectos(datos[CLAVE]), ahora);
}

// leer, mezclar y escribir sin cerrojo tiene carrera: dos clics seguidos en checkboxes
// leen el mismo estado y el segundo pisa al primero. encadenarlas lo evita dentro de
// este contexto js, que es donde pasa de verdad.
let cola = Promise.resolve();

function enCola(tarea) {
  const siguiente = cola.then(tarea, tarea);
  cola = siguiente.catch(() => {});
  return siguiente;
}

async function fundirYGuardar(actual, cambios) {
  const siguiente = conDefectos({ ...actual, ...cambios, actualizadoEn: Date.now() });
  await chrome.storage.local.set({ [CLAVE]: siguiente });
  return siguiente;
}

async function limpiar() {
  const actual = await leerEstado();
  const limpio = conDefectos(estadoReiniciado(actual));
  await chrome.storage.local.set({ [CLAVE]: limpio });
  return limpio;
}

// para los cambios que dependen del estado anterior la lectura tiene que ocurrir
// dentro de la cola. con la lectura fuera, dos clics seguidos calculan desde la
// misma foto y el segundo pisa al primero por mucho que las escrituras se ordenen.
export function actualizarEstado(transformar) {
  return enCola(async () => {
    const actual = await leerEstado();
    const cambios = transformar(actual);
    // sin cambios no hay nada que escribir: escribir igual despertaria a cada
    // suscriptor de alCambiarEstado por un clic que no cambio nada
    if (!cambios) return actual;
    return fundirYGuardar(actual, cambios);
  });
}

// caso particular de actualizarEstado: el cambio no depende del estado anterior
export function guardarEstado(parcial) {
  return actualizarEstado(() => parcial);
}

// se escribe entero, no mezclado: reiniciar es sustituir el estado, no parchearlo
export function reiniciarEstado() {
  return enCola(limpiar);
}

export function objetivoActivo(estado) {
  return estado.targets.find((t) => t.id === estado.activeTargetId) || estado.targets[0] || null;
}

export function alCambiarEstado(callback) {
  chrome.storage.onChanged.addListener((cambios, area) => {
    if (area === "local" && cambios[CLAVE]) callback(caducar(conDefectos(cambios[CLAVE].newValue)));
  });
}
