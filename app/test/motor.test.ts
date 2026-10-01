import { test } from "node:test";
import assert from "node:assert/strict";
import { appDePrueba } from "./ayuda.ts";
import { filas, fila, correr, uid } from "../src/db.ts";
import { evaluar, promedioDiario, kmProyectado, programarEnVentana, cargarTaller } from "../src/motor/condiciones.ts";
import { TALLER_ID } from "../src/seed.ts";

const dia = 86_400_000;
// Jueves 8 de octubre de 2026, 15:00 en Bogotá (20:00 UTC): dentro de la ventana 08:30–16:30.
const AHORA = new Date("2026-10-08T20:00:00Z");

function clienteConVehiculo(db: ReturnType<typeof appDePrueba>["db"], placa: string, opciones: { autorizado?: boolean; soat?: string } = {}) {
  const clienteId = uid();
  correr(db, "INSERT INTO clientes (id, taller_id, nombre, celular, autorizacion_en, creado_en) VALUES (?,?,?,?,?,?)",
    clienteId, TALLER_ID, "Prueba Uno", "3001112233", opciones.autorizado === false ? null : AHORA.toISOString(), AHORA.toISOString());
  const vehId = uid();
  correr(db, "INSERT INTO vehiculos (id, taller_id, cliente_id, placa, marca, modelo, soat_vence, creado_en) VALUES (?,?,?,?,?,?,?,?)",
    vehId, TALLER_ID, clienteId, placa, "Chevrolet", "Onix", opciones.soat ?? null, AHORA.toISOString());
  return { clienteId, vehId };
}

function lectura(db: ReturnType<typeof appDePrueba>["db"], vehId: string, km: number, hace: number) {
  correr(db, "INSERT INTO lecturas_km (id, taller_id, vehiculo_id, km, fuente, leida_en) VALUES (?,?,?,?,?,?)",
    uid(), TALLER_ID, vehId, km, "recepcion", new Date(AHORA.getTime() - hace * dia).toISOString());
}

function servicioHecho(db: ReturnType<typeof appDePrueba>["db"], vehId: string, nombre: string, km: number, hace: number) {
  const s = fila<{ id: string }>(db, "SELECT id FROM catalogo WHERE taller_id = ? AND nombre = ?", TALLER_ID, nombre)!;
  const ordenId = uid();
  const cuando = new Date(AHORA.getTime() - hace * dia).toISOString();
  const consecutivo = (fila<{ m: number }>(db, "SELECT COALESCE(MAX(consecutivo),0) m FROM ordenes WHERE taller_id = ?", TALLER_ID)!.m) + 1;
  correr(db, "INSERT INTO ordenes (id, taller_id, vehiculo_id, consecutivo, estado, km_recepcion, creada_en, cerrada_en) VALUES (?,?,?,?,'cerrada',?,?,?)",
    ordenId, TALLER_ID, vehId, consecutivo, km, cuando, cuando);
  correr(db, "INSERT INTO orden_items (id, orden_id, catalogo_id, descripcion, precio, aprobado) VALUES (?,?,?,?,0,1)", uid(), ordenId, s.id, nombre);
  return ordenId;
}

test("proyección de kilometraje", () => {
  const lecturas = [
    { km: 40_000, leida_en: new Date(AHORA.getTime() - 100 * dia).toISOString() },
    { km: 44_000, leida_en: new Date(AHORA.getTime() - 20 * dia).toISOString() },
  ];
  const prom = promedioDiario(lecturas)!;
  assert.equal(Math.round(prom), 50);
  assert.equal(kmProyectado(lecturas[1]!, prom, AHORA), 45_000);
  assert.equal(promedioDiario([lecturas[0]!]), null);
});

test("aviso por kilometraje cerca del intervalo, con dedup y sin autorización no sale", () => {
  const { db } = appDePrueba();
  const { vehId } = clienteConVehiculo(db, "KMA100");
  // Aceite a 43.000 hace 80 días; lecturas que proyectan ~45.000 hoy; intervalo 5.000 → hito 48.000… lejos.
  servicioHecho(db, vehId, "Cambio de aceite y filtro", 43_000, 80);
  lectura(db, vehId, 43_000, 80);
  lectura(db, vehId, 47_600, 2); // promedio ≈ 59 km/día → proyectado ≈ 47.718: a 282 del hito 48.000
  const r1 = evaluar(db, TALLER_ID, AHORA);
  assert.ok(r1.detalle.some((d) => d.startsWith("km KMA100")), "debe avisar por km: " + JSON.stringify(r1.detalle));
  const r2 = evaluar(db, TALLER_ID, AHORA);
  assert.equal(r2.detalle.filter((d) => d.startsWith("km KMA100")).length, 0, "no debe repetir el aviso");

  // Sin autorización no se genera nada (Ley 1581).
  const sin = clienteConVehiculo(db, "KMB200", { autorizado: false });
  servicioHecho(db, sin.vehId, "Cambio de aceite y filtro", 43_000, 80);
  lectura(db, sin.vehId, 43_000, 80);
  lectura(db, sin.vehId, 47_600, 2);
  const r3 = evaluar(db, TALLER_ID, AHORA);
  assert.equal(filas(db, "SELECT id FROM avisos WHERE vehiculo_id = ?", sin.vehId).length, 0);
});

