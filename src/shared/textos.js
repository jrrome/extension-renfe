import { FASE } from "./state.js";

const TECNICO = {
  [FASE.IDLE]: "Parado",
  [FASE.SCAN]: "Comprobando trenes",
  [FASE.WAIT]: "Esperando",
  [FASE.REFRESH]: "Refrescando búsqueda",
  [FASE.CONFIRM]: "Confirmando reserva",
  [FASE.DONE]: "Reservado",
  [FASE.PAUSED_ERRORS]: "Pausado por errores",
  [FASE.PAUSED_CHALLENGE]: "Verificación de Renfe",
};

// scan, wait y refresh son tres pasos internos de una sola cosa vista desde fuera:
// esta buscando. verlas parpadear no informa de nada accionable.
const SIMPLE = {
  ...TECNICO,
  [FASE.SCAN]: "Buscando plaza",
  [FASE.WAIT]: "Buscando plaza",
  [FASE.REFRESH]: "Buscando plaza",
  [FASE.CONFIRM]: "Reservando",
};

export function textoDeFase(fase, debug) {
  return (debug ? TECNICO : SIMPLE)[fase] || fase;
}

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

export function haceCuanto(ms, ahora = Date.now()) {
  if (!ms) return "";
  const pasado = Math.max(0, ahora - ms);
  if (pasado < MINUTO) return `hace ${Math.floor(pasado / 1000)} s`;
  if (pasado < HORA) return `hace ${Math.floor(pasado / MINUTO)} min`;
  return `hace ${Math.floor(pasado / HORA)} h`;
}
