import test from "node:test";
import assert from "node:assert/strict";
import { crearControl } from "../src/content/generacion.js";

test("un token recien tomado esta vigente", () => {
  const c = crearControl();
  const t = c.tomar();
  assert.equal(c.vigente(t), true);
});

test("tomar un token nuevo invalida el anterior", () => {
  const c = crearControl();
  const viejo = c.tomar();
  const nuevo = c.tomar();
  assert.equal(c.vigente(viejo), false, "el bucle viejo debe morir solo");
  assert.equal(c.vigente(nuevo), true);
});

test("cancelar invalida el token vigente", () => {
  const c = crearControl();
  const t = c.tomar();
  c.cancelar();
  assert.equal(c.vigente(t), false);
});

// este es el fallo que veia el usuario: parar y volver a darle a buscar
// enseguida no arrancaba nada porque el bucle anterior aun no habia salido
test("tras cancelar se puede volver a arrancar de inmediato", () => {
  const c = crearControl();
  const viejo = c.tomar();
  c.cancelar();
  const nuevo = c.tomar();
  assert.equal(c.vigente(viejo), false);
  assert.equal(c.vigente(nuevo), true, "buscar tras parar debe arrancar siempre");
});

test("cancelar dos veces seguidas no rompe nada", () => {
  const c = crearControl();
  c.tomar();
  c.cancelar();
  c.cancelar();
  const nuevo = c.tomar();
  assert.equal(c.vigente(nuevo), true);
});
