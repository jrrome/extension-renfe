import test from "node:test";
import assert from "node:assert/strict";
import { loadFixture } from "./helpers.js";
import { parseTrains, numeroDeFila } from "../src/content/parseTrains.js";

test("extrae las 18 filas de tren de una tabla real de renfe", () => {
  const doc = loadFixture("trains-real.html");
  const trains = parseTrains(doc);
  assert.equal(trains.length, 18);
});

test("lee los campos de un tren por data-label, no por posicion", () => {
  const doc = loadFixture("trains-real.html");
  const [primero] = parseTrains(doc);
  assert.deepEqual(primero, {
    numtren: "12528",
    salida: "14.10",
    llegada: "14.49",
    duracion: "39 min.",
    tipo: "REGIONAL",
    clase: "Turista",
    disponible: true,
  });
});

test("un tren sin boton continuar no esta disponible aunque su clase no diga completo", () => {
  const doc = loadFixture("trains-completo.html");
  const sinBoton = parseTrains(doc).find((t) => t.numtren === "09142");
  assert.equal(sinBoton.clase, "Turista");
  assert.equal(sinBoton.disponible, false);
});

// guardas de regresion sobre comportamiento ya implementado

test("[sintetico] la celda de clase con 'Completo' marca el tren como no disponible", () => {
  const doc = loadFixture("trains-completo.html");
  const trenes = parseTrains(doc);
  assert.equal(trenes.find((t) => t.numtren === "09132").disponible, false);
});

test("[sintetico] la deteccion de completo no distingue mayusculas", () => {
  const doc = loadFixture("trains-completo.html");
  const trenes = parseTrains(doc);
  assert.equal(trenes.find((t) => t.numtren === "09140").clase, "COMPLETO");
  assert.equal(trenes.find((t) => t.numtren === "09140").disponible, false);
});

test("conserva los ceros a la izquierda del numero de tren", () => {
  const doc = loadFixture("trains-real.html");
  const numeros = parseTrains(doc).map((t) => t.numtren);
  assert.ok(numeros.includes("09132"), "09132 debe conservar el cero inicial");
  assert.ok(numeros.every((n) => typeof n === "string"));
});

test("ignora las filas de detalle intercaladas", () => {
  const doc = loadFixture("trains-real.html");
  const tbody = doc.querySelector("#listTrainsTableTbodyNEW");
  assert.equal(tbody.querySelectorAll("tr").length, 36, "la tabla real trae 36 tr");
  assert.equal(parseTrains(doc).length, 18, "solo 18 son filas de tren");
});

test("devuelve lista vacia si la tabla de trenes no esta en la pagina", () => {
  const doc = loadFixture("trains-real.html");
  doc.querySelector("#listTrainsTableTbodyNEW").remove();
  assert.deepEqual(parseTrains(doc), []);
});

test("saca el numero de tren del id de la fila si falta el atributo del boton", () => {
  const doc = loadFixture("trains-real.html");
  const fila = doc.querySelector('tr[id="row09132"]');
  fila.querySelector("button[tren]").removeAttribute("tren");
  assert.equal(numeroDeFila(fila), "09132");
});

test("un tren completo real de renfe se marca como no disponible", () => {
  const doc = loadFixture("trains-lleno-real.html");
  const trenes = parseTrains(doc);
  const lleno = trenes.find((t) => t.numtren === "34404");

  // renfe sustituye la celda de clase y la del boton por una sola con colspan=2
  assert.equal(lleno.clase, "");
  assert.equal(lleno.disponible, false);
  assert.equal(doc.querySelector('#continuar34404'), null, "no hay boton que pulsar");
});

test("en la misma tabla los trenes con plaza si salen disponibles", () => {
  const doc = loadFixture("trains-lleno-real.html");
  const libres = parseTrains(doc).filter((t) => t.disponible).map((t) => t.numtren);
  assert.deepEqual(libres, ["12441", "09201", "09213", "12561"]);
});
