import { FASE } from "../../shared/state.js";
import { textoDeFase, haceCuanto } from "../../shared/textos.js";

const ID_HOST = "renfebot-panel";

const ESTILOS = `
:host { all: initial; }
.panel {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
  width: 288px; font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f2eef4; background: #241228; border: 1px solid #4a2a52;
  border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,.42); overflow: hidden;
}
.cab {
  display: flex; align-items: center; gap: 8px; padding: 9px 11px;
  background: #6b1f7c; cursor: default;
}
.cab h1 { flex: 1; margin: 0; font-size: 12.5px; font-weight: 600; letter-spacing: .3px; }
.punto { width: 8px; height: 8px; border-radius: 50%; background: #8b7f90; flex: none; }
.punto.on { background: #4ade80; animation: late 1.4s ease-in-out infinite; }
.punto.err { background: #f87171; }
.punto.ok { background: #4ade80; }
@keyframes late { 50% { opacity: .35; } }
.cab button {
  all: unset; cursor: pointer; padding: 0 5px; font-size: 15px; line-height: 1;
  color: #f2eef4; opacity: .75; border-radius: 4px;
}
.cab button:hover { opacity: 1; background: rgba(255,255,255,.14); }
.cuerpo { padding: 11px; }
.panel.min .cuerpo { display: none; }
.estado { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
.estado .txt { font-weight: 600; }
.estado .meta { color: #b49ebb; font-size: 11.5px; text-align: right; }
.aviso {
  margin: 0 0 9px; padding: 7px 9px; border-radius: 6px; font-size: 12px;
  background: #4a1f22; border: 1px solid #7f2d33; color: #fecaca;
}
.aviso.ok { background: #12331f; border-color: #256b3c; color: #bbf7d0; }
.diag {
  margin: 0 0 9px; padding: 6px 8px; border-radius: 5px; background: #1b0e1f;
  border: 1px solid #3d2145; color: #a893b0; font-size: 11px; line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.diag b { color: #e9c8f2; font-weight: 600; }
.diag .mal { color: #fca5a5; }
.lista { margin: 0 0 10px; padding: 0; list-style: none; max-height: 132px; overflow-y: auto; }
.lista:empty::after {
  content: "Marca trenes en la tabla para vigilarlos";
  display: block; padding: 9px 2px; color: #9c86a4; font-size: 12px; font-style: italic;
}
.lista li {
  display: flex; align-items: center; gap: 7px; padding: 4px 6px;
  border-radius: 5px; background: #33193a; margin-bottom: 3px;
}
.lista .hora { font-variant-numeric: tabular-nums; font-weight: 600; }
.lista .num { flex: 1; color: #b49ebb; font-size: 11.5px; font-variant-numeric: tabular-nums; }
.lista button {
  all: unset; cursor: pointer; color: #c9a7d2; padding: 0 4px; border-radius: 3px; font-size: 14px;
}
.lista button:hover { color: #fff; background: rgba(255,255,255,.14); }
.pie { display: flex; align-items: center; gap: 8px; }
.principal {
  all: unset; flex: 1; text-align: center; cursor: pointer; padding: 8px 0;
  border-radius: 6px; background: #6b1f7c; font-weight: 600; font-size: 13px;
}
.principal:hover { background: #7d2591; }
.principal.parar { background: #8f2b31; }
.principal.parar:hover { background: #a5333a; }
.principal[disabled] { opacity: .45; cursor: not-allowed; }
.intervalo { display: flex; align-items: center; gap: 5px; color: #b49ebb; font-size: 11.5px; }
.intervalo input {
  all: unset; width: 30px; text-align: center; padding: 4px 2px; border-radius: 5px;
  background: #33193a; color: #f2eef4; font-variant-numeric: tabular-nums;
}
`;

const AVISOS = {
  [FASE.PAUSED_ERRORS]: "Demasiados ciclos fallidos seguidos. Revisa la pagina y reanuda.",
  [FASE.PAUSED_CHALLENGE]: "Renfe pide una verificacion. Resuelvela tu y reanuda.",
};

let raiz = null;
let acciones = {};
let ultimoEstado = null;
let ticker = null;

