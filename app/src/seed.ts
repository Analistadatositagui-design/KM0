import { abrirDb, type DB, fila, correr, uid, ahoraIso } from "./db.ts";
import { crearUsuario } from "./auth.ts";

export const TALLER_ID = "k0";

/** Configuración inicial: lo que dejó el levantamiento del 1 de octubre de 2026.
 *  Idempotente: crea lo que falte y no toca lo que exista. */
export function sembrarBase(db: DB) {
  if (!fila(db, "SELECT id FROM talleres WHERE id = ?", TALLER_ID)) {
    correr(db, `INSERT INTO talleres (id, nombre, firma, tono, zona_horaria, ventana_desde, ventana_hasta, autorizacion_version, creado_en)
                VALUES (?,?,?,?,?,?,?,?,?)`,
      TALLER_ID, "Kilómetro 0", "Kilometro 0", "usted", "America/Bogota", "08:30", "16:30", "v1-2026", ahoraIso());
  }
  const reglas: [string, number, string][] = [
    ["km", 1, JSON.stringify({ umbralKm: 500 })],
    ["docs", 1, JSON.stringify({ d1: 30, d2: 15, d3: 3 })],
    // Hora del levantamiento; queda fuera de la ventana 08:30–16:30 a propósito:
    // el conflicto con la Ley 2300 se resuelve con el dueño (plan, prerrequisito 5).
    ["pico", 1, JSON.stringify({ hora: "19:00" })],
    ["lectura", 1, JSON.stringify({ dias: 45 })],
    ["cierre", 1, "{}"],
    ["reactivar", 1, JSON.stringify({ factor: 2 })],
  ];
  for (const [clave, activa, params] of reglas)
    if (!fila(db, "SELECT clave FROM condiciones WHERE taller_id = ? AND clave = ?", TALLER_ID, clave))
      correr(db, "INSERT INTO condiciones (taller_id, clave, activa, params) VALUES (?,?,?,?)", TALLER_ID, clave, activa, params);

  // Catálogo del levantamiento. El «cada 2 meses» del aceite quedó por verificar con el dueño.
  const servicios: [string, number | null, number | null, number | null][] = [
    ["Cambio de aceite y filtro", 5000, 2, null],
    ["Revisión de frenos", null, 3, null],
    ["Pastillas de freno", null, null, null],
    ["Reparaciones", null, null, null],
    ["Combo Ruta0", null, null, null],
  ];
  servicios.forEach(([nombre, km, meses, precio], i) => {
    if (!fila(db, "SELECT id FROM catalogo WHERE taller_id = ? AND nombre = ?", TALLER_ID, nombre))
      correr(db, "INSERT INTO catalogo (id, taller_id, nombre, intervalo_km, intervalo_meses, precio_ref, posicion) VALUES (?,?,?,?,?,?,?)",
        uid(), TALLER_ID, nombre, km, meses, precio, i);
  });

  // Pico y placa Medellín, segundo semestre de 2026 (tabla configurable, no lógica fija).
  if (!fila(db, "SELECT taller_id FROM pico_placa WHERE taller_id = ?", TALLER_ID)) {
    correr(db, "INSERT INTO pico_placa (taller_id, vigente_desde, vigente_hasta, digitos, festivos) VALUES (?,?,?,?,?)",
      TALLER_ID, "2026-07-01", "2026-12-31",
      JSON.stringify({ "1": [5, 8], "2": [1, 4], "3": [0, 2], "4": [3, 6], "5": [7, 9] }),
      JSON.stringify(["2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25"]));
  }

  // Usuarios iniciales (claves de arranque: cambiarlas al entregar; ver app/README.md).
  const usuarios: [string, string, string, "dueno" | "recepcion" | "mecanico"][] = [
    ["David", "david", "k0-dueno-2026", "dueno"],
    ["Recepción", "recepcion", "k0-recepcion-2026", "recepcion"],
    ["Mecánico piloto", "mecanico", "k0-mecanico-2026", "mecanico"],
  ];
  for (const [nombre, usuario, clave, rol] of usuarios)
    if (!fila(db, "SELECT id FROM usuarios WHERE usuario = ?", usuario))
      crearUsuario(db, TALLER_ID, nombre, usuario, clave, rol);
}

