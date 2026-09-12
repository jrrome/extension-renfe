// todo el acoplamiento con el html de renfe vive aqui. verificado contra capturas
// reales de una sesion del 2026-08-27 guardadas en ../../html

export const URL_VOL = "https://venta.renfe.com/vol/";

export const PAGINA = {
  ABONOS: "myPassesCard.do",
  FORMULARIO: "journeyFormalization.do",
  TRENES: "trainFormalization.do",
  DETALLE: "detailsFormalization.do",
  COMPRADO: "buyFormalization",
};

export const SEL = {
  tablaTrenes: "#listTrainsTableTbodyNEW",
  filaTren: 'tr[id^="row"]',
  botonContinuar: (numtren) => `button[id="continuar${numtren}"]`,
  botonSiguiente: "#submitSiguiente",
  botonVolver: "#botonVolver",
  fechaListaTrenes: "#dateTrainList",
  tokenFlujo: 'input[name="compraActual"]',
  modalClaveSms: "#form-modal-claveSMS",
  recaptcha: ".g-recaptcha, iframe[src*='recaptcha']",
};

export function paginaActual(href = location.href) {
  if (href.includes(PAGINA.COMPRADO)) return "COMPRADO";
  if (href.includes(PAGINA.DETALLE)) return "DETALLE";
  if (href.includes(PAGINA.TRENES)) return "TRENES";
  if (href.includes(PAGINA.FORMULARIO)) return "FORMULARIO";
  if (href.includes(PAGINA.ABONOS)) return "ABONOS";
  return "OTRA";
}

export function sesionViva(href = location.href) {
  return href.startsWith(URL_VOL);
}

export function tokenDeFlujo(doc = document) {
  const input = doc.querySelector(SEL.tokenFlujo);
  if (input) return input.value;
  const m = location.search.match(/[?&]c=([^&]+)/);
  return m ? m[1] : null;
}
