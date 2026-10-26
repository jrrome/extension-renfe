import { SEL } from "../shared/selectors.js";
import { parseTrains, numeroDeFila } from "./parseTrains.js";

const CLASE_CAJA = "renfebot-check";
const ATTR_MARCADO = "data-renfebot-listo";

// el checkbox se posiciona encima de la celda de avisos en vez de anadir una
// columna, para no alterar el layout ni el numero de celdas de la tabla de renfe
const ESTILOS = `
.${CLASE_CAJA} {
  position: absolute; left: 2px; top: 50%; transform: translateY(-50%);
  box-sizing: border-box; appearance: none; width: 18px; height: 18px; margin: 0; cursor: pointer; z-index: 5;
  border: 1px solid #fff; border-radius: 6px; background: #f5f5f5;
  box-shadow: inset 2px 2px 4px #00000014, inset -2px -2px 4px #fff;
}
.${CLASE_CAJA}:checked { background: #fff; box-shadow: 0 2px 6px #00000012, inset 0 1px 1px #fff; }
.${CLASE_CAJA}:checked::after { content: ""; position: absolute; width: 8px; height: 5px; left: 4px; top: 4px; border-left: 1.7px solid #7f93ee; border-bottom: 1.7px solid #7f93ee; transform: rotate(-45deg); }
.${CLASE_CAJA}:focus-visible { outline: 2px solid #96a5ed; outline-offset: 3px; }
tr[${ATTR_MARCADO}] > td:first-child { position: relative; padding-left: 24px !important; }
`;

function inyectarEstilos() {
  if (document.getElementById("renfebot-estilos-tabla")) return;
  const style = document.createElement("style");
  style.id = "renfebot-estilos-tabla";
  style.textContent = ESTILOS;
  document.head.appendChild(style);
}

export function montarCheckboxes(vigilados, alCambiar) {
  const tbody = document.querySelector(SEL.tablaTrenes);
  if (!tbody) return;
  inyectarEstilos();

  const trenes = parseTrains(document);
  const porNumero = new Map(trenes.map((t) => [t.numtren, t]));

  tbody.querySelectorAll(SEL.filaTren).forEach((fila) => {
    const numtren = numeroDeFila(fila);
    const primeraCelda = fila.querySelector("td");
    if (!primeraCelda) return;

    let caja = primeraCelda.querySelector(`.${CLASE_CAJA}`);
    if (!caja) {
      caja = document.createElement("input");
      caja.type = "checkbox";
      caja.className = CLASE_CAJA;
      caja.title = `Vigilar el tren ${numtren}`;
      caja.setAttribute("aria-label", caja.title);
      caja.addEventListener("change", () => {
        alCambiar(numtren, porNumero.get(numtren)?.salida || "", caja.checked);
      });
      primeraCelda.appendChild(caja);
      fila.setAttribute(ATTR_MARCADO, "1");
    }
    caja.checked = vigilados.some((v) => v.numtren === numtren);
  });
}

export function sincronizarCheckboxes(vigilados) {
  document.querySelectorAll(`.${CLASE_CAJA}`).forEach((caja) => {
    const fila = caja.closest("tr");
    if (!fila) return;
    const numtren = numeroDeFila(fila);
    caja.checked = vigilados.some((v) => v.numtren === numtren);
  });
}
