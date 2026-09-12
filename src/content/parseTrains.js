export const SELECTOR_TBODY = "#listTrainsTableTbodyNEW";
const SELECTOR_TRAIN_ROW = 'tr[id^="row"]';
const TEXTO_COMPLETO = "completo";

// el data-label de duracion llega acentuado y su codificacion no es fiable entre
// paginas guardadas y la web real, asi que se compara normalizado y por prefijo
function normaliza(texto) {
  return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function celda(fila, prefijoLabel) {
  const celdas = [...fila.querySelectorAll("td[data-label]")];
  return celdas.find((td) => normaliza(td.getAttribute("data-label")).startsWith(prefijoLabel));
}

function textoCelda(fila, prefijoLabel) {
  const td = celda(fila, prefijoLabel);
  return td ? td.textContent.trim() : "";
}

// el boton continuar{N} es lo que hay que pulsar para reservar: si no esta o esta
// deshabilitado el tren no se puede coger, diga lo que diga la celda de clase
function botonSeleccionar(fila, numtren) {
  const boton = fila.querySelector(`button[id="continuar${numtren}"]`);
  if (!boton || boton.disabled) return null;
  return boton;
}

// el atributo tren del boton es la fuente limpia; el id de la fila es el respaldo
// si renfe deja de ponerlo. nunca se convierte a numero: los codigos llevan ceros
// a la izquierda y el selector continuar{N} los necesita
export function numeroDeFila(fila) {
  const boton = fila.querySelector("button[tren]");
  const desdeBoton = boton && boton.getAttribute("tren");
  return desdeBoton || fila.id.replace(/^row/, "");
}

export function parseTrains(root) {
  const tbody = root.querySelector(SELECTOR_TBODY);
  if (!tbody) return [];

  return [...tbody.querySelectorAll(SELECTOR_TRAIN_ROW)].map((fila) => {
    const numtren = numeroDeFila(fila);
    const clase = textoCelda(fila, "clase");
    const seleccionable = botonSeleccionar(fila, numtren) !== null;
    return {
      numtren,
      salida: textoCelda(fila, "salida"),
      llegada: textoCelda(fila, "llegada"),
      duracion: textoCelda(fila, "duraci"),
      tipo: textoCelda(fila, "tren"),
      clase,
      disponible: seleccionable && !normaliza(clase).includes(TEXTO_COMPLETO),
    };
  });
}
