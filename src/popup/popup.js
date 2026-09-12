import { leerEstado, actualizarEstado, reiniciarEstado, objetivoActivo, alCambiarEstado } from "../shared/state.js";
import { textoDeFase } from "../shared/textos.js";
import { MSG } from "../shared/messages.js";

function pintar(estado) {
  const objetivo = objetivoActivo(estado);
  const pausado = String(estado.fase).startsWith("PAUSED");
  const debug = estado.settings.debug;

  document.getElementById("punto").className = `punto${estado.running ? " on" : ""}${pausado ? " err" : ""}`;
  document.getElementById("fase").textContent = textoDeFase(estado.fase, debug);

  const partes = [];
  if (objetivo?.fecha) partes.push(objetivo.fecha);
  if (objetivo?.trenes.length) partes.push(`${objetivo.trenes.length} tren(es) vigilados`);
  if (debug && estado.running) partes.push(`ciclo ${estado.cycle}`);
  if (estado.lastError) partes.push(estado.lastError);
  document.getElementById("detalle").textContent = partes.join(" · ");

  document.getElementById("parar").hidden = !estado.running;
  document.getElementById("debug").checked = debug;
}

async function pestanaActiva() {
  const [pestana] = await chrome.tabs.query({ active: true, currentWindow: true });
  return pestana || null;
}

document.getElementById("parar").addEventListener("click", async () => {
  const pestana = await pestanaActiva();
  if (pestana) chrome.tabs.sendMessage(pestana.id, { tipo: MSG.PARAR }).catch(() => {});
});

// se avisa antes de escribir para que el bucle corte ya, sin esperar al siguiente
// ciclo. es un mensaje de reinicio y no el de parar porque su handler en el content
// script no escribe en el storage: si escribiera, esa escritura podria aterrizar
// despues de la de aqui abajo y resucitar los targets que el reinicio acaba de borrar
document.getElementById("reiniciar").addEventListener("click", async () => {
  const pestana = await pestanaActiva();
  if (pestana) chrome.tabs.sendMessage(pestana.id, { tipo: MSG.REINICIAR }).catch(() => {});
  await reiniciarEstado();
});

// actualizarEstado lee el estado actual dentro de su propia cola de escritura, asi
// que el resto de settings (por ejemplo intervalSec) nunca se pisan con una foto
// vieja. tambien evita que el marcado del usuario compita consigo mismo: pintar
// solo vuelve a fijar "checked" cuando la escritura ya aterrizo en el storage
document.getElementById("debug").addEventListener("change", (e) => {
  const marcado = e.target.checked;
  actualizarEstado((estado) => ({ settings: { ...estado.settings, debug: marcado } }));
});

leerEstado().then(pintar);
alCambiarEstado(pintar);
