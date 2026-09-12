import { SEL } from "../../shared/selectors.js";

// plan b cuando renfe no relanza la busqueda por ajax. vuelve al formulario y
// reenvia. no se usa location.reload() porque la tabla llega de un post y chrome
// pediria confirmacion de reenvio de formulario.
// esta ruta navega, asi que el ciclo continua en el siguiente arranque del content
// script leyendo la fase guardada.

// ojo: #botonVolver es un <a href="trainFormalization.do?c=...#">, es decir un
// enlace a la propia pagina con un fragmento. por si solo no navega: lo que
// navega es el handler de renfe. por eso no basta con pulsar, hay que comprobar
// que la pagina se va de verdad.
export function volverAlFormulario({ tiempoEsperaMs = 6000 } = {}) {
  const volver = document.querySelector(SEL.botonVolver);
  if (!volver) return Promise.resolve({ ok: false, motivo: "no existe #botonVolver" });

  const urlAntes = location.href;
  volver.click();

  return new Promise((resolve) => {
    const inicio = Date.now();
    const revisar = () => {
      if (document.visibilityState === "hidden" || location.href !== urlAntes) {
        return resolve({ ok: true });
      }
      if (Date.now() - inicio > tiempoEsperaMs) {
        return resolve({ ok: false, motivo: "se pulso volver pero la pagina no navego" });
      }
      setTimeout(revisar, 200);
    };
    revisar();
  });
}

export function reenviarBusqueda() {
  const siguiente = document.querySelector(SEL.botonSiguiente);
  if (!siguiente) return false;
  siguiente.click();
  return true;
}
