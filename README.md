# Bot Renfe — extensión de Chrome

Vigila los trenes que elijas en tu abono de Renfe y los reserva en cuanto queda plaza.

Adaptación de `../botRenfe` (PyQt6 + Playwright) a extensión. No pide usuario ni
contraseña ni guarda credenciales: trabaja sobre la sesión que ya tienes abierta.

## Instalación

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. **Cargar descomprimida** y elige esta carpeta.

## Uso

1. Inicia sesión en `venta.renfe.com`.
2. Entra en tu abono, pulsa **nueva formalización** y elige sentido y fecha.
3. Con la **tabla de trenes** delante, marca las casillas de los trenes que quieras.
4. Pulsa **Buscar** en el panel de abajo a la derecha.

Puedes marcar y desmarcar trenes mientras busca: la lista se relee en cada ciclo.
Cuando consigue uno, para y lanza una notificación.

La extensión solo actúa en la página de resultados (`trainFormalization.do`) y en la
de confirmación (`detailsFormalization.do`). En cualquier otra no hace nada.

## Cómo funciona

La tabla de trenes de Renfe se pinta por AJAX, así que el ciclo normal **no navega**:
se relanza la búsqueda en la propia página y se vuelve a leer la tabla.

```
comprobar tabla ─┬─ ningún tren libre ─▶ esperar N s ─▶ refrescar ─┐
                 │                                                  │
                 │                          ◀───────────────────────┘
                 └─ tren libre ─▶ continuar{N} ─▶ submitSiguiente ─▶ reservado
```

Si Renfe no relanza la búsqueda por AJAX, se detecta en el primer ciclo y se pasa
a la ruta por navegación (volver al formulario y reenviar), que sí navega. En ese
caso el estado vive en `chrome.storage` y el ciclo se reanuda en cada carga.

### Disponibilidad

Un tren se considera cogible si la celda de clase **no** dice "Completo" y el botón
`#continuar{N}` existe y no está deshabilitado. La primera condición viene del bot
original; la segunda es la que garantiza que se puede pulsar.

Verificado con HTML real: cuando un tren está lleno, Renfe no pone "Completo" en la
celda de clase — **sustituye la celda de clase y la del botón por una sola**:

```html
<td colspan="2" class="font01">Tren completo, sin plazas disponibles en este horario.</td>
```

Es decir, desaparecen tanto `#clase{N}` como `#continuar{N}`. La segunda condición es
la que cubre este caso.

### Detección del refresco

Saber si Renfe ha repintado la tabla **no** se hace observando mutaciones del `tbody`:
la propia extensión lo muta al remontar los checkboxes y eso daba falsos positivos, con
el bucle girando indefinidamente sobre datos rancios. Se hace marcando las filas con un
atributo antes de refrescar y comprobando después si Renfe las ha sustituido.

Dos condiciones, y las dos importan: hacen falta filas **nuevas** y que **haya filas**.
Renfe vacía el `tbody` antes de repoblarlo, así que dar por terminado el repintado al
verlo vacío hacía que el bucle escanease a mitad de render, encontrase cero trenes y
concluyera que los trenes vigilados habían desaparecido. Una tabla vacía significa
"todavía no", nunca "ya está".

### Arranque y parada

El bucle se controla con tokens (`src/content/generacion.js`), no con un booleano.
Con un booleano había carrera: parar no surtía efecto hasta que el bucle salía de su
`await` (hasta 8 s) y un arranque en esa ventana se descartaba por creer que ya había
un bucle vivo, dejando `running: true` sin nadie ejecutando.

### El panel sigue al estado

El content script está suscrito a `chrome.storage` y repinta en cada cambio. Sin eso el
panel se quedaba congelado con lo que hubiera al montarlo, y el botón podía mostrar
"Buscar" cuando el estado real era `running`.

### Cuando la búsqueda deja de ser la del usuario

Si la fecha de la página cambia, o si los trenes vigilados dejan de aparecer en la tabla
durante 3 ciclos, el bucle **para y lo dice** en vez de seguir girando en vacío.

### Diagnóstico

Cada ciclo deja un registro en la consola con el prefijo `[bot renfe]`: cuántos trenes
hay en la tabla, cuáles se vigilan, cuáles de ellos están realmente presentes, la huella
del contenido y el resultado del refresco. El panel muestra un resumen. Para volcarlo
entero desde la consola de la pestaña:

```js
__botRenfeDiagnostico()
```

## Estructura

```
src/shared/      selectors.js (todo el acoplamiento con el html de Renfe)
                 state.js (chrome.storage) · messages.js
src/content/     index.js (entrada y máquina de estados) · loop.js (el bucle)
                 parseTrains.js · matchTrains.js · checkboxes.js · book.js
                 refresh/ (en sitio y por navegación) · panel/ (HUD) · pageScript.js
src/background/  service_worker.js (notificaciones, badge, vigilancia)
src/popup/       instrucciones, estado y parada de emergencia
```

## Tests

```bash
npm install
npm test
```

Cubren las funciones puras contra **HTML real** capturado de una sesión
(`test/fixtures/`, extraído de `../html`): parseo de la tabla, detección de
disponibilidad, emparejamiento de trenes vigilados, estado por defecto e inyección
de checkboxes.

No están cubiertos por tests, y necesitan comprobación manual contra Renfe: el
refresco real, la reserva de punta a punta, la detección de caída de sesión y la
de captcha/clave SMS.

Para ver el panel sin necesidad de una sesión de Renfe abierta:

```bash
python3 -m http.server 8771
```

y abre `http://127.0.0.1:8771/dev/preview.html`, que lo pinta en sus distintos estados.

## Limitaciones conocidas

- **Abonos ilimitados no soportados.** No hay `<select>` de origen/destino en las
  páginas capturadas, así que esa ruta no se pudo verificar y se dejó fuera.
- **Un solo objetivo.** Una fecha y un sentido a la vez. El estado ya es una lista
  de `targets` para poder añadir varios sin reescribirlo.
- **Sin re-login automático.** Si Renfe cierra la sesión, la extensión pausa y avisa.
  Al volver a una tabla de la misma búsqueda, reanuda sola.
- **La fecha que muestra el panel** sale de `#dateTrainList`. En las capturas ese campo
  trae la fecha de hoy mientras que el atributo `fecha=` de los enlaces dice otra cosa;
  queda por confirmar en uso real cuál refleja la búsqueda.
- **`#botonVolver` es un enlace a la propia página** (`trainFormalization.do?c=...#`), así
  que pulsarlo no navega por sí solo: depende de un handler de Renfe. El plan B comprueba
  que la navegación ocurre de verdad antes de darla por buena.
- **Nunca resuelve captchas ni claves SMS.** Los detecta, pausa y avisa.

## Origen de los selectores

Todo lo de `src/shared/selectors.js` está verificado contra capturas reales de una
sesión del 2026-08-27 (`../html`), no deducido del código Python. El diseño completo
y los hallazgos están en `../docs/superpowers/specs/2026-08-27-extension-renfe-design.md`.