/** Datos de demostración, claramente marcados: un cliente y un vehículo de ejemplo
 *  con historia suficiente para ver el motor andando. Nunca datos reales. */
export function sembrarDemo(db: DB, ahora = new Date()) {
  if (fila(db, "SELECT id FROM clientes WHERE taller_id = ? AND demo = 1", TALLER_ID)) return;
  const dia = 86_400_000;
  const clienteId = uid();
  correr(db, "INSERT INTO clientes (id, taller_id, nombre, celular, autorizacion_en, autorizacion_canal, autorizacion_version, demo, creado_en) VALUES (?,?,?,?,?,?,?,1,?)",
    clienteId, TALLER_ID, "Cliente de ejemplo", "3000000000", new Date(ahora.getTime() - 90 * dia).toISOString(), "orden", "v1-2026", ahoraIso());
  const vehId = uid();
  const soat = new Date(ahora.getTime() + 20 * dia).toISOString().slice(0, 10);
  correr(db, "INSERT INTO vehiculos (id, taller_id, cliente_id, placa, marca, modelo, anio, tipo, soat_vence, demo, creado_en) VALUES (?,?,?,?,?,?,?,?,?,1,?)",
    vehId, TALLER_ID, clienteId, "DEM001", "Chevrolet", "Onix", 2022, "carro", soat, ahoraIso());
  // Historia: aceite hace ~80 días a 43.000 km; hoy rueda ~48.700 proyectado (40 km/día).
  correr(db, "INSERT INTO lecturas_km (id, taller_id, vehiculo_id, km, fuente, leida_en) VALUES (?,?,?,?,?,?)",
    uid(), TALLER_ID, vehId, 40_000, "recepcion", new Date(ahora.getTime() - 155 * dia).toISOString());
  correr(db, "INSERT INTO lecturas_km (id, taller_id, vehiculo_id, km, fuente, leida_en) VALUES (?,?,?,?,?,?)",
    uid(), TALLER_ID, vehId, 43_000, "recepcion", new Date(ahora.getTime() - 80 * dia).toISOString());
  const aceite = fila<{ id: string }>(db, "SELECT id FROM catalogo WHERE taller_id = ? AND nombre = 'Cambio de aceite y filtro'", TALLER_ID)!;
  const ordenId = uid();
  correr(db, `INSERT INTO ordenes (id, taller_id, vehiculo_id, consecutivo, estado, km_recepcion, total_cobrado, creada_en, cerrada_en)
              VALUES (?,?,?,?,?,?,?,?,?)`,
    ordenId, TALLER_ID, vehId, 1, "cerrada", 43_000, 180_000,
    new Date(ahora.getTime() - 80 * dia).toISOString(), new Date(ahora.getTime() - 80 * dia).toISOString());
  correr(db, "INSERT INTO orden_items (id, orden_id, catalogo_id, descripcion, precio, aprobado, aprobado_en, aprobado_via) VALUES (?,?,?,?,?,1,?,?)",
    uid(), ordenId, aceite.id, "Cambio de aceite y filtro", 180_000, new Date(ahora.getTime() - 80 * dia).toISOString(), "presencial");
  correr(db, "INSERT INTO orden_repuestos (id, orden_id, descripcion, cantidad, costo_unitario) VALUES (?,?,?,?,?)",
    uid(), ordenId, "Aceite 10W-40 (galón) y filtro", 1, 70_000);
  correr(db, "INSERT INTO orden_mano_obra (id, orden_id, descripcion, valor) VALUES (?,?,?,?)",
    uid(), ordenId, "Mano de obra cambio de aceite", 30_000);
}

const esEjecucionDirecta = process.argv[1]?.endsWith("seed.ts");
if (esEjecucionDirecta) {
  const dirDatos = process.env.TALLER_DATOS ?? new URL("../data", import.meta.url).pathname;
  const db = abrirDb(process.env.TALLER_DB ?? dirDatos + "/taller.db");
  sembrarBase(db);
  console.log("Base sembrada: taller, reglas, catálogo, pico y placa, usuarios iniciales.");
  if (process.argv.includes("--demo")) { sembrarDemo(db); console.log("Datos de demostración creados (cliente y vehículo DEM001)."); }
}
