import { FASE, leerEstado, guardarEstado, SIN_LATIDO_MS } from "../shared/state.js";
import { MSG } from "../shared/messages.js";

const ALARMA_VIGILANCIA = "vigilancia";

// getURL y no una ruta relativa: este script vive en src/background/, y ahi una
// ruta relativa se resuelve contra la carpeta del worker, no contra la raiz de la
// extension. chrome no encontraba el icono y notifications.create rechazaba entera,
// asi que no es que saliera sin icono: no salia ninguna notificacion.
const ICONO = chrome.runtime.getURL("icons/icon128.png");

function notificar(titulo, mensaje) {
  chrome.notifications
    .create({ type: "basic", iconUrl: ICONO, title: titulo, message: mensaje, priority: 2 })
    .catch((e) => console.error("[bot renfe] no se pudo notificar:", e));
}

async function pintarBadge() {
  const estado = await leerEstado();
  if (estado.fase === FASE.DONE) {
    chrome.action.setBadgeText({ text: "OK" });
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
    return;
  }
  if (String(estado.fase).startsWith("PAUSED")) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
    return;
  }
  if (estado.running) {
    // un numero que sube no le dice nada a quien no esta depurando; los badges
    // accionables, el de reservado y el de pausa, no cambian entre modos
    chrome.action.setBadgeText({ text: estado.settings.debug ? String(estado.cycle % 1000) : "•" });
    chrome.action.setBadgeBackgroundColor({ color: "#6b1f7c" });
    return;
  }
  chrome.action.setBadgeText({ text: "" });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.tipo === MSG.NOTIFICAR_RESERVA) {
    notificar("Tren reservado", `Se ha cogido el tren ${msg.numtren}. Revisa la pagina de Renfe.`);
  }
  if (msg?.tipo === MSG.NOTIFICAR_PAUSA) {
    notificar("Bot Renfe pausado", msg.motivo || "La busqueda se ha detenido.");
  }
  pintarBadge();
});

chrome.storage.onChanged.addListener(pintarBadge);

// el service worker puede morir cuando quiera: no guarda estado, solo comprueba
// de vez en cuando que un bucle marcado como activo siga dando senales de vida
chrome.alarms.create(ALARMA_VIGILANCIA, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarma) => {
  if (alarma.name !== ALARMA_VIGILANCIA) return;
  const estado = await leerEstado();
  if (!estado.running || !estado.lastCycleAt) return;
  if (Date.now() - estado.lastCycleAt < SIN_LATIDO_MS) return;

  await guardarEstado({ running: false, fase: FASE.PAUSED_ERRORS, lastError: "el bucle dejo de responder" });
  notificar("Bot Renfe detenido", "La busqueda dejo de responder. Vuelve a la pestana de Renfe y reanudala.");
});

chrome.runtime.onInstalled.addListener(pintarBadge);
