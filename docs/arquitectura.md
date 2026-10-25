# Arquitectura y diagnóstico

La extensión no se compila ni usa bibliotecas en ejecución. `boot.js` importa los módulos de contenido; el service worker gestiona notificaciones, badge y vigilancia. El estado compartido reside en `chrome.storage.local`.

## Ciclo de búsqueda

1. Leer selección y estado, detectar verificaciones visibles y analizar la tabla.
2. Si un tren vigilado está disponible, guardar la fase de confirmación, volver a comprobar la cancelación y pulsar su botón `continuar{N}`.
3. En la página de detalle, comprobar la fase y pulsar `submitSiguiente` si corresponde.
4. Al llegar a la página de compra, guardar el resultado, detener la búsqueda y notificar.
5. Si no hay plaza, esperar el intervalo y relanzar la búsqueda antes de volver a leer la tabla.

La disponibilidad exige un botón habilitado y una clase que no indique «Completo». En el HTML capturado de Renfe, un tren lleno puede perder tanto la celda de clase como el botón; la ausencia del botón también lo descarta.

## Refresco de la tabla

La vía preferida reaplica la fecha a través del datepicker de Renfe. `pageScript.js` se ejecuta en el contexto de la página para acceder a su jQuery y se comunica con el script de contenido mediante eventos DOM.

Antes del refresco se marcan las filas actuales. Se considera terminado cuando hay filas nuevas, sin esa marca. Una tabla vacía representa un render en curso; los checkboxes que añade la extensión no cuentan como una actualización de Renfe.

Tras dos fallos consecutivos del refresco en sitio se pasa a navegación: volver al formulario y reenviar la búsqueda. Una pestaña oculta o un cambio de fragmento `#` no demuestran que haya navegado. El estado persistido permite continuar en la página siguiente.

## Parada y caducidad

Cada ejecución del bucle tiene un token; parar lo invalida inmediatamente. El popup avisa a todas las pestañas de Renfe y guarda el estado detenido, incluso si no queda ningún script de contenido disponible. El bucle comprueba de nuevo token y estado después de guardar la fase de confirmación, antes de pulsar.

Las escrituras se serializan dentro de cada contexto JavaScript. Esa cola no constituye un bloqueo entre pestañas: el estado es global y se admite una sola pestaña de formalización.

El sello de actividad impide reanudar automáticamente después de una hora y descarta la selección después de 24 horas. El intervalo y el modo diagnóstico sobreviven al reinicio.

La vigilancia del service worker usa una alarma por minuto y pausa un bucle que lleva dos minutos sin latido. Los tiempos de las alarmas dependen de Chrome. El arranque registra el primer latido para poder detectar también un bloqueo en el primer ciclo.

## Diagnóstico

El modo diagnóstico se activa en el popup. Muestra las fases internas, número de ciclo, trenes presentes y resultado del refresco. Además imprime una entrada por ciclo con el prefijo `[bot renfe]`.

El registro en memoria conserva hasta 40 entradas aunque el modo diagnóstico esté apagado. En DevTools de la pestaña, selecciona el contexto de ejecución de la extensión y ejecuta:

```js
__botRenfeDiagnostico()
```

El registro se pierde al navegar o recargar: no es un historial persistente.

## Selectores y verificación manual

`src/shared/selectors.js` concentra los selectores de navegación; `parseTrains.js` usa los atributos `data-label` de las celdas. Los fixtures proceden de fragmentos de tablas capturadas durante el desarrollo y sustituyen los identificadores de flujo por `demo`.

Las pruebas locales no certifican la compatibilidad actual con el sitio de Renfe. Antes de confiar en una búsqueda real hay que comprobar su fecha, el refresco, la continuidad entre pantallas y el resultado final mostrado por Renfe.
