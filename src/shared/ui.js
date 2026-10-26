import { FASE, normalizarIntervalo, INTERVALO_MAX } from "./state.js";
import { textoDeFase, haceCuanto } from "./textos.js";
import { icono, iconoEstado, marcaBot } from "./icons.js";

const ultimo = new WeakMap();
const tipografias = new WeakSet();

export function cargarTipografia(doc = document) {
  if (tipografias.has(doc) || !doc.fonts || !doc.defaultView?.FontFace) return;
  tipografias.add(doc);
  const fuente = new doc.defaultView.FontFace("Bot Renfe Inter", `url("${new URL("./fonts/InterVariable.woff2", import.meta.url).href}")`, { weight: "100 900", display: "swap" });
  doc.fonts.add(fuente);
  fuente.load().catch(() => {}); // La fuente del sistema sigue disponible si no carga.
}

export function crearInterfaz({ popup = false } = {}) {
  const estilo = popup ? "" : `<link rel="stylesheet" href="${new URL("./ui.css", import.meta.url).href}">`;
  return `${estilo}<section class="br-ui ${popup ? "popup" : "floating"}" aria-label="Bot Renfe" data-state="idle">
    <header class="ui-header">
      <span class="ui-brand">${marcaBot()}</span><h1>Bot Renfe</h1>
      <div class="ui-tools">
        <button type="button" class="ui-icon-button reiniciar" id="reiniciar" title="Reiniciar selección" aria-label="Reiniciar selección">${icono("reiniciar", 14)}</button>
        ${popup ? "" : `<button type="button" class="ui-icon-button minimizar" title="Minimizar panel" aria-label="Minimizar panel" aria-expanded="true">${icono("menos", 15)}</button>`}
      </div>
    </header>
    <div class="ui-content">
      <div class="ui-status-row">
        <div class="ui-status-pill" data-tone="idle" role="status" aria-live="polite"><span class="ui-status-icon">${iconoEstado(FASE.IDLE)}</span><span class="ui-status-text">Parado</span></div>
        <span class="ui-timer" hidden>${icono("reloj", 13)}<span></span></span>
      </div>
      <div class="ui-alert" hidden>${icono("alerta", 16)}<p></p></div>
      <div class="ui-section-title"><h2>Trenes seleccionados</h2><span class="ui-date"></span></div>
      <div class="ui-selection"><ul class="ui-list" aria-label="Trenes seleccionados"></ul><p class="ui-empty">Marca tus trenes en la página de Renfe.</p></div>
      <div class="ui-action-dock"><div class="ui-interval-row">
        <span class="ui-interval-label">Revisar cada</span>
        <div class="ui-stepper">
          <button type="button" data-intervalo="-1" aria-label="Reducir intervalo">${icono("menos", 12)}</button>
          <label><input id="intervalo" type="number" min="2" max="60" step="1" value="5" aria-label="Intervalo de búsqueda en segundos"><span>s</span></label>
          <button type="button" data-intervalo="1" aria-label="Aumentar intervalo">${icono("mas", 12)}</button>
        </div>
      </div>
      ${popup ? `<button type="button" id="parar" class="ui-primary stop" hidden>${icono("parar", 15)}<span>Parar búsqueda</span></button>
      <button type="button" id="abrir" class="ui-primary">${icono("external-link", 15)}<span>Ir a Renfe</span></button>`
      : `<button type="button" id="principal" class="ui-primary">${icono("buscar", 15)}<span>Buscar plaza</span></button>`}</div>
      <details class="ui-options">
        <summary>${icono("ajustes", 13)}Opciones y ayuda<span class="chevron">${icono("chevron-down", 13)}</span></summary>
        <div class="ui-options-body">
          <label class="ui-debug-label">Modo diagnóstico<input class="ui-switch" type="checkbox" id="debug" role="switch" aria-label="Modo diagnóstico"></label>
          <div class="ui-diagnostic" hidden></div>
          <p class="ui-help">Abre tu abono en <b>Renfe → Nueva formalización</b>. Elige fecha y sentido, marca tus trenes y pulsa <b>Buscar plaza</b> en el panel.</p>
        </div>
      </details>
    </div>
  </section>`;
}

export function conectarInterfaz(raiz, acciones = {}) {
  cargarTipografia(raiz.ownerDocument || raiz);
  raiz.querySelector(".reiniciar").addEventListener("click", () => acciones.alReiniciar?.());
  raiz.querySelector(".minimizar")?.addEventListener("click", (e) => {
    const minimo = raiz.querySelector(".br-ui").classList.toggle("min");
    const boton = e.currentTarget;
    boton.setAttribute("aria-expanded", String(!minimo));
    boton.setAttribute("aria-label", minimo ? "Expandir panel" : "Minimizar panel");
    boton.title = boton.getAttribute("aria-label");
    boton.innerHTML = icono(minimo ? "mas" : "menos", 15);
  });
  raiz.querySelector("#principal")?.addEventListener("click", () => acciones.alPulsarPrincipal?.());
  raiz.querySelector("#parar")?.addEventListener("click", () => acciones.alParar?.());
  raiz.querySelector("#abrir")?.addEventListener("click", () => acciones.alAbrir?.());
  raiz.querySelector(".ui-list").addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-num]");
    if (boton) acciones.alQuitarTren?.(boton.dataset.num);
  });
  const intervalo = raiz.querySelector("#intervalo");
  function cambiar(valor) {
    const segundos = normalizarIntervalo(valor);
    intervalo.value = segundos;
    raiz.querySelector('[data-intervalo="-1"]').disabled = segundos === 2;
    raiz.querySelector('[data-intervalo="1"]').disabled = segundos === INTERVALO_MAX;
    acciones.alCambiarIntervalo?.(segundos);
  }
  intervalo.addEventListener("change", () => cambiar(intervalo.value));
  raiz.querySelectorAll("[data-intervalo]").forEach((boton) => {
    boton.addEventListener("click", () => cambiar(Number(intervalo.value) + Number(boton.dataset.intervalo)));
  });
  raiz.querySelector("#debug").addEventListener("change", (e) => acciones.alCambiarDiagnostico?.(e.target.checked));
}

