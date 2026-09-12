import { refrescarEnSitio } from "./inPlace.js";
import { volverAlFormulario } from "./byNavigation.js";

export const ESTRATEGIA = { SITIO: "sitio", NAVEGACION: "navegacion" };

// un render lento suelto no debe condenar al bucle a la ruta de navegacion, que
// depende de un handler de renfe que no controlamos. hacen falta dos fallos
// seguidos del refresco en sitio para cambiar de estrategia.
const FALLOS_PARA_CAMBIAR = 2;
let fallosSeguidos = 0;

// mientras el refresco en sitio funcione se usa siempre. solo tras dos fallos
// seguidos se pasa a navegar, y a partir de ahi ya no se vuelve a probar.
export async function refrescar(estrategiaConocida) {
  if (estrategiaConocida === ESTRATEGIA.NAVEGACION) {
    const salida = await volverAlFormulario();
    return { navegando: salida.ok, estrategia: ESTRATEGIA.NAVEGACION, ...salida };
  }

  const resultado = await refrescarEnSitio();
  if (resultado.ok) {
    fallosSeguidos = 0;
    return { navegando: false, estrategia: ESTRATEGIA.SITIO, ok: true, via: resultado.via };
  }

  fallosSeguidos += 1;
  if (fallosSeguidos < FALLOS_PARA_CAMBIAR) {
    return {
      navegando: false,
      estrategia: ESTRATEGIA.SITIO,
      ok: false,
      motivo: resultado.motivo,
      reintento: fallosSeguidos,
    };
  }

  const salida = await volverAlFormulario();
  return {
    navegando: salida.ok,
    estrategia: ESTRATEGIA.NAVEGACION,
    ok: salida.ok,
    motivo: salida.motivo,
    motivoCambio: resultado.motivo,
  };
}
