import test from "node:test";
import assert from "node:assert/strict";
import { buscarReservable } from "../src/content/matchTrains.js";

const TRENES = [
  { numtren: "12528", salida: "14.10", disponible: false },
  { numtren: "09132", salida: "14.53", disponible: true },
  { numtren: "09140", salida: "15.07", disponible: true },
];

test("devuelve el tren vigilado que esta disponible", () => {
  const vigilados = [{ numtren: "09140", salida: "15.07" }];
  assert.equal(buscarReservable(TRENES, vigilados).numtren, "09140");
});

test("si renfe cambio el id del tren lo reencuentra por la hora de salida", () => {
  const vigilados = [{ numtren: "00000", salida: "15.07" }];
  assert.equal(buscarReservable(TRENES, vigilados).numtren, "09140");
});

test("devuelve null si ningun tren vigilado esta disponible", () => {
  const vigilados = [{ numtren: "12528", salida: "14.10" }];
  assert.equal(buscarReservable(TRENES, vigilados), null);
});

test("devuelve null si no se vigila ningun tren", () => {
  assert.equal(buscarReservable(TRENES, []), null);
});

test("con varios vigilados libres coge el primero de la tabla", () => {
  const vigilados = [
    { numtren: "09140", salida: "15.07" },
    { numtren: "09132", salida: "14.53" },
  ];
  assert.equal(buscarReservable(TRENES, vigilados).numtren, "09132");
});
