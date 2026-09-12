import { FASE, leerEstado, objetivoActivo, alCambiarEstado } from "../shared/state.js";
import { MSG } from "../shared/messages.js";

const TEXTO_FASE = {
  [FASE.IDLE]: "Parado",
  [FASE.SCAN]: "Comprobando trenes",
  [FASE.WAIT]: "Esperando al siguiente intento",
  [FASE.REFRESH]: "Refrescando la busqueda",
  [FASE.BOOK]: "Reservando",
  [FASE.CONFIRM]: "Confirmando la reserva",
  [FASE.DONE]: "Tren reservado",
  [FASE.PAUSED_SESSION]: "Sesion de Renfe caida",
  [FASE.PAUSED_ERRORS]: "Pausado por errores",
  [FASE.PAUSED_CHALLENGE]: "Renfe pide verificacion",
};

function pintar(estado) {
  const objetivo = objetivoActivo(estado);
  const pausado = String(estado.fase).startsWith("PAUSED");

  document.getElementById("punto").className = `punto${estado.running ? " on" : ""}${pausado ? " err" : ""}`;
  document.getElementById("fase").textContent = TEXTO_FASE[estado.fase] || estado.fase;

  const partes = [];
  if (objetivo?.fecha) partes.push(objetivo.fecha);
  if (objetivo?.trenes.length) partes.push(`${objetivo.trenes.length} tren(es) vigilados`);
  if (estado.running) partes.push(`ciclo ${estado.cycle}`);
  if (estado.lastError) partes.push(estado.lastError);
  document.getElementById("detalle").textContent = partes.join(" · ");

  document.getElementById("parar").hidden = !estado.running;
}

document.getElementById("parar").addEventListener("click", async () => {
  const [pestana] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (pestana) chrome.tabs.sendMessage(pestana.id, { tipo: MSG.PARAR }).catch(() => {});
});

leerEstado().then(pintar);
alCambiarEstado(pintar);
