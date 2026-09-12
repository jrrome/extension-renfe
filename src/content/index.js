import { paginaActual, sesionViva, tokenDeFlujo, SEL } from "../shared/selectors.js";
import { FASE, leerEstado, guardarEstado, objetivoActivo, alCambiarEstado } from "../shared/state.js";
import { arrancarBucle, pararBucle } from "./loop.js";
import { pulsarConfirmar, hayRetoDeSeguridad } from "./book.js";
import { reenviarBusqueda } from "./refresh/byNavigation.js";
import { montarCheckboxes, sincronizarCheckboxes } from "./checkboxes.js";
import { MSG } from "../shared/messages.js";
import { montarPanel, actualizarPanel } from "./panel/panel.js";

const ID_OBJETIVO = "actual";

function fechaDeLaPagina() {
  return document.querySelector(SEL.fechaListaTrenes)?.value || "";
}

function avisar(tipo, datos) {
  chrome.runtime.sendMessage({ tipo, ...datos }).catch(() => {});
}

// el refresco en sitio sustituye el tbody entero y se lleva por delante los
// checkboxes inyectados, asi que hay que volver a ponerlos en cada repintado
function vigilarRepintados(alRepintar) {
  const tbody = document.querySelector(SEL.tablaTrenes);
  if (!tbody) return;

  // se observa la tabla y no el tbody porque renfe puede sustituir el tbody
  // entero; observando el tbody el observador se quedaria mirando un nodo suelto
  const raiz = tbody.closest("table") || tbody.parentNode;

  let ocupado = false;
  const observer = new MutationObserver(async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      await alRepintar();
    } finally {
      ocupado = false;
    }
  });
  observer.observe(raiz, { childList: true, subtree: true });
}

async function objetivoDeLaPagina(estado) {
  const fecha = fechaDeLaPagina();
  const existente = objetivoActivo(estado);

  // una busqueda distinta invalida los trenes vigilados: los numeros de tren de
  // otra fecha no significan nada aqui
  if (existente && existente.fecha === fecha) return existente;

  const nuevo = { id: ID_OBJETIVO, fecha, flowToken: tokenDeFlujo(), trenes: [], enabled: true };
  await guardarEstado({ targets: [nuevo], activeTargetId: ID_OBJETIVO });
  return nuevo;
}

async function alternarTren(numtren, salida, marcado) {
  const estado = await leerEstado();
  const objetivo = objetivoActivo(estado);
  if (!objetivo) return;

  const sinEl = objetivo.trenes.filter((t) => t.numtren !== numtren);
  objetivo.trenes = marcado ? [...sinEl, { numtren, salida }] : sinEl;
  objetivo.trenes.sort((a, b) => a.salida.localeCompare(b.salida));

  await guardarEstado({ targets: [objetivo] });
}

async function alternarBusqueda() {
  const estado = await leerEstado();
  if (estado.running) {
    pararBucle();
    await guardarEstado({ running: false, fase: FASE.IDLE });
    return;
  }
  const objetivo = objetivoActivo(estado);
  if (!objetivo || objetivo.trenes.length === 0) return;

  await guardarEstado({ running: true, fase: FASE.SCAN, cycle: 0, errorStreak: 0, result: null, lastError: null });
  arrancarBucle();
}

async function pintar() {
  const estado = await leerEstado();
  actualizarPanel(estado, objetivoActivo(estado));
  sincronizarCheckboxes(objetivoActivo(estado)?.trenes || []);
}

async function enPaginaDeTrenes(estado) {
  montarPanel({
    alPulsarPrincipal: alternarBusqueda,
    alQuitarTren: (numtren) => alternarTren(numtren, "", false).then(pintar),
    alCambiarIntervalo: async (segundos) => {
      const actual = await leerEstado();
      await guardarEstado({ settings: { ...actual.settings, intervalSec: segundos } });
    },
  });

  const objetivo = await objetivoDeLaPagina(estado);
  const alMarcar = (numtren, salida, marcado) => alternarTren(numtren, salida, marcado).then(pintar);

  const remontar = async () => {
    const ahora = await leerEstado();
    montarCheckboxes(objetivoActivo(ahora)?.trenes || [], alMarcar);
  };

  montarCheckboxes(objetivo.trenes, alMarcar);
  vigilarRepintados(remontar);

  // volvimos a la tabla con una reserva a medias: el tren se escapo entre el
  // momento de verlo libre y el de pulsar
  if (estado.fase === FASE.CONFIRM && estado.reservando) {
    await guardarEstado({ fase: FASE.SCAN, reservando: null, errorStreak: estado.errorStreak + 1 });
  }

  // la sesion volvio y estamos en la misma busqueda: se reanuda solo
  if (estado.fase === FASE.PAUSED_SESSION && objetivo.trenes.length > 0) {
    await guardarEstado({ running: true, fase: FASE.SCAN, flowToken: tokenDeFlujo() });
  }

  // sin esto el panel se queda congelado con lo que hubiera al montarlo: el bucle
  // escribe el estado en cada paso pero nadie estaba escuchando esos cambios
  alCambiarEstado(() => pintar());

  await pintar();
  const ahora = await leerEstado();
  if (ahora.running) arrancarBucle();
}

async function main() {
  const estado = await leerEstado();

  if (!sesionViva()) {
    if (estado.running) {
      pararBucle();
      await guardarEstado({ running: false, fase: FASE.PAUSED_SESSION });
      avisar(MSG.NOTIFICAR_PAUSA, { fase: FASE.PAUSED_SESSION, motivo: "Renfe ha cerrado la sesion" });
    }
    return;
  }

  switch (paginaActual()) {
    case "COMPRADO":
      if (estado.reservando) {
        await guardarEstado({ running: false, fase: FASE.DONE, result: estado.reservando, reservando: null });
        avisar(MSG.NOTIFICAR_RESERVA, { numtren: estado.reservando.numtren });
      }
      return;

    case "DETALLE":
      if (estado.running && estado.fase === FASE.CONFIRM) {
        const reto = hayRetoDeSeguridad();
        if (reto) {
          await guardarEstado({ running: false, fase: FASE.PAUSED_CHALLENGE, lastError: reto });
          avisar(MSG.NOTIFICAR_PAUSA, { fase: FASE.PAUSED_CHALLENGE, motivo: reto });
          return;
        }
        pulsarConfirmar();
      }
      return;

    case "FORMULARIO":
      if (estado.running && estado.fase === FASE.REFRESH) reenviarBusqueda();
      return;

    case "TRENES":
      await enPaginaDeTrenes(estado);
      return;

    default:
      return;
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.tipo === MSG.PARAR) {
    pararBucle();
    guardarEstado({ running: false, fase: FASE.IDLE }).then(pintar);
  }
});

main();
