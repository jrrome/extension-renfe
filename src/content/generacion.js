// control de arranque y parada del bucle. con un booleano habia carrera: parar no
// surtia efecto hasta que el bucle salia de su await, y un arranque en esa ventana
// se descartaba por creer que ya habia uno vivo. con tokens, arrancar siempre
// arranca y el bucle anterior se apaga solo al ver que su token ya no vale.
export function crearControl() {
  let actual = 0;

  return {
    tomar() {
      actual += 1;
      return actual;
    },
    vigente(token) {
      return token === actual;
    },
    cancelar() {
      actual += 1;
    },
  };
}
