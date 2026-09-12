// el numero de tren es la referencia principal, pero renfe puede reasignarlo entre
// busquedas, asi que la hora de salida sirve de respaldo para reencontrar el mismo viaje
export function esVigilado(tren, vigilado) {
  if (vigilado.numtren && vigilado.numtren === tren.numtren) return true;
  return Boolean(vigilado.salida) && vigilado.salida === tren.salida;
}

export function buscarReservable(trenes, vigilados) {
  return trenes.find((tren) => tren.disponible && vigilados.some((v) => esVigilado(tren, v))) || null;
}
