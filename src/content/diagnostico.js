// registro por ciclo para poder ver donde se atasca el bucle sin tener que
// adivinar. se imprime en consola y lo ultimo se muestra en el panel.
const PREFIJO = "[bot renfe]";
const MAXIMO = 40;

const registro = [];

// huella del contenido de la tabla: si no cambia entre ciclos, el refresco es
// falso por muy "ok" que diga
export function huellaDeTabla(trenes) {
  return trenes.map((t) => `${t.numtren}:${t.disponible ? "L" : "X"}`).join(",");
}

export function anotar(entrada) {
  const linea = { at: Date.now(), ...entrada };
  registro.push(linea);
  if (registro.length > MAXIMO) registro.shift();
  console.log(PREFIJO, `ciclo ${linea.ciclo}`, linea);
  return linea;
}

export function ultimaAnotacion() {
  return registro[registro.length - 1] || null;
}

export function volcado() {
  return registro.slice();
}

// para poder pedirle al usuario que lo copie de la consola
if (typeof window !== "undefined") {
  window.__botRenfeDiagnostico = volcado;
}
