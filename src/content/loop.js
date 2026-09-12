import { parseTrains } from "./parseTrains.js";
import { buscarReservable, esVigilado } from "./matchTrains.js";
import { refrescar } from "./refresh/index.js";
import { pulsarContinuar, hayRetoDeSeguridad } from "./book.js";
import { anotar, huellaDeTabla } from "./diagnostico.js";
import { crearControl } from "./generacion.js";
import { SEL } from "../shared/selectors.js";
import { FASE, leerEstado, guardarEstado, objetivoActivo } from "../shared/state.js";
import { MSG } from "../shared/messages.js";

const control = crearControl();

export function pararBucle() {
  control.cancelar();
}

// dormir en tramos cortos para que pulsar parar se note al momento en vez de
// tener que esperar al final del intervalo
async function dormir(ms, mia) {
  const TRAMO = 250;
  for (let restante = ms; restante > 0 && control.vigente(mia); restante -= TRAMO) {
    await new Promise((r) => setTimeout(r, Math.min(TRAMO, restante)));
  }
}

async function pausar(fase, motivo) {
  control.cancelar();
  await guardarEstado({ running: false, fase, lastError: motivo || null });
  chrome.runtime.sendMessage({ tipo: MSG.NOTIFICAR_PAUSA, fase, motivo }).catch(() => {});
}

const CICLOS_SIN_VIGILADOS = 3;

export async function arrancarBucle() {
  const mia = control.tomar();

  // si los trenes vigilados dejan de aparecer en la tabla, seguir girando es
  // fingir que funciona: la busqueda ya no es la que el usuario eligio
  let ciclosSinVigilados = 0;
  let fechaDeReferencia = null;

  try {
    while (control.vigente(mia)) {
      const estado = await leerEstado();
      if (!estado.running) break;

      const reto = hayRetoDeSeguridad();
      if (reto) return pausar(FASE.PAUSED_CHALLENGE, reto);

      // se relee en cada vuelta: por eso marcar y desmarcar trenes surte efecto
      // en caliente sin ningun mecanismo adicional
      const objetivo = objetivoActivo(estado);
      const vigilados = objetivo ? objetivo.trenes : [];

      // quedarse sin trenes es una accion del usuario, no una incidencia: se para
      // limpio y sin notificacion en vez de girar en vacio sin dar senales de vida
      if (vigilados.length === 0) {
        control.cancelar();
        await guardarEstado({ running: false, fase: FASE.IDLE });
        return;
      }

      await guardarEstado({ fase: FASE.SCAN });
      const trenes = parseTrains(document);
      const libre = buscarReservable(trenes, vigilados);

      // que se vigila frente a que hay en la tabla: si los vigilados no aparecen,
      // el problema no es la disponibilidad sino que la tabla es de otra busqueda
      const presentes = vigilados.filter((v) => trenes.some((t) => esVigilado(t, v)));
      const fechaEnPagina = document.querySelector(SEL.fechaListaTrenes)?.value || null;
      if (fechaDeReferencia === null) fechaDeReferencia = fechaEnPagina;

      const diagnostico = {
        ciclo: estado.cycle,
        fechaEnPagina,
        enTabla: trenes.length,
        huella: huellaDeTabla(trenes),
        vigilados: vigilados.map((v) => `${v.numtren}@${v.salida}`),
        vigiladosPresentes: presentes.map((v) => v.numtren),
        enTablaDetalle: trenes.map((t) => `${t.numtren}@${t.salida}${t.disponible ? "" : " (lleno)"}`),
        libre: libre ? libre.numtren : null,
      };

      if (fechaEnPagina !== fechaDeReferencia) {
        anotar({ ...diagnostico, alto: "la fecha de la pagina cambio" });
        return pausar(
          FASE.PAUSED_ERRORS,
          `La busqueda cambio de fecha (${fechaDeReferencia} -> ${fechaEnPagina}). Rehaz la busqueda.`
        );
      }

      // una tabla vacia es un render a medias de renfe, no que los trenes vigilados
      // hayan desaparecido: no debe contar para el guardia ni disparar su mensaje
      if (trenes.length === 0) {
        anotar({ ...diagnostico, nota: "tabla vacia, render a medias" });
        await guardarEstado({ fase: FASE.WAIT });
        await dormir(1000, mia);
        continue;
      }

      ciclosSinVigilados = presentes.length === 0 ? ciclosSinVigilados + 1 : 0;
      if (ciclosSinVigilados >= CICLOS_SIN_VIGILADOS) {
        anotar({ ...diagnostico, alto: "los vigilados no aparecen en la tabla" });
        return pausar(
          FASE.PAUSED_ERRORS,
          `Los ${vigilados.length} tren(es) que vigilas ya no estan en la tabla. Rehaz la busqueda y vuelve a marcarlos.`
        );
      }

      if (libre) {
        // se persiste antes de pulsar porque el clic navega y mata este script
        await guardarEstado({ fase: FASE.CONFIRM, reservando: { numtren: libre.numtren, at: Date.now() } });
        if (pulsarContinuar(libre.numtren)) return;
        await guardarEstado({ fase: FASE.SCAN, reservando: null, errorStreak: estado.errorStreak + 1 });
      }

      await guardarEstado({ fase: FASE.WAIT });
      await dormir(estado.settings.intervalSec * 1000, mia);
      if (!control.vigente(mia)) break;

      await guardarEstado({ fase: FASE.REFRESH });
      const resultado = await refrescar(estado.estrategiaRefresco);

      anotar({ ...diagnostico, refresco: resultado });
      const fallos = resultado.ok ? 0 : estado.errorStreak + 1;
      await guardarEstado({
        cycle: estado.cycle + 1,
        lastCycleAt: Date.now(),
        errorStreak: fallos,
        estrategiaRefresco: resultado.estrategia,
        ultimoDiagnostico: {
          enTabla: diagnostico.enTabla,
          vigilados: diagnostico.vigilados.length,
          vigiladosPresentes: diagnostico.vigiladosPresentes.length,
          refresco: resultado.ok ? resultado.via || "ok" : resultado.motivo || "fallo",
        },
      });

      if (fallos >= estado.settings.maxErrorStreak) {
        return pausar(FASE.PAUSED_ERRORS, `${fallos} ciclos fallidos seguidos`);
      }

      // el plan b navega: este script muere aqui y el ciclo sigue al cargar la pagina
      if (resultado.navegando) return;
    }
  } finally {
    if (control.vigente(mia)) control.cancelar();
  }
}
