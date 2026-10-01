import { test } from "node:test";
import assert from "node:assert/strict";
import { aplica, diaIso, ultimoDigito, type TablaPico } from "../src/motor/picoyplaca.ts";

const tabla: TablaPico = {
  vigente_desde: "2026-07-01", vigente_hasta: "2026-12-31",
  digitos: { "1": [5, 8], "2": [1, 4], "3": [0, 2], "4": [3, 6], "5": [7, 9] },
  festivos: ["2026-10-12", "2026-12-08"],
};

test("día ISO y último dígito de la placa", () => {
  assert.equal(diaIso("2026-10-05"), 1); // lunes
  assert.equal(diaIso("2026-10-04"), 7); // domingo
  assert.equal(ultimoDigito("GHS483"), 3);
  assert.equal(ultimoDigito("DEM001"), 1);
  assert.equal(ultimoDigito("ABC12D"), null); // moto: termina en letra
});

test("aplica según el día, exceptúa festivos y fines de semana", () => {
  assert.equal(aplica(tabla, "2026-10-08", "GHS483"), true);  // jueves, dígitos 3 y 6
  assert.equal(aplica(tabla, "2026-10-08", "AAA125"), false); // jueves, dígito 5 no aplica
  assert.equal(aplica(tabla, "2026-10-05", "AAA125"), true);  // lunes, dígitos 5 y 8
  assert.equal(aplica(tabla, "2026-10-12", "AAA125"), false); // festivo
  assert.equal(aplica(tabla, "2026-10-10", "GHS483"), false); // sábado
});
