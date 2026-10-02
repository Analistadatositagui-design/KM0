import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type App, ErrorHttp, texto, entero, requiereRol, type Ctx } from "../http.ts";
import { type DB, fila, filas, correr, uid, ahoraIso } from "../db.ts";
import { avisoCierre } from "../motor/condiciones.ts";
import { plantillas, type DatosPlantilla } from "../canales/whatsapp.ts";
import { cargarTaller, programarEnVentana } from "../motor/condiciones.ts";
import { registrarEvento } from "./eventos.ts";

interface Orden { id: string; taller_id: string; vehiculo_id: string; cita_id: string | null; estado: string; km_recepcion: number | null; total_cobrado: number | null; }

function ordenDe(db: DB, ctx: Ctx): Orden {
  const o = fila<Orden>(db, "SELECT * FROM ordenes WHERE id = ? AND taller_id = ?", ctx.params.id!, ctx.usuario!.taller_id);
  if (!o) throw new ErrorHttp(404, "Orden no encontrada");
  return o;
}

export function margenOrden(db: DB, ordenId: string) {
  const o = fila<Orden>(db, "SELECT * FROM ordenes WHERE id = ?", ordenId)!;
  const aprobado = fila<{ s: number }>(db, "SELECT COALESCE(SUM(precio),0) s FROM orden_items WHERE orden_id = ? AND aprobado = 1", ordenId)!.s;
  const repuestos = fila<{ s: number }>(db, "SELECT COALESCE(SUM(cantidad * costo_unitario),0) s FROM orden_repuestos WHERE orden_id = ?", ordenId)!.s;
  const manoObra = fila<{ s: number }>(db, "SELECT COALESCE(SUM(valor),0) s FROM orden_mano_obra WHERE orden_id = ?", ordenId)!.s;
  const ingreso = o.total_cobrado ?? aprobado;
  return { ingreso, items_aprobados: aprobado, repuestos: Math.round(repuestos), mano_obra: manoObra, margen: Math.round(ingreso - repuestos - manoObra) };
}

