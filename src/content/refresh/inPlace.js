import { SEL } from "../../shared/selectors.js";

const PEDIR = "renfebot:refrescar";
const RESPONDER = "renfebot:refrescado";
const MARCA = "data-renfebot-ciclo";

let inyectado = false;

function inyectarPageScript() {
  if (inyectado) return;
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/content/pageScript.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
  inyectado = true;
}

function filas() {
  return [...document.querySelectorAll(`${SEL.tablaTrenes} ${SEL.filaTren}`)];
}

// marcar las filas actuales es la unica forma fiable de saber si renfe ha
// repintado la tabla. observar mutaciones no vale: nosotros mismos mutamos el
// tbody al remontar los checkboxes y eso se cuenta como repintado falso.
// el atributo no dispara observadores de childList, asi que no se contamina.
export function marcarFilas(marca) {
  filas().forEach((fila) => fila.setAttribute(MARCA, marca));
}

// renfe vacia el tbody antes de repoblarlo, asi que una tabla vacia significa
// "todavia no", nunca "ya esta". darla por terminada hacia que el bucle escanease
// a mitad de render y creyese que no habia trenes.
export function filasReemplazadas(marca) {
  const actuales = filas();
  if (actuales.length === 0) return false;
  return actuales.every((fila) => fila.getAttribute(MARCA) !== marca);
}

async function esperarReemplazo(marca, tiempoMs) {
  const inicio = Date.now();
  while (Date.now() - inicio < tiempoMs) {
    if (filasReemplazadas(marca)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

export async function refrescarEnSitio({ tiempoEsperaMs = 8000, marca } = {}) {
  inyectarPageScript();
  await new Promise((r) => setTimeout(r, 50));

  const etiqueta = marca || String(Date.now());
  marcarFilas(etiqueta);

  const respuesta = new Promise((resolve) => {
    document.addEventListener(RESPONDER, (e) => resolve(e.detail), { once: true });
    setTimeout(() => resolve({ ok: false, error: "sin respuesta del page script" }), 3000);
  });

  document.dispatchEvent(new CustomEvent(PEDIR));
  const detalle = await respuesta;
  if (!detalle.ok) return { ok: false, motivo: detalle.error, via: null };

  const reemplazadas = await esperarReemplazo(etiqueta, tiempoEsperaMs);
  return reemplazadas
    ? { ok: true, via: detalle.via }
    : { ok: false, via: detalle.via, motivo: "renfe no repinto las filas" };
}
