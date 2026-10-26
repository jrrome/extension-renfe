import { FASE, leerEstado, actualizarEstado, reiniciarEstado, objetivoActivo, alCambiarEstado } from "../shared/state.js";
import { MSG } from "../shared/messages.js";
import { crearInterfaz, conectarInterfaz, pintarInterfaz, actualizarTemporizador } from "../shared/ui.js";

const app = document.getElementById("app");
app.innerHTML = crearInterfaz({ popup: true });

async function avisarPestanasRenfe(tipo) {
  const pestanas = await chrome.tabs.query({ url: "https://venta.renfe.com/*" });
  await Promise.allSettled(pestanas.map((pestana) => chrome.tabs.sendMessage(pestana.id, { tipo })));
}

conectarInterfaz(app, {
  async alParar() {
    await avisarPestanasRenfe(MSG.PARAR);
    await actualizarEstado(() => ({ running: false, fase: FASE.IDLE, reservando: null }));
  },
  async alReiniciar() {
    await avisarPestanasRenfe(MSG.REINICIAR);
    await reiniciarEstado();
  },
  async alAbrir() {
    const pestanas = await chrome.tabs.query({ url: "https://venta.renfe.com/vol/*" });
    const pestana = pestanas.find(p => p.active) || pestanas[0];
    if (pestana) {
      await chrome.tabs.update(pestana.id, { active: true });
      if (pestana.windowId !== undefined) await chrome.windows.update(pestana.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: "https://venta.renfe.com/vol/myPassesCard.do" });
    }
  },
  alCambiarIntervalo: intervalSec => actualizarEstado(estado => ({ settings: { ...estado.settings, intervalSec } })),
  alCambiarDiagnostico: debug => actualizarEstado(estado => ({ settings: { ...estado.settings, debug } })),
  alQuitarTren: numero => actualizarEstado(estado => {
    const objetivo = objetivoActivo(estado);
    if (!objetivo) return null;
    const trenes = objetivo.trenes.filter(tren => tren.numtren !== numero);
    return {
      targets: estado.targets.map(t => t.id === objetivo.id ? { ...t, trenes } : t),
      ...(trenes.length ? {} : { running: false, fase: FASE.IDLE, reservando: null }),
    };
  }),
});

const pintar = estado => pintarInterfaz(app, estado, objetivoActivo(estado));
leerEstado().then(pintar);
alCambiarEstado(pintar);
document.defaultView.setInterval(() => actualizarTemporizador(app), 1000);