export function rutasOrdenes(app: App, db: DB, dirDatos: string) {
  const dirFotos = join(dirDatos, "fotos");
  mkdirSync(dirFotos, { recursive: true });

  app.get("/api/ordenes", (ctx) => {
    const estado = ctx.query.get("estado");
    const sql = `SELECT o.id, o.consecutivo, o.estado, o.km_recepcion, o.creada_en, o.cerrada_en,
                        v.placa, v.marca, v.modelo, c.nombre AS cliente_nombre,
                        u.nombre AS mecanico_nombre
                 FROM ordenes o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN clientes c ON c.id = v.cliente_id
                 LEFT JOIN usuarios u ON u.id = o.mecanico_id
                 WHERE o.taller_id = ? ${estado ? "AND o.estado = ?" : "AND o.estado != 'cerrada'"}
                 ORDER BY o.creada_en DESC LIMIT 200`;
    return estado ? filas(db, sql, ctx.usuario!.taller_id, estado) : filas(db, sql, ctx.usuario!.taller_id);
  });

  app.post("/api/ordenes", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const tallerId = ctx.usuario!.taller_id;
    const vehiculoId = texto(ctx.cuerpo, "vehiculo_id");
    const km = entero(ctx.cuerpo, "km_recepcion", true);
    const id = uid();
    const consecutivo = (fila<{ m: number }>(db, "SELECT COALESCE(MAX(consecutivo),0) m FROM ordenes WHERE taller_id = ?", tallerId)!.m) + 1;
    correr(db, "INSERT INTO ordenes (id, taller_id, vehiculo_id, cita_id, consecutivo, km_recepcion, mecanico_id, notas, creada_en) VALUES (?,?,?,?,?,?,?,?,?)",
      id, tallerId, vehiculoId, texto(ctx.cuerpo, "cita_id", true) || null, consecutivo, km,
      texto(ctx.cuerpo, "mecanico_id", true) || null, texto(ctx.cuerpo, "notas", true) || null, ahoraIso());
    if (km != null) correr(db, "INSERT INTO lecturas_km (id, taller_id, vehiculo_id, km, fuente, leida_en) VALUES (?,?,?,?,?,?)",
      uid(), tallerId, vehiculoId, km, "recepcion", ahoraIso());
    const citaId = texto(ctx.cuerpo, "cita_id", true);
    if (citaId) {
      correr(db, "UPDATE citas SET estado = 'asistida' WHERE id = ? AND taller_id = ?", citaId, tallerId);
      const cita = fila<{ aviso_id: string | null }>(db, "SELECT aviso_id FROM citas WHERE id = ?", citaId);
      registrarEvento(db, tallerId, "cita_asistida", { cita_id: citaId, vehiculo_id: vehiculoId, orden_id: id, aviso_id: cita?.aviso_id ?? undefined });
    }
    return fila(db, "SELECT * FROM ordenes WHERE id = ?", id);
  });

  app.get("/api/ordenes/:id", (ctx) => {
    const o = ordenDe(db, ctx);
    const veh = fila<{ cliente_id: string }>(db, "SELECT * FROM vehiculos WHERE id = ?", o.vehiculo_id)!;
    return {
      ...o,
      vehiculo: veh,
      cliente: fila(db, "SELECT id, nombre, celular, autorizacion_en FROM clientes WHERE id = ?", veh.cliente_id),
      mecanico: fila(db, "SELECT id, nombre FROM usuarios WHERE id = (SELECT mecanico_id FROM ordenes WHERE id = ?)", o.id),
      inspecciones: filas(db, "SELECT * FROM inspecciones WHERE orden_id = ? ORDER BY creada_en", o.id),
      items: filas(db, "SELECT * FROM orden_items WHERE orden_id = ?", o.id),
      repuestos: filas(db, "SELECT * FROM orden_repuestos WHERE orden_id = ?", o.id),
      mano_obra: filas(db, "SELECT * FROM orden_mano_obra WHERE orden_id = ?", o.id),
      margen: margenOrden(db, o.id),
    };
  });

  app.put("/api/ordenes/:id", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    correr(db, "UPDATE ordenes SET mecanico_id = ?, notas = ? WHERE id = ?",
      texto(ctx.cuerpo, "mecanico_id", true) || null, texto(ctx.cuerpo, "notas", true) || null, o.id);
    return fila(db, "SELECT * FROM ordenes WHERE id = ?", o.id);
  });

  /** Checklist de ingreso: el mecánico registra hallazgos con foto desde su celular. */
  app.post("/api/ordenes/:id/inspecciones", (ctx) => {
    const o = ordenDe(db, ctx);
    if (o.estado === "cerrada") throw new ErrorHttp(409, "La orden ya está cerrada");
    const estado = texto(ctx.cuerpo, "estado");
    if (!["bien", "atencion", "urgente"].includes(estado)) throw new ErrorHttp(400, "Estado de inspección inválido");
    let foto: string | null = null;
    const b64 = texto(ctx.cuerpo, "foto_base64", true);
    if (b64) {
      const limpio = b64.replace(/^data:image\/\w+;base64,/, "");
      const datos = Buffer.from(limpio, "base64");
      if (datos.length < 100) throw new ErrorHttp(400, "La foto llegó vacía");
      if (datos.length > 4_000_000) throw new ErrorHttp(413, "La foto supera 4 MB; reduzca la resolución");
      const nombre = uid() + ".jpg";
      writeFileSync(join(dirFotos, nombre), datos);
      foto = "fotos/" + nombre;
    }
    const id = uid();
    correr(db, "INSERT INTO inspecciones (id, orden_id, item, estado, nota, foto, creada_en) VALUES (?,?,?,?,?,?,?)",
      id, o.id, texto(ctx.cuerpo, "item"), estado, texto(ctx.cuerpo, "nota", true) || null, foto, ahoraIso());
    return fila(db, "SELECT * FROM inspecciones WHERE id = ?", id);
  });

  app.post("/api/ordenes/:id/items", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    if (o.estado === "cerrada") throw new ErrorHttp(409, "La orden ya está cerrada");
    const id = uid();
    const catalogoId = texto(ctx.cuerpo, "catalogo_id", true) || null;
    let descripcion = texto(ctx.cuerpo, "descripcion", true);
    let precio = entero(ctx.cuerpo, "precio", true);
    if (catalogoId) {
      const s = fila<{ nombre: string; precio_ref: number | null }>(db, "SELECT nombre, precio_ref FROM catalogo WHERE id = ?", catalogoId);
      if (!s) throw new ErrorHttp(404, "Servicio del catálogo no encontrado");
      descripcion = descripcion || s.nombre;
      precio = precio ?? s.precio_ref;
    }
    if (!descripcion) throw new ErrorHttp(400, "Falta la descripción del trabajo");
    correr(db, "INSERT INTO orden_items (id, orden_id, catalogo_id, descripcion, precio, inspeccion_id) VALUES (?,?,?,?,?,?)",
      id, o.id, catalogoId, descripcion, precio ?? 0, texto(ctx.cuerpo, "inspeccion_id", true) || null);
    return fila(db, "SELECT * FROM orden_items WHERE id = ?", id);
  });

  /** Genera la cotización: mensaje a la bandeja con el total propuesto y evidencia. */
  app.post("/api/ordenes/:id/cotizar", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    const pendientes = filas<{ precio: number }>(db, "SELECT precio FROM orden_items WHERE orden_id = ? AND aprobado IS NULL", o.id);
    if (!pendientes.length) throw new ErrorHttp(400, "No hay trabajos pendientes de cotizar");
    const t = cargarTaller(db, ctx.usuario!.taller_id);
    const v = fila<{ placa: string; marca: string | null; modelo: string | null; cliente_id: string }>(db, "SELECT placa, marca, modelo, cliente_id FROM vehiculos WHERE id = ?", o.vehiculo_id)!;
    const c = fila<{ nombre: string; celular: string | null; autorizacion_en: string | null }>(db, "SELECT nombre, celular, autorizacion_en FROM clientes WHERE id = ?", v.cliente_id)!;
    if (!c.celular) throw new ErrorHttp(409, "El cliente no tiene celular registrado");
    if (!c.autorizacion_en) throw new ErrorHttp(409, "El cliente no tiene autorización de datos registrada (Ley 1581)");
    const d: DatosPlantilla = { tono: t.tono, firma: t.firma, nombre: c.nombre.split(" ")[0] ?? c.nombre, vehiculo: [v.marca, v.modelo].filter(Boolean).join(" ") || "vehículo", placa: v.placa };
    const total = pendientes.reduce((s, i) => s + i.precio, 0);
    const ahora = new Date();
    const prog = programarEnVentana(ahora, t);
    const avisoId = uid();
    correr(db, "INSERT INTO avisos (id, taller_id, vehiculo_id, tipo, clave, mensaje, programado_para, creado_en) VALUES (?,?,?,?,?,?,?,?)",
      avisoId, ctx.usuario!.taller_id, o.vehiculo_id, "cotizacion", `cotizacion:${o.id}:${Date.now()}`,
      plantillas.cotizacion(d, { n: pendientes.length, total }), prog.cuando, ahora.toISOString());
    if (o.estado === "recibida") correr(db, "UPDATE ordenes SET estado = 'cotizada' WHERE id = ?", o.id);
    return { aviso_id: avisoId, total, trabajos: pendientes.length };
  });

  /** El cliente responde por WhatsApp; recepción registra qué aprobó y cuándo. */
  app.post("/api/ordenes/:id/items/:itemId/aprobacion", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    const via = texto(ctx.cuerpo, "via", true) || "whatsapp";
    if (!["whatsapp", "presencial", "telefono"].includes(via)) throw new ErrorHttp(400, "Vía de aprobación inválida");
    const aprobado = (ctx.cuerpo as Record<string, unknown>)["aprobado"] === true ? 1 : 0;
    correr(db, "UPDATE orden_items SET aprobado = ?, aprobado_en = ?, aprobado_via = ? WHERE id = ? AND orden_id = ?",
      aprobado, ahoraIso(), via, ctx.params.itemId!, o.id);
    const hayAprobados = fila<{ n: number }>(db, "SELECT COUNT(*) n FROM orden_items WHERE orden_id = ? AND aprobado = 1", o.id)!.n;
    if (hayAprobados && (o.estado === "recibida" || o.estado === "cotizada")) correr(db, "UPDATE ordenes SET estado = 'aprobada' WHERE id = ?", o.id);
    return fila(db, "SELECT * FROM orden_items WHERE id = ?", ctx.params.itemId!);
  });

  // ---- Módulo de costos: repuestos y mano de obra por orden ----
  app.post("/api/ordenes/:id/repuestos", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    const id = uid();
    const cantidadCruda = (ctx.cuerpo as Record<string, unknown>)["cantidad"];
    const cantidad = cantidadCruda === undefined || cantidadCruda === null || cantidadCruda === "" ? 1 : Number(cantidadCruda);
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new ErrorHttp(400, "Cantidad inválida");
    correr(db, "INSERT INTO orden_repuestos (id, orden_id, descripcion, cantidad, costo_unitario) VALUES (?,?,?,?,?)",
      id, o.id, texto(ctx.cuerpo, "descripcion"), cantidad, entero(ctx.cuerpo, "costo_unitario")!);
    return { repuesto: fila(db, "SELECT * FROM orden_repuestos WHERE id = ?", id), margen: margenOrden(db, o.id) };
  });
  app.post("/api/ordenes/:id/mano-obra", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    const id = uid();
    correr(db, "INSERT INTO orden_mano_obra (id, orden_id, descripcion, valor) VALUES (?,?,?,?)",
      id, o.id, texto(ctx.cuerpo, "descripcion"), entero(ctx.cuerpo, "valor")!);
    return { mano_obra: fila(db, "SELECT * FROM orden_mano_obra WHERE id = ?", id), margen: margenOrden(db, o.id) };
  });

  app.post("/api/ordenes/:id/estado", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion", "mecanico");
    const o = ordenDe(db, ctx);
    const estado = texto(ctx.cuerpo, "estado");
    if (!["recibida", "cotizada", "aprobada", "lista"].includes(estado)) throw new ErrorHttp(400, "Estado inválido (el cierre tiene su propia acción)");
    if (o.estado === "cerrada") throw new ErrorHttp(409, "La orden ya está cerrada");
    correr(db, "UPDATE ordenes SET estado = ? WHERE id = ?", estado, o.id);
    return fila(db, "SELECT * FROM ordenes WHERE id = ?", o.id);
  });

  /** Cierre: alimenta historial, evento del embudo y aviso de entrega. */
  app.post("/api/ordenes/:id/cerrar", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const o = ordenDe(db, ctx);
    if (o.estado === "cerrada") throw new ErrorHttp(409, "La orden ya está cerrada");
    const aprobados = fila<{ s: number }>(db, "SELECT COALESCE(SUM(precio),0) s FROM orden_items WHERE orden_id = ? AND aprobado = 1", o.id)!.s;
    const total = entero(ctx.cuerpo, "total_cobrado", true) ?? aprobados;
    correr(db, "UPDATE ordenes SET estado = 'cerrada', cerrada_en = ?, total_cobrado = ? WHERE id = ?", ahoraIso(), total, o.id);
    registrarEvento(db, ctx.usuario!.taller_id, "orden_cerrada", { orden_id: o.id, vehiculo_id: o.vehiculo_id }, { total });
    avisoCierre(db, ctx.usuario!.taller_id, o.id);
    return { ...fila<Orden>(db, "SELECT * FROM ordenes WHERE id = ?", o.id)!, margen: margenOrden(db, o.id) };
  });
}
