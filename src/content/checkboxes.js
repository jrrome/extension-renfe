import { SEL } from "../shared/selectors.js";
import { parseTrains, numeroDeFila } from "./parseTrains.js";

const CLASE_CAJA = "renfebot-check";
const ATTR_MARCADO = "data-renfebot-listo";

// el checkbox se posiciona encima de la celda de avisos en vez de anadir una
// columna, para no alterar el layout ni el numero de celdas de la tabla de renfe
const ESTILOS = `
.${CLASE_CAJA} {
  position: absolute; left: 2px; top: 50%; transform: translateY(-50%);
  width: 17px; height: 17px; margin: 0; cursor: pointer; z-index: 5;
  accent-color: #6b1f7c;
}
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
      caja.title = "vigilar este tren";
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
