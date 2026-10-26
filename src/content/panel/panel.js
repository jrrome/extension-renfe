import { crearInterfaz, conectarInterfaz, pintarInterfaz, actualizarTemporizador } from "../../shared/ui.js";

const ID_HOST = "renfebot-panel";
let raiz = null;
let ticker = null;

export function montarPanel(acciones) {
  if (document.getElementById(ID_HOST)) return;
  const host = document.createElement("div");
  host.id = ID_HOST;
  document.body.appendChild(host);
  raiz = host.attachShadow({ mode: "open" });
  raiz.innerHTML = crearInterfaz();
  conectarInterfaz(raiz, acciones);
  if (ticker) clearInterval(ticker);
  ticker = setInterval(() => actualizarTemporizador(raiz), 1000);
}

export function actualizarPanel(estado, objetivo) {
  if (raiz) pintarInterfaz(raiz, estado, objetivo);
}
