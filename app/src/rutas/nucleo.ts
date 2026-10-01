import { type App, ErrorHttp, texto, entero, requiereRol } from "../http.ts";
import { type DB, fila, filas, correr, uid, ahoraIso } from "../db.ts";
import { crearSesion, cerrarSesion } from "../auth.ts";
import { registrarEvento } from "./eventos.ts";

export function rutasNucleo(app: App, db: DB) {
  app.post("/api/sesion", (ctx) => crearSesion(db, texto(ctx.cuerpo, "usuario"), texto(ctx.cuerpo, "clave")), { abierta: true });
  app.del("/api/sesion", (ctx) => {
    const auth = ctx.req.headers.authorization;
    if (auth?.startsWith("Bearer ")) cerrarSesion(db, auth.slice(7));
    return { ok: true };
  });
  app.get("/api/yo", (ctx) => ctx.usuario);

  // ---- Clientes ----
  app.get("/api/clientes", (ctx) => {
    const q = ctx.query.get("q")?.trim();
    const base = `SELECT c.*, (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id) AS vehiculos
                  FROM clientes c WHERE c.taller_id = ?`;
    return q
      ? filas(db, base + " AND (c.nombre LIKE ? OR c.celular LIKE ?) ORDER BY c.nombre LIMIT 100", ctx.usuario!.taller_id, `%${q}%`, `%${q}%`)
      : filas(db, base + " ORDER BY c.nombre LIMIT 100", ctx.usuario!.taller_id);
  });
  app.post("/api/clientes", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const id = uid();
    correr(db, "INSERT INTO clientes (id, taller_id, nombre, celular, correo, creado_en) VALUES (?,?,?,?,?,?)",
      id, ctx.usuario!.taller_id, texto(ctx.cuerpo, "nombre"), texto(ctx.cuerpo, "celular", true) || null, texto(ctx.cuerpo, "correo", true) || null, ahoraIso());
    return fila(db, "SELECT * FROM clientes WHERE id = ?", id);
  });
  app.get("/api/clientes/:id", (ctx) => {
    const c = fila(db, "SELECT * FROM clientes WHERE id = ? AND taller_id = ?", ctx.params.id!, ctx.usuario!.taller_id);
    if (!c) throw new ErrorHttp(404, "Cliente no encontrado");
    return { ...c, vehiculos: filas(db, "SELECT * FROM vehiculos WHERE cliente_id = ? ORDER BY creado_en", ctx.params.id!) };
  });
  app.put("/api/clientes/:id", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    correr(db, "UPDATE clientes SET nombre = ?, celular = ?, correo = ? WHERE id = ? AND taller_id = ?",
      texto(ctx.cuerpo, "nombre"), texto(ctx.cuerpo, "celular", true) || null, texto(ctx.cuerpo, "correo", true) || null, ctx.params.id!, ctx.usuario!.taller_id);
    return fila(db, "SELECT * FROM clientes WHERE id = ?", ctx.params.id!);
  });
  /** Ley 1581: registra la autorización con fecha, canal y versión del texto. */
  app.post("/api/clientes/:id/autorizacion", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const canal = texto(ctx.cuerpo, "canal");
    if (!["orden", "whatsapp", "verbal_registrada"].includes(canal)) throw new ErrorHttp(400, "Canal de autorización inválido");
    const t = fila<{ autorizacion_version: string }>(db, "SELECT autorizacion_version FROM talleres WHERE id = ?", ctx.usuario!.taller_id)!;
    correr(db, "UPDATE clientes SET autorizacion_en = ?, autorizacion_canal = ?, autorizacion_version = ? WHERE id = ? AND taller_id = ?",
      ahoraIso(), canal, t.autorizacion_version, ctx.params.id!, ctx.usuario!.taller_id);
    return fila(db, "SELECT * FROM clientes WHERE id = ?", ctx.params.id!);
  });

  // ---- Vehículos ----
  app.post("/api/vehiculos", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const placa = texto(ctx.cuerpo, "placa").toUpperCase().replace(/\s+/g, "");
    const id = uid();
    try {
      correr(db, `INSERT INTO vehiculos (id, taller_id, cliente_id, placa, marca, modelo, anio, tipo, soat_vence, tecno_vence, creado_en)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        id, ctx.usuario!.taller_id, texto(ctx.cuerpo, "cliente_id"), placa,
        texto(ctx.cuerpo, "marca", true) || null, texto(ctx.cuerpo, "modelo", true) || null, entero(ctx.cuerpo, "anio", true),
        texto(ctx.cuerpo, "tipo", true) || "carro", texto(ctx.cuerpo, "soat_vence", true) || null, texto(ctx.cuerpo, "tecno_vence", true) || null, ahoraIso());
    } catch (e) { throw new ErrorHttp(409, `Ya existe un vehículo con placa ${placa}`); }
    const km = entero(ctx.cuerpo, "km", true);
    if (km != null) correr(db, "INSERT INTO lecturas_km (id, taller_id, vehiculo_id, km, fuente, leida_en) VALUES (?,?,?,?,?,?)",
      uid(), ctx.usuario!.taller_id, id, km, "recepcion", ahoraIso());
    return fila(db, "SELECT * FROM vehiculos WHERE id = ?", id);
  });
  app.get("/api/vehiculos/:id", (ctx) => {
    const v = fila<{ id: string; cliente_id: string }>(db, "SELECT * FROM vehiculos WHERE id = ? AND taller_id = ?", ctx.params.id!, ctx.usuario!.taller_id);
    if (!v) throw new ErrorHttp(404, "Vehículo no encontrado");
    return {
      ...v,
      cliente: fila(db, "SELECT id, nombre, celular, autorizacion_en, autorizacion_canal FROM clientes WHERE id = ?", v.cliente_id),
      lecturas: filas(db, "SELECT km, fuente, leida_en FROM lecturas_km WHERE vehiculo_id = ? ORDER BY leida_en DESC LIMIT 20", v.id),
      historial: filas(db, `SELECT o.id, o.consecutivo, o.estado, o.km_recepcion, o.creada_en, o.cerrada_en, o.total_cobrado,
                              (SELECT GROUP_CONCAT(descripcion, ' · ') FROM orden_items i WHERE i.orden_id = o.id AND i.aprobado = 1) AS trabajos
                            FROM ordenes o WHERE o.vehiculo_id = ? ORDER BY o.creada_en DESC`, v.id),
      avisos: filas(db, "SELECT tipo, estado, mensaje, programado_para FROM avisos WHERE vehiculo_id = ? ORDER BY creado_en DESC LIMIT 10", v.id),
    };
  });
  app.put("/api/vehiculos/:id/documentos", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    correr(db, "UPDATE vehiculos SET soat_vence = ?, tecno_vence = ? WHERE id = ? AND taller_id = ?",
      texto(ctx.cuerpo, "soat_vence", true) || null, texto(ctx.cuerpo, "tecno_vence", true) || null, ctx.params.id!, ctx.usuario!.taller_id);
    return fila(db, "SELECT * FROM vehiculos WHERE id = ?", ctx.params.id!);
  });
  app.post("/api/vehiculos/:id/lecturas", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const fuente = texto(ctx.cuerpo, "fuente", true) || "recepcion";
    if (!["recepcion", "cliente"].includes(fuente)) throw new ErrorHttp(400, "Fuente inválida");
    correr(db, "INSERT INTO lecturas_km (id, taller_id, vehiculo_id, km, fuente, leida_en) VALUES (?,?,?,?,?,?)",
      uid(), ctx.usuario!.taller_id, ctx.params.id!, entero(ctx.cuerpo, "km")!, fuente, ahoraIso());
    return { ok: true };
  });

  // ---- Catálogo ----
  app.get("/api/catalogo", (ctx) => filas(db, "SELECT * FROM catalogo WHERE taller_id = ? AND activo = 1 ORDER BY posicion, nombre", ctx.usuario!.taller_id));
  app.post("/api/catalogo", (ctx) => {
    requiereRol(ctx, "dueno");
    const id = uid();
    correr(db, "INSERT INTO catalogo (id, taller_id, nombre, intervalo_km, intervalo_meses, precio_ref) VALUES (?,?,?,?,?,?)",
      id, ctx.usuario!.taller_id, texto(ctx.cuerpo, "nombre"), entero(ctx.cuerpo, "intervalo_km", true), entero(ctx.cuerpo, "intervalo_meses", true), entero(ctx.cuerpo, "precio_ref", true));
    return fila(db, "SELECT * FROM catalogo WHERE id = ?", id);
  });
  app.put("/api/catalogo/:id", (ctx) => {
    requiereRol(ctx, "dueno");
    correr(db, "UPDATE catalogo SET nombre = ?, intervalo_km = ?, intervalo_meses = ?, precio_ref = ?, activo = ? WHERE id = ? AND taller_id = ?",
      texto(ctx.cuerpo, "nombre"), entero(ctx.cuerpo, "intervalo_km", true), entero(ctx.cuerpo, "intervalo_meses", true),
      entero(ctx.cuerpo, "precio_ref", true), entero(ctx.cuerpo, "activo", true) ?? 1, ctx.params.id!, ctx.usuario!.taller_id);
    return fila(db, "SELECT * FROM catalogo WHERE id = ?", ctx.params.id!);
  });

  // ---- Citas ----
  app.get("/api/citas", (ctx) => filas(db, `
    SELECT ci.*, v.placa, v.marca, v.modelo, c.nombre AS cliente_nombre
    FROM citas ci JOIN vehiculos v ON v.id = ci.vehiculo_id JOIN clientes c ON c.id = v.cliente_id
    WHERE ci.taller_id = ? AND ci.estado = 'programada' ORDER BY ci.fecha, ci.hora`, ctx.usuario!.taller_id));
  app.post("/api/citas", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const id = uid(), avisoId = texto(ctx.cuerpo, "aviso_id", true) || null;
    const vehiculoId = texto(ctx.cuerpo, "vehiculo_id");
    correr(db, "INSERT INTO citas (id, taller_id, vehiculo_id, fecha, hora, motivo, aviso_id, creada_en) VALUES (?,?,?,?,?,?,?,?)",
      id, ctx.usuario!.taller_id, vehiculoId, texto(ctx.cuerpo, "fecha"), texto(ctx.cuerpo, "hora"), texto(ctx.cuerpo, "motivo", true) || null, avisoId, ahoraIso());
    registrarEvento(db, ctx.usuario!.taller_id, "cita_creada", { cita_id: id, vehiculo_id: vehiculoId, aviso_id: avisoId ?? undefined });
    return fila(db, "SELECT * FROM citas WHERE id = ?", id);
  });
}
