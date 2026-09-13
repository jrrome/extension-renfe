# Bot Renfe — extensión de Chrome

Vigila los trenes que elijas en tu abono de Renfe y los reserva en cuanto queda plaza.

Adaptación de `../botRenfe` (PyQt6 + Playwright) a extensión. No pide usuario ni
contraseña ni guarda credenciales: trabaja sobre la sesión que ya tienes abierta.

## Instalación

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. **Cargar descomprimida** y elige esta carpeta.

Para pasársela a alguien, `INSTALL.md` son las mismas instrucciones escritas para quien
la recibe en vez de para quien la desarrolla, y viaja dentro del zip.

## Empaquetar

```bash
./empaquetar.sh
```

Deja en `dist/` un zip con lo único que Chrome necesita: el manifest, los iconos, `src/`
y el `INSTALL.md`. Fuera quedan `node_modules`, los tests, la página de previsualización
y la configuración de npm — 27 MB de carpeta se convierten en 36 KB de zip.

Corre los tests antes y aborta si fallan, y después comprueba que en el paquete están
todas las rutas que el manifest referencia. Una ruta rota ahí solo se nota al cargar la
extensión, que ya es tarde.

El zip contiene una carpeta con nombre, no los archivos sueltos: quien lo descomprime se
encuentra algo que puede elegir directamente en Chrome.

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

### Modo diagnóstico

Por defecto el panel habla en corto: "Buscando plaza" en vez de las tres fases internas
del ciclo, "ultimo intento hace 12 s" en vez del número de ciclo, y ningún volcado en
consola. Es lo que le importa a quien solo quiere un asiento.

El interruptor **Modo diagnostico** del popup enciende el resto: fases reales, contador
de ciclos, cuántos trenes hay en la tabla, cuántos de los vigilados están presentes, el
resultado del refresco, y una línea por ciclo en la consola con el prefijo `[bot renfe]`.

El registro **se graba siempre**, esté encendido o no; lo que se apaga es la impresión.
Así, cuando algo falle sin el debug puesto, sigue estando todo:

```js
__botRenfeDiagnostico()
```

### El estado caduca solo

Una búsqueda real dura media hora; el estado guardado duraba para siempre. Ahora cada
escritura deja un sello y `leerEstado` decide qué hacer con él:

| Sin actividad | Qué pasa |
|---|---|
| menos de 1 h | nada: si quedó en marcha, se reanuda al volver a la tabla |
| de 1 h a 24 h | deja de reanudarse sola, pero **conserva los trenes marcados** |
| más de 24 h | se olvida todo menos el intervalo y el modo diagnóstico |

El umbral corto es el que importa: sin él, abrir Renfe días después ponía la extensión a
buscar —y a reservar— una búsqueda que ya no querías.

El botón **↺** del panel (visible solo cuando no está buscando) y el **Reiniciar** del
popup hacen lo mismo a mano. El del popup escribe el estado directamente, sin pasar por
el content script, así que funciona desde cualquier pestaña: es la salida cuando algo se
queda atascado y no estás en la página de trenes.

## Estructura

```
src/shared/      selectors.js (todo el acoplamiento con el html de Renfe)
                 state.js (chrome.storage, caducidad, reinicio) · textos.js · messages.js
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

También la caducidad del estado por sus dos umbrales, el reinicio, el acotado del
intervalo, la serialización de escrituras (con un `chrome.storage` de mentira con retardo,
que es lo que hace que la carrera se reproduzca) y el redactado de los dos modos.

No están cubiertos por tests, y necesitan comprobación manual contra Renfe: el
refresco real, la reserva de punta a punta, el watchdog del service worker y la
detección de captcha/clave SMS.

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
- **La caída de sesión se detecta tarde.** El content script solo se inyecta en
  `venta.renfe.com/vol/*`, así que cuando Renfe te echa fuera no hay nadie escuchando.
  Quien lo caza es el watchdog del service worker, a los 2 minutos sin señales de vida, y
  lo hace como "pausado por errores", sin distinguir la causa. Detectarlo al momento
  exigiría cargar la extensión en todas las páginas del dominio, y no compensa.
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
