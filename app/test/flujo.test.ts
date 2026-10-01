import { test, after } from "node:test";
import assert from "node:assert/strict";
import { appDePrueba, escuchar, llamar, token } from "./ayuda.ts";

/** Flujo de punta a punta sobre HTTP: recepción → checklist con foto → cotización →
 *  aprobación → costos → cierre. Verifica roles, embudo y rentabilidad. */
test("flujo completo de una orden con costos y embudo", async (t) => {
  const { db, app } = appDePrueba();
  const { base, cerrar } = await escuchar(app);
  after(cerrar);

  const dueno = token(db, "david", "k0-dueno-2026");
  const recepcion = token(db, "recepcion", "k0-recepcion-2026");
  const mecanico = token(db, "mecanico", "k0-mecanico-2026");

  // Sin sesión no hay API; la clave mala no entra.
  assert.equal((await llamar(base, null, "GET", "/api/ordenes")).estado, 401);
  assert.equal((await llamar(base, null, "POST", "/api/sesion", { usuario: "david", clave: "mala" })).estado, 401);

  // Cliente con autorización de datos y vehículo con kilometraje de recepción.
  const cli = await llamar(base, recepcion, "POST", "/api/clientes", { nombre: "Carolina Prueba", celular: "3005556677" });
  assert.equal(cli.estado, 200);
  const clienteId = cli.json.id as string;
  await llamar(base, recepcion, "POST", `/api/clientes/${clienteId}/autorizacion`, { canal: "orden" });
  const veh = await llamar(base, recepcion, "POST", "/api/vehiculos", {
    cliente_id: clienteId, placa: "fl u 783", marca: "Renault", modelo: "Duster", anio: 2021, km: 61_200, soat_vence: "2027-03-01",
  });
  assert.equal(veh.estado, 200);
  assert.equal(veh.json.placa, "FLU783");
  const vehId = veh.json.id as string;

  // La orden entra con kilometraje nuevo (queda como lectura).
  const orden = await llamar(base, recepcion, "POST", "/api/ordenes", { vehiculo_id: vehId, km_recepcion: 61_250 });
  const ordenId = orden.json.id as string;
  assert.equal(orden.json.consecutivo, 1);

  // El mecánico hace el checklist con foto; no puede cotizar (rol).
  const pixel = Buffer.alloc(600, 7).toString("base64"); // contenido de prueba; el panel envía JPG reales de la cámara
  const insp = await llamar(base, mecanico, "POST", `/api/ordenes/${ordenId}/inspecciones`, {
    item: "Pastillas delanteras", estado: "urgente", nota: "Al 10 %", foto_base64: pixel,
  });
  assert.equal(insp.estado, 200);
  assert.ok((insp.json.foto as string).startsWith("fotos/"));
  assert.equal((await llamar(base, mecanico, "POST", `/api/ordenes/${ordenId}/cotizar`, {})).estado, 403);

  // Recepción arma la cotización desde la inspección y la manda a la bandeja.
  const item = await llamar(base, recepcion, "POST", `/api/ordenes/${ordenId}/items`, {
    descripcion: "Cambio de pastillas delanteras", precio: 320_000, inspeccion_id: insp.json.id,
  });
  const cot = await llamar(base, recepcion, "POST", `/api/ordenes/${ordenId}/cotizar`, {});
  assert.equal(cot.estado, 200);
  assert.equal(cot.json.total, 320_000);
  const avisoId = cot.json.aviso_id as string;

  // La bandeja muestra el aviso pendiente; se marca enviado y respondido (embudo).
  const bandeja = await llamar(base, recepcion, "GET", "/api/avisos?estado=pendiente&todos=1");
  assert.ok((bandeja.json as unknown as { id: string }[]).some((a) => a.id === avisoId));
  await llamar(base, recepcion, "POST", `/api/avisos/${avisoId}/estado`, { estado: "enviado" });
  // El salto hacia adelante es válido (el cliente respondió directo); retroceder no.
  const salto = await llamar(base, recepcion, "POST", `/api/avisos/${avisoId}/estado`, { estado: "respondido" });
  assert.equal(salto.estado, 200);
  const atras = await llamar(base, recepcion, "POST", `/api/avisos/${avisoId}/estado`, { estado: "entregado" });
  assert.equal(atras.estado, 400, "no se puede retroceder en el embudo");

  // El cliente aprobó por WhatsApp: queda qué, cuándo y por dónde.
  const apro = await llamar(base, recepcion, "POST", `/api/ordenes/${ordenId}/items/${item.json.id}/aprobacion`, { aprobado: true, via: "whatsapp" });
  assert.equal(apro.json.aprobado, 1);
  assert.ok(apro.json.aprobado_en);

  // Módulo de costos: repuestos y mano de obra; margen en vivo.
  await llamar(base, recepcion, "POST", `/api/ordenes/${ordenId}/repuestos`, { descripcion: "Pastillas Bosch", cantidad: 1, costo_unitario: 140_000 });
  const mo = await llamar(base, recepcion, "POST", `/api/ordenes/${ordenId}/mano-obra`, { descripcion: "Instalación", valor: 60_000 });
  const margen = mo.json.margen as { ingreso: number; margen: number };
  assert.equal(margen.ingreso, 320_000);
  assert.equal(margen.margen, 320_000 - 140_000 - 60_000);

  // El mecánico no puede cerrar; recepción cierra y el embudo registra la orden.
  assert.equal((await llamar(base, mecanico, "POST", `/api/ordenes/${ordenId}/cerrar`, {})).estado, 403);
  const cierre = await llamar(base, recepcion, "POST", `/api/ordenes/${ordenId}/cerrar`, {});
  assert.equal(cierre.json.estado, "cerrada");
  assert.equal((cierre.json.margen as { margen: number }).margen, 120_000);
  // El aviso de entrega quedó en bandeja (regla «cierre» activa).
  const avisosVeh = await llamar(base, recepcion, "GET", "/api/vehiculos/" + vehId);
  assert.ok((avisosVeh.json.avisos as { tipo: string }[]).some((a) => a.tipo === "cierre"));

  // Historial del vehículo con la orden cerrada.
  assert.equal((avisosVeh.json.historial as unknown[]).length, 1);

  // KPIs: el embudo cuenta los pasos y la rentabilidad trae el ranking (solo dueño).
  assert.equal((await llamar(base, recepcion, "GET", "/api/kpis/rentabilidad")).estado, 403);
  const kpis = await llamar(base, dueno, "GET", "/api/kpis/embudo");
  const pasos = Object.fromEntries((kpis.json.pasos as { tipo: string; n: number }[]).map((p) => [p.tipo, p.n]));
  assert.equal(pasos["aviso_enviado"], 1);
  assert.equal(pasos["aviso_respondido"], 1);
  assert.equal(pasos["orden_cerrada"], 1);
  const renta = await llamar(base, dueno, "GET", "/api/kpis/rentabilidad");
  const total = renta.json.total as { margen: number; ordenes: number };
  assert.equal(total.ordenes, 1);
  assert.equal(total.margen, 120_000);
  const ranking = renta.json.ranking_clientes as { cliente: string; margen: number }[];
  assert.equal(ranking[0]!.cliente, "Carolina Prueba");

  // Cotizar sin autorización de datos se niega (Ley 1581).
  const cli2 = await llamar(base, recepcion, "POST", "/api/clientes", { nombre: "Sin Permiso", celular: "3000000001" });
  const veh2 = await llamar(base, recepcion, "POST", "/api/vehiculos", { cliente_id: cli2.json.id, placa: "NOP111" });
  const ord2 = await llamar(base, recepcion, "POST", "/api/ordenes", { vehiculo_id: veh2.json.id });
  await llamar(base, recepcion, "POST", `/api/ordenes/${ord2.json.id}/items`, { descripcion: "Revisión", precio: 50_000 });
  const negada = await llamar(base, recepcion, "POST", `/api/ordenes/${ord2.json.id}/cotizar`, {});
  assert.equal(negada.estado, 409);
  assert.match(negada.json.error as string, /1581/);
});
