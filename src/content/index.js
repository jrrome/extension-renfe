import { paginaActual, tokenDeFlujo, SEL } from "../shared/selectors.js";
import {
  FASE,
  leerEstado,
  guardarEstado,
  actualizarEstado,
  reiniciarEstado,
  normalizarIntervalo,
  objetivoActivo,
  alCambiarEstado,
} from "../shared/state.js";
import { arrancarBucle, pararBucle } from "./loop.js";
import { pulsarConfirmar, hayRetoDeSeguridad } from "./book.js";
import { reenviarBusqueda } from "./refresh/byNavigation.js";
import { montarCheckboxes, sincronizarCheckboxes } from "./checkboxes.js";
import { MSG } from "../shared/messages.js";
import { montarPanel, actualizarPanel } from "./panel/panel.js";
import { fijarVerboso } from "./diagnostico.js";

const ID_OBJETIVO = "actual";

function fechaDeLaPagina() {
  return document.querySelector(SEL.fechaListaTrenes)?.value || "";
}

function avisar(tipo, datos) {
  chrome.runtime.sendMessage({ tipo, ...datos }).catch(() => {});
}

// pintar() y el callback de alCambiarEstado se lanzan sin esperar su resultado.
// sin este catch un fallo ahi desaparece sin dejar rastro
function alFallar(promesa) {
  Promise.resolve(promesa).catch((e) => console.error("[bot renfe]", e));
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

  // el campo de fecha llega vacio en un repintado a medias de renfe. si ya hay un
  // objetivo guardado, tratarlo como una busqueda nueva borraria fase, result y
  // cycle por un instante sin datos reales, no por un cambio de busqueda de verdad
  if (existente && fecha === "") return existente;

  const nuevo = { id: ID_OBJETIVO, fecha, flowToken: tokenDeFlujo(), trenes: [] };

  // la busqueda es otra: la fase, el resultado y el diagnostico de la anterior ya no
  // describen nada de esta pagina, y si no se limpian el panel sigue anunciando el
  // tren que reservaste ayer. estrategiaRefresco se deja fuera a proposito: describe
  // como se comporta la web de renfe, no esta busqueda concreta, y conviene que
  // sobreviva de una busqueda a otra en vez de perderse aqui
  await guardarEstado({
    targets: [nuevo],
    activeTargetId: ID_OBJETIVO,
    running: false,
    fase: FASE.IDLE,
    cycle: 0,
    errorStreak: 0,
    lastCycleAt: null,
    reservando: null,
    lastError: null,
    ultimoDiagnostico: null,
    result: null,
  });
  return nuevo;
}

// tras un reinicio el estado se queda sin objetivo, y sin objetivo marcar un tren no
// escribe nada y el boton principal no arranca. hay que volver a crearlo para esta
// pagina o la interfaz queda muerta hasta recargar.
async function asegurarObjetivo() {
  const estado = await leerEstado();
  if (objetivoActivo(estado)) return;
  await objetivoDeLaPagina(estado);
}

async function alternarTren(numtren, salida, marcado) {
  await actualizarEstado((estado) => {
    const objetivo = objetivoActivo(estado);
    // sin objetivo activo no hay nada que marcar: no devolver cambios evita
    // una escritura vacia que despertaria a los suscriptores sin motivo
    if (!objetivo) return null;

    const sinEl = objetivo.trenes.filter((t) => t.numtren !== numtren);
    const trenes = marcado ? [...sinEl, { numtren, salida }] : sinEl;
    trenes.sort((a, b) => a.salida.localeCompare(b.salida));

    return { targets: [{ ...objetivo, trenes }] };
  });
}

// la decision de arrancar o parar depende del estado leido, asi que tiene que
// tomarse dentro de la cola de escritura junto con el guardado; arrancarBucle y
// pararBucle quedan fuera de la transformacion porque son efectos secundarios y
// una transformacion tiene que ser pura
async function alternarBusqueda() {
  let accion = null;

  await actualizarEstado((estado) => {
    if (estado.running) {
      accion = "detener";
      return { running: false, fase: FASE.IDLE, reservando: null };
    }

    const objetivo = objetivoActivo(estado);
    if (!objetivo || objetivo.trenes.length === 0) return null;

    accion = "arrancar";
    return { running: true, fase: FASE.SCAN, cycle: 0, errorStreak: 0, lastCycleAt: Date.now(), result: null, lastError: null };
  });

  if (accion === "detener") pararBucle();
  if (accion === "arrancar") arrancarBucle();
}

async function pintar() {
  const estado = await leerEstado();
  fijarVerboso(estado.settings.debug);
  actualizarPanel(estado, objetivoActivo(estado));
  sincronizarCheckboxes(objetivoActivo(estado)?.trenes || []);
}

async function enPaginaDeTrenes(estado) {
  montarPanel({
    alPulsarPrincipal: alternarBusqueda,
    alQuitarTren: (numtren) => alternarTren(numtren, "", false).then(pintar),
    alReiniciar: async () => {
      pararBucle();
      await reiniciarEstado();
      await asegurarObjetivo();
      await pintar();
    },
    alCambiarDiagnostico: (debug) =>
      actualizarEstado((actual) => ({ settings: { ...actual.settings, debug } })),
    alCambiarIntervalo: (segundos) =>
      actualizarEstado((actual) => ({
        settings: { ...actual.settings, intervalSec: normalizarIntervalo(segundos) },
      })),
  });

  const objetivo = await objetivoDeLaPagina(estado);
  const alMarcar = (numtren, salida, marcado) => alternarTren(numtren, salida, marcado).then(pintar);

  const remontar = async () => {
    const ahora = await leerEstado();
    montarCheckboxes(objetivoActivo(ahora)?.trenes || [], alMarcar);
  };

  montarCheckboxes(objetivo.trenes, alMarcar);
  vigilarRepintados(remontar);

  // volvimos a la tabla con una reserva a medias: el tren se escapo entre el momento
  // de verlo libre y el de pulsar. la condicion se mira dentro de la cola porque
  // objetivoDeLaPagina puede haber limpiado la fase justo antes
  await actualizarEstado((ahora) => {
    if (ahora.fase !== FASE.CONFIRM || !ahora.reservando) return null;
    return { fase: FASE.SCAN, reservando: null, errorStreak: ahora.errorStreak + 1 };
  });

  // sin esto el panel se queda congelado con lo que hubiera al montarlo: el bucle
  // escribe el estado en cada paso pero nadie estaba escuchando esos cambios.
  // tambien es aqui donde se recrea el objetivo tras un reinicio del popup: ese
  // reinicio escribe el estado limpio directamente en chrome.storage, y este
  // suscriptor es lo primero que corre despues de esa escritura
  alCambiarEstado((cambiado) => {
    if (!cambiado.running) pararBucle();
    alFallar(
      (async () => {
        await asegurarObjetivo();
        await pintar();
      })()
    );
  });

  await pintar();
  const ahora = await leerEstado();
  if (ahora.running) arrancarBucle();
}

async function main() {
  const estado = await leerEstado();

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
    alFallar(guardarEstado({ running: false, fase: FASE.IDLE, reservando: null }).then(pintar));
  }

  // el popup escribe el estado limpio por su cuenta. aqui solo se corta el bucle, sin
  // escribir: las colas de escritura de los dos contextos son independientes y una
  // escritura nuestra podria aterrizar despues de la suya y resucitar los targets
  if (msg?.tipo === MSG.REINICIAR) {
    pararBucle();
    alFallar(pintar());
  }
});

main();