export function montarPanel(manejadores) {
  acciones = manejadores;
  if (document.getElementById(ID_HOST)) return;

  const host = document.createElement("div");
  host.id = ID_HOST;
  document.body.appendChild(host);
  raiz = host.attachShadow({ mode: "open" });

  raiz.innerHTML = `
    <style>${ESTILOS}</style>
    <section class="panel">
      <header class="cab">
        <span class="punto"></span>
        <h1>Bot Renfe</h1>
        <button class="reiniciar" title="borrar los trenes marcados y empezar de cero">↺</button>
        <button class="minimizar" title="minimizar">–</button>
      </header>
      <div class="cuerpo">
        <div class="estado">
          <span class="txt">Parado</span>
          <span class="meta"></span>
        </div>
        <div class="zona-aviso"></div>
        <div class="zona-diag"></div>
        <ul class="lista"></ul>
        <div class="pie">
          <button class="principal">Buscar</button>
          <label class="intervalo">cada <input type="number" min="2" max="60" value="5"> s</label>
        </div>
      </div>
    </section>`;

  raiz.querySelector(".minimizar").addEventListener("click", () => {
    raiz.querySelector(".panel").classList.toggle("min");
  });
  raiz.querySelector(".reiniciar").addEventListener("click", () => acciones.alReiniciar?.());
  raiz.querySelector(".principal").addEventListener("click", () => acciones.alPulsarPrincipal?.());
  raiz.querySelector(".intervalo input").addEventListener("change", (e) => {
    acciones.alCambiarIntervalo?.(Number(e.target.value));
  });

  // "hace 12 s" tiene que envejecer y el panel solo repinta cuando cambia el estado:
  // con un intervalo largo el usuario se quedaria mirando un valor congelado
  if (ticker) clearInterval(ticker);
  ticker = setInterval(pintarMeta, 5000);
}

function pintarMeta() {
  if (!raiz || !ultimoEstado) return;
  const estado = ultimoEstado;
  const meta = raiz.querySelector(".estado .meta");

  if (!estado.running && !estado.cycle) {
    meta.innerHTML = "";
    return;
  }

  if (estado.settings.debug) {
    const hora = estado.lastCycleAt ? new Date(estado.lastCycleAt).toLocaleTimeString("es-ES") : "-";
    meta.innerHTML = `ciclo ${estado.cycle}<br>${hora}`;
    return;
  }

  const cuanto = haceCuanto(estado.lastCycleAt);
  meta.innerHTML = cuanto ? `ultimo intento<br>${cuanto}` : "";
}

export function actualizarPanel(estado, objetivo) {
  if (!raiz) return;

  const corriendo = estado.running;
  const pausado = String(estado.fase).startsWith("PAUSED");
  const vigilados = objetivo?.trenes || [];
  const debug = Boolean(estado.settings.debug);

  const logrado = estado.fase === FASE.DONE;
  const punto = raiz.querySelector(".punto");
  punto.className = `punto${corriendo ? " on" : ""}${pausado ? " err" : ""}${logrado ? " ok" : ""}`;

  raiz.querySelector(".estado .txt").textContent = textoDeFase(estado.fase, debug);
  ultimoEstado = estado;
  pintarMeta();

  const zona = raiz.querySelector(".zona-aviso");
  // lastError trae el motivo concreto (que trenes, que fechas); el texto generico
  // solo se usa cuando no hay uno especifico
  const aviso = logrado
    ? `Reservado el tren ${estado.result?.numtren || ""}.`
    : (pausado && estado.lastError) || AVISOS[estado.fase];
  zona.innerHTML = aviso ? `<p class="aviso${logrado ? " ok" : ""}">${aviso}</p>` : "";

  const diag = raiz.querySelector(".zona-diag");
  const d = estado.ultimoDiagnostico;
  if (debug && d && (corriendo || pausado)) {
    const faltan = d.vigilados > 0 && d.vigiladosPresentes < d.vigilados;
    diag.innerHTML = `<p class="diag">
      <b>${d.enTabla}</b> trenes en la tabla ·
      <span class="${faltan ? "mal" : ""}"><b>${d.vigiladosPresentes}/${d.vigilados}</b> vigilados presentes</span><br>
      refresco: <b>${d.refresco}</b>${faltan ? '<br><span class="mal">los trenes vigilados no estan en esta tabla</span>' : ""}
    </p>`;
  } else {
    diag.innerHTML = "";
  }

  const lista = raiz.querySelector(".lista");
  lista.innerHTML = vigilados
    .map((v) => `<li><span class="hora">${v.salida || "--.--"}</span>
      <span class="num">tren ${v.numtren}</span>
      <button data-num="${v.numtren}" title="dejar de vigilar">×</button></li>`)
    .join("");
  lista.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => acciones.alQuitarTren?.(b.dataset.num));
  });

  // mientras busca ya tienes Parar; que convivan los dos invita al clic equivocado,
  // y el reinicio esta pegado a minimizar
  raiz.querySelector(".reiniciar").hidden = corriendo;

  const principal = raiz.querySelector(".principal");
  principal.textContent = corriendo ? "Parar" : "Buscar";
  principal.classList.toggle("parar", corriendo);
  principal.disabled = !corriendo && vigilados.length === 0;

  const intervalo = raiz.querySelector(".intervalo input");
  if (document.activeElement !== intervalo) intervalo.value = estado.settings.intervalSec;
}
