// El popup real usa un almacenamiento de ejemplo, sin permisos ni conexiones a Renfe.
export async function montarPopupDemo(iframe, estado) {
  const base = new URL("../src/popup/", import.meta.url).href;
  const mock = `let almacen = ${JSON.stringify(estado)};
    const listeners = [];
    window.chrome = {
      storage: { local: {
        async get() { return { estado: structuredClone(almacen) }; },
        async set(datos) { almacen = structuredClone(datos.estado); listeners.forEach(fn => fn({ estado: { newValue: almacen } }, "local")); },
      }, onChanged: { addListener(fn) { listeners.push(fn); } } },
      tabs: { async query() { return []; }, async sendMessage() {}, async create() { console.info("Vista previa: abrir Renfe"); } },
    };`;
  const html = await (await fetch(new URL("../src/popup/popup.html", import.meta.url))).text();
  iframe.addEventListener("load", () => {
    // El componente gestiona su propio scroll; el iframe solo se ajusta a su altura.
    iframe.contentDocument.documentElement.style.overflow = "hidden";
    const ajustar = () => {
      const body = iframe.contentDocument.body;
      iframe.style.height = `${Math.ceil(Math.max(body.getBoundingClientRect().height, body.scrollHeight))}px`;
    };
    new ResizeObserver(ajustar).observe(iframe.contentDocument.body);
    ajustar();
  });
  iframe.srcdoc = html.replace("<head>", `<head><base href="${base}"><script>${mock}<\/script>`);
}