test("documentos: etapa 30/15/3 según los días que faltan", () => {
  const { db } = appDePrueba();
  const { vehId } = clienteConVehiculo(db, "DOC300", { soat: "2026-10-28" }); // en 20 días → etapa 30
  evaluar(db, TALLER_ID, AHORA);
  const avisos = filas<{ clave: string }>(db, "SELECT clave FROM avisos WHERE vehiculo_id = ? AND tipo = 'docs'", vehId);
  assert.equal(avisos.length, 1);
  assert.ok(avisos[0]!.clave.endsWith(":30"), avisos[0]!.clave);
  // Doce días después entra la etapa 15 con otra clave.
  evaluar(db, TALLER_ID, new Date(AHORA.getTime() + 12 * dia));
  const dos = filas<{ clave: string }>(db, "SELECT clave FROM avisos WHERE vehiculo_id = ? AND tipo = 'docs' ORDER BY creado_en", vehId);
  assert.equal(dos.length, 2);
  assert.ok(dos[1]!.clave.endsWith(":15"), dos[1]!.clave);
});

test("pico y placa de mañana con hora propia, y ventana para el resto", () => {
  const { db } = appDePrueba();
  // Mañana es viernes 9 de octubre: dígitos 7 y 9.
  const { vehId } = clienteConVehiculo(db, "PPA887");
  const otro = clienteConVehiculo(db, "PPB881"); // dígito 1: mañana no aplica
  evaluar(db, TALLER_ID, AHORA);
  const a = fila<{ programado_para: string; fuera_de_ventana: number }>(db, "SELECT programado_para, fuera_de_ventana FROM avisos WHERE vehiculo_id = ? AND tipo = 'pico'", vehId);
  assert.ok(a, "debe existir aviso de pico y placa");
  assert.equal(a!.fuera_de_ventana, 1, "las 19:00 quedan fuera de la ventana 08:30–16:30 y debe señalarse");
  assert.equal(new Date(a!.programado_para).toISOString(), "2026-10-09T00:00:00.000Z"); // 19:00 Bogotá
  assert.equal(fila(db, "SELECT id FROM avisos WHERE vehiculo_id = ? AND tipo = 'pico'", otro.vehId), undefined);
});

test("lectura vieja de kilometraje pregunta a los 45 días y la ventana difiere envíos nocturnos", () => {
  const { db } = appDePrueba();
  const { vehId } = clienteConVehiculo(db, "LEC500");
  lectura(db, vehId, 50_000, 60);
  const noche = new Date("2026-10-09T02:00:00Z"); // 21:00 Bogotá del 8 de octubre: fuera de ventana
  evaluar(db, TALLER_ID, noche);
  const a = fila<{ tipo: string; programado_para: string }>(db, "SELECT tipo, programado_para FROM avisos WHERE vehiculo_id = ?", vehId)!;
  assert.equal(a.tipo, "lectura");
  // Debe quedar programado para la apertura de la ventana del día siguiente (08:30 Bogotá = 13:30 UTC).
  assert.equal(new Date(a.programado_para).toISOString(), "2026-10-09T13:30:00.000Z");
  const t = cargarTaller(db, TALLER_ID);
  assert.equal(programarEnVentana(AHORA, t).fuera, false);
});

test("reactivar: factor por el intervalo de referencia del catálogo", () => {
  const { db } = appDePrueba();
  const { vehId } = clienteConVehiculo(db, "REA600");
  // Última orden hace 130 días; intervalo de referencia 2 meses × factor 2 ≈ 122 días → aplica.
  servicioHecho(db, vehId, "Cambio de aceite y filtro", 40_000, 130);
  evaluar(db, TALLER_ID, AHORA);
  assert.ok(fila(db, "SELECT id FROM avisos WHERE vehiculo_id = ? AND tipo = 'reactivar'", vehId));
});
