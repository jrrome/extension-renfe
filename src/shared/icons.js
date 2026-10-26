import { LUCIDE } from "./lucide-icons.js";

// Marca monolineal original: geometría de 32 px, sin imágenes ni filtros.
const BOT_RENFE = `<path d="M16 7V3"/>
  <rect x="6" y="7" width="20" height="19" rx="7"/>
  <path d="M10 16v-1a6 6 0 0 1 12 0v1Z"/>
  <path d="M13 13v1m6-1v1m-6 6c1.5 1.5 4.5 1.5 6 0M12 26l-2 3m10-3 2 3M9 29h14"/>`;

export function marcaBot(tamano = 32) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamano}" height="${tamano}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BOT_RENFE}</svg>`;
}

const ALIAS = { buscar: "search", parar: "square", reiniciar: "rotate-ccw", menos: "minus", mas: "plus", cerrar: "x", reloj: "clock", check: "circle-check", alerta: "circle-alert", ajustes: "sliders-horizontal" };
const ESTADOS = {
  IDLE: ["clock", "4 4 16 16"],
  SCAN: ["arrow-up-right", "4 4 16 16"], WAIT: ["arrow-up-right", "4 4 16 16"], REFRESH: ["arrow-up-right", "4 4 16 16"],
  CONFIRM: ["arrow-up-right", "4 4 16 16"], DONE: ["circle-check", "6 6 12 12"],
  PAUSED_ERRORS: ["circle-x", "6 6 12 12"], PAUSED_CHALLENGE: ["info", "6 6 12 12"],
};

export function icono(nombre, tamano = 18) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE[ALIAS[nombre] || nombre] || LUCIDE.info}</svg>`;
}

export function iconoEstado(fase, tamano = 18) {
  const [nombre, vista] = ESTADOS[fase] || ESTADOS.IDLE;
  // El disco con volumen se pinta en CSS; Lucide aporta solo el glifo blanco.
  const glifo = LUCIDE[nombre].replace(/<circle\b[^>]*\/>/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamano}" height="${tamano}" viewBox="${vista}" fill="none" stroke="currentColor" stroke-width="${vista === "6 6 12 12" ? 2 : 2.5}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glifo}</svg>`;
}
