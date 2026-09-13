# Bot Renfe — instalación y uso

Vigila los trenes que tú elijas en tu abono de Renfe y los reserva en cuanto queda una
plaza libre. Tú marcas los trenes que te valen, le das a buscar, y lo dejas trabajando
en una pestaña mientras haces otra cosa.

## No te pide usuario ni contraseña

Ni te los pide ni los guarda. Trabaja sobre la sesión de Renfe que tú ya tengas abierta
en el navegador: primero entras tú en tu cuenta como siempre, y a partir de ahí la
extensión solo mira la tabla de trenes y pulsa los botones que pulsarías tú.

Tampoco manda nada a ningún sitio. Todo ocurre dentro de tu navegador.

## Instalación

1. Descomprime el zip. Te queda una carpeta llamada `bot-renfe`.
2. **Mueve esa carpeta a un sitio definitivo**, no la dejes en Descargas. Por ejemplo
   `Documentos/bot-renfe`. Abajo te explico por qué importa.
3. En Chrome, abre `chrome://extensions` (cópialo en la barra de direcciones).
4. Arriba a la derecha, activa **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida** y elige la carpeta `bot-renfe`.

Ya está. Debería aparecerte el icono en la barra de extensiones.

## Dos cosas que conviene saber antes de usarla

**La carpeta no se puede mover ni borrar.** Chrome no se queda una copia: guarda la ruta
y lee de ahí cada vez que abres el navegador. Si mueves la carpeta, le cambias el nombre
o vacías Descargas, la extensión deja de funcionar. Por eso el paso 2.

**Chrome te va a dar la lata.** Cada vez que abras el navegador te saldrá un aviso del
tipo *"Desactiva las extensiones en modo de desarrollador"*. No es que algo vaya mal: es
lo que Chrome hace siempre con cualquier extensión que no venga de su tienda. Le das a
cerrar y sigues. Volverá a salir mañana.

## Cómo se usa

1. Entra en `venta.renfe.com` e inicia sesión.
2. Ve a tu abono y pulsa **nueva formalización**. Elige sentido y fecha.
3. Cuando tengas delante la **tabla de trenes**, verás una casilla nueva a la izquierda
   de cada fila. Marca los trenes que te valdrían.
4. Abajo a la derecha aparece un panel. Pulsa **Buscar**.

A partir de ahí comprueba la tabla cada pocos segundos y, en cuanto uno de tus trenes
tiene plaza, lo reserva y te avisa con una notificación.

Puedes marcar y desmarcar trenes sin parar la búsqueda: los relee en cada vuelta.

Deja esa pestaña abierta. Si la cierras, deja de buscar.

## Qué no hace

- **No resuelve captchas ni claves por SMS.** Si Renfe te pide una verificación, para y
  te lo dice en el panel. La resuelves tú y vuelves a darle a buscar.
- **No reserva nada que tú no hayas marcado.**
- **No funciona con abonos ilimitados**, solo con los que te hacen elegir tren.
- Solo actúa en la página de resultados de trenes. En cualquier otra no hace nada.

## Si algo se queda raro

En la cabecera del panel hay un botón **↺**. Borra los trenes marcados y lo deja todo a
cero. Aparece cuando la búsqueda está parada.

Si no estás en la página de trenes, o el panel no responde, pincha el icono de la
extensión en la barra de Chrome: ahí tienes un **Reiniciar** que funciona desde
cualquier pestaña.

Y si vuelves al día siguiente y ves que no se acuerda de nada, es a propósito: pasadas
24 horas sin usarla se olvida de los trenes marcados, para no ponerse a reservar sola
una búsqueda que ya no querías. Pasada una hora deja de reanudarse sola, pero te
conserva los trenes marcados por si quieres seguir.

## Para reportar un fallo

En el popup de la extensión hay un interruptor **Modo diagnostico**. Enciéndelo y
vuelve a provocar el problema: el panel pasa a enseñar detalles técnicos y la consola
del navegador guarda un registro de cada intento.

Para copiarlo: en la pestaña de Renfe, clic derecho → Inspeccionar → pestaña Consola, y
escribe:

```
__botRenfeDiagnostico()
```

Eso da el historial de los últimos intentos, aunque tuvieras el modo diagnóstico
apagado cuando falló.

## Actualizar a una versión nueva

Descarga el zip nuevo y **reemplaza el contenido de la carpeta que ya tienes**, sin
crear una carpeta distinta. Después, en `chrome://extensions`, pulsa el icono de
recargar (↻) en la tarjeta de la extensión.

Si creas una carpeta nueva en vez de reemplazar la de antes, Chrome la trata como otra
extensión distinta y pierdes los ajustes.
