// se inyecta en el contexto de la pagina para poder usar el jquery de renfe. los
// content scripts corren aislados y no ven ni jquery ni los handlers del datepicker.
// se comunica con el content script por CustomEvent.
(() => {
  const PEDIR = "renfebot:refrescar";
  const RESPONDER = "renfebot:refrescado";
  const SELECTOR_FECHA = "#dateTrainList";

  function responder(ok, via, error) {
    document.dispatchEvent(new CustomEvent(RESPONDER, { detail: { ok, via, error: error || null } }));
  }

  // el listado de trenes se repinta por ajax cuando el datepicker confirma una fecha.
  // reaplicar la fecha que ya esta puesta relanza esa misma busqueda sin navegar.
  function relanzarBusqueda() {
    const jq = window.jQuery || window.$;
    if (!jq) return responder(false, null, "jquery no disponible");

    const campo = jq(SELECTOR_FECHA);
    if (!campo.length) return responder(false, null, "no existe " + SELECTOR_FECHA);

    const fecha = campo.val();

    try {
      const onSelect = campo.datepicker("option", "onSelect");
      if (typeof onSelect === "function") {
        onSelect.call(campo[0], fecha, campo.datepicker("widget").data("datepicker"));
        return responder(true, "onSelect");
      }
    } catch (e) {
      // el datepicker puede no estar inicializado todavia, se prueba el siguiente camino
    }

    try {
      campo.trigger("change");
      return responder(true, "change");
    } catch (e) {
      return responder(false, null, String(e));
    }
  }

  document.addEventListener(PEDIR, relanzarBusqueda);
  document.dispatchEvent(new CustomEvent("renfebot:page-script-listo"));
})();