function fechaCorta(fecha) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha || "");
  if (!m) return fecha || "";
  return `${Number(m[1])} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(m[2]) - 1] || m[2]}`;
}

export function actualizarTemporizador(raiz, ahora = Date.now()) {
  const estado = ultimo.get(raiz);
  if (!estado) return;
  const timer = raiz.querySelector(".ui-timer");
  const cuanto = haceCuanto(estado.lastCycleAt, ahora);
  timer.hidden = !cuanto;
  if (!cuanto) return;
  timer.querySelector("span").textContent = cuanto.replace("hace ", "").replace(" ", "");
  timer.title = `Último intento ${cuanto}`;
  timer.setAttribute("aria-label", timer.title);
}

export function pintarInterfaz(raiz, estado, objetivo) {
  const superficie = raiz.querySelector(".br-ui");
  const corriendo = estado.running;
  const logrado = estado.fase === FASE.DONE;
  const pausado = String(estado.fase).startsWith("PAUSED");
  const vigilados = objetivo?.trenes || [];
  superficie.dataset.state = logrado ? "done" : estado.fase === FASE.PAUSED_CHALLENGE ? "challenge"
    : pausado ? "error" : estado.fase === FASE.CONFIRM ? "confirming" : corriendo ? "running" : "idle";
  raiz.querySelector(".ui-status-pill").dataset.tone = superficie.dataset.state;
  raiz.querySelector(".ui-status-icon").innerHTML = iconoEstado(estado.fase);
  raiz.querySelector(".ui-status-text").textContent = textoDeFase(estado.fase, estado.settings.debug);
  ultimo.set(raiz, estado);
  actualizarTemporizador(raiz);
  const fecha = raiz.querySelector(".ui-date");
  fecha.textContent = fechaCorta(objetivo?.fecha);
  fecha.title = objetivo?.fecha || "";

  const alerta = raiz.querySelector(".ui-alert");
  const aviso = logrado ? `Tren ${estado.result?.numtren || ""} reservado.`
    : pausado ? estado.lastError || (estado.fase === FASE.PAUSED_CHALLENGE ? "Resuelve la verificación en Renfe y reanuda." : "Revisa la página de Renfe y reanuda.") : "";
  alerta.hidden = !aviso;
  alerta.classList.toggle("success", logrado);
  alerta.querySelector("svg").outerHTML = icono(logrado ? "check" : "alerta", 16);
  alerta.querySelector("p").textContent = aviso;

  const doc = raiz.ownerDocument || raiz;
  const lista = raiz.querySelector(".ui-list");
  lista.replaceChildren();
  for (const tren of vigilados) {
    const fila = doc.createElement("li");
    const hora = doc.createElement("span");
    hora.className = "ui-train-time";
    hora.textContent = (tren.salida || "--.--").replace(".", ":");
    const numero = doc.createElement("span");
    numero.className = "ui-train-number";
    numero.textContent = `#${tren.numtren}`;
    const quitar = doc.createElement("button");
    quitar.type = "button";
    quitar.className = "ui-remove";
    quitar.dataset.num = tren.numtren;
    quitar.title = `Dejar de vigilar el tren ${tren.numtren}`;
    quitar.setAttribute("aria-label", quitar.title);
    quitar.innerHTML = icono("cerrar", 12);
    fila.append(hora, numero, quitar);
    lista.appendChild(fila);
  }
  raiz.querySelector(".ui-empty").hidden = vigilados.length > 0;
  raiz.querySelector(".reiniciar").hidden = corriendo || vigilados.length === 0;
  const principal = raiz.querySelector("#principal");
  if (principal) {
    principal.classList.toggle("stop", corriendo);
    principal.innerHTML = `${icono(corriendo ? "parar" : "buscar", 15)}<span>${corriendo ? "Parar búsqueda" : pausado ? "Reanudar" : "Buscar plaza"}</span>`;
    principal.disabled = !corriendo && vigilados.length === 0;
  }
  const parar = raiz.querySelector("#parar");
  if (parar) parar.hidden = !corriendo;
  const abrir = raiz.querySelector("#abrir");
  if (abrir) abrir.hidden = corriendo;
  const intervalo = raiz.querySelector("#intervalo");
  const activo = raiz.activeElement || doc.activeElement;
  if (activo !== intervalo) intervalo.value = estado.settings.intervalSec;
  raiz.querySelector('[data-intervalo="-1"]').disabled = Number(intervalo.value) <= 2;
  raiz.querySelector('[data-intervalo="1"]').disabled = Number(intervalo.value) >= INTERVALO_MAX;
  raiz.querySelector("#debug").checked = Boolean(estado.settings.debug);
  const diagnostico = raiz.querySelector(".ui-diagnostic");
  const d = estado.ultimoDiagnostico;
  diagnostico.hidden = !estado.settings.debug || !d;
  diagnostico.textContent = d ? `#${estado.cycle} · ${d.enTabla} trenes · ${d.vigiladosPresentes}/${d.vigilados} presentes · ${d.refresco}` : "";
}
