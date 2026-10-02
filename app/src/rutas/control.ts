import { type App, ErrorHttp, texto, requiereRol } from "../http.ts";
import { type DB, fila, filas, correr, ahoraIso } from "../db.ts";
import { evaluar } from "../motor/condiciones.ts";
import { enviarPorApi } from "../canales/whatsapp.ts";
import { registrarEvento } from "./eventos.ts";

export function rutasControl(app: App, db: DB) {
  // ---- Bandeja de salida de avisos ----
  app.get("/api/avisos", (ctx) => {
    const estado = ctx.query.get("estado") ?? "pendiente";
    // Por defecto la bandeja muestra lo que toca enviar ya; con todos=1 incluye lo programado a futuro.
    const soloVencidos = estado === "pendiente" && ctx.query.get("todos") !== "1";
    return filas(db, `
      SELECT a.*, v.placa, v.marca, v.modelo, c.nombre AS cliente_nombre, c.celular
      FROM avisos a JOIN vehiculos v ON v.id = a.vehiculo_id JOIN clientes c ON c.id = v.cliente_id
      WHERE a.taller_id = ? AND a.estado = ? ${soloVencidos ? "AND a.programado_para <= ?" : ""}
      ORDER BY a.programado_para LIMIT 200`,
      ...(soloVencidos ? [ctx.usuario!.taller_id, estado, ahoraIso()] : [ctx.usuario!.taller_id, estado]));
  });

  /** Transición del aviso en el embudo: enviado → entregado → respondido. */
  app.post("/api/avisos/:id/estado", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const a = fila<{ id: string; estado: string; vehiculo_id: string; tipo: string }>(
      db, "SELECT id, estado, vehiculo_id, tipo FROM avisos WHERE id = ? AND taller_id = ?", ctx.params.id!, ctx.usuario!.taller_id);
    if (!a) throw new ErrorHttp(404, "Aviso no encontrado");
    const nuevo = texto(ctx.cuerpo, "estado");
    const orden = ["pendiente", "enviado", "entregado", "respondido"];
    if (nuevo === "cancelado") {
      correr(db, "UPDATE avisos SET estado = 'cancelado' WHERE id = ?", a.id);
      return fila(db, "SELECT * FROM avisos WHERE id = ?", a.id);
    }
    if (!orden.includes(nuevo) || orden.indexOf(nuevo) <= orden.indexOf(a.estado))
      throw new ErrorHttp(400, `No se puede pasar de «${a.estado}» a «${nuevo}»`);
    const marca = ahoraIso();
    correr(db, `UPDATE avisos SET estado = ?${nuevo === "enviado" ? ", enviado_en = ?" : nuevo === "respondido" ? ", respondido_en = ?" : ""} WHERE id = ?`,
      ...(nuevo === "enviado" || nuevo === "respondido" ? [nuevo, marca, a.id] : [nuevo, a.id]));
    const tipoEvento = nuevo === "enviado" ? "aviso_enviado" : nuevo === "entregado" ? "aviso_entregado" : "aviso_respondido";
    registrarEvento(db, ctx.usuario!.taller_id, tipoEvento, { aviso_id: a.id, vehiculo_id: a.vehiculo_id }, { tipo_aviso: a.tipo });
    return fila(db, "SELECT * FROM avisos WHERE id = ?", a.id);
  });

  /** Envío automático cuando existan credenciales de la API; si no, lo dice claro. */
  app.post("/api/avisos/:id/enviar-api", async (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const a = fila<{ id: string; mensaje: string; vehiculo_id: string; tipo: string; celular: string | null }>(db, `
      SELECT a.id, a.mensaje, a.vehiculo_id, a.tipo, c.celular
      FROM avisos a JOIN vehiculos v ON v.id = a.vehiculo_id JOIN clientes c ON c.id = v.cliente_id
      WHERE a.id = ? AND a.taller_id = ?`, ctx.params.id!, ctx.usuario!.taller_id);
    if (!a) throw new ErrorHttp(404, "Aviso no encontrado");
    if (!a.celular) throw new ErrorHttp(409, "El cliente no tiene celular");
    const r = await enviarPorApi(a.celular, a.mensaje);
    if (!r.ok) throw new ErrorHttp(503, r.detalle === "sin_credenciales"
      ? "La API de WhatsApp Business aún no está configurada: envíe desde la bandeja y marque «enviado»"
      : "La API de WhatsApp no aceptó el envío (" + r.detalle + ")");
    correr(db, "UPDATE avisos SET estado = 'enviado', enviado_en = ? WHERE id = ?", ahoraIso(), a.id);
    registrarEvento(db, ctx.usuario!.taller_id, "aviso_enviado", { aviso_id: a.id, vehiculo_id: a.vehiculo_id }, { tipo_aviso: a.tipo, via: "api" });
    return fila(db, "SELECT * FROM avisos WHERE id = ?", a.id);
  });

  app.post("/api/motor/evaluar", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    return evaluar(db, ctx.usuario!.taller_id);
  });

  // ---- Condiciones (centro de control) ----
  app.get("/api/condiciones", (ctx) =>
    filas<{ clave: string; activa: number; params: string }>(db, "SELECT clave, activa, params FROM condiciones WHERE taller_id = ?", ctx.usuario!.taller_id)
      .map((r) => ({ clave: r.clave, activa: !!r.activa, params: JSON.parse(r.params) })));
  app.put("/api/condiciones/:clave", (ctx) => {
    requiereRol(ctx, "dueno");
    const cuerpo = ctx.cuerpo as { activa?: boolean; params?: Record<string, unknown> };
    const actual = fila<{ params: string }>(db, "SELECT params FROM condiciones WHERE taller_id = ? AND clave = ?", ctx.usuario!.taller_id, ctx.params.clave!);
    if (!actual) throw new ErrorHttp(404, "Regla desconocida");
    const params = cuerpo.params ? JSON.stringify(cuerpo.params) : actual.params;
    correr(db, "UPDATE condiciones SET activa = ?, params = ? WHERE taller_id = ? AND clave = ?",
      cuerpo.activa === false ? 0 : 1, params, ctx.usuario!.taller_id, ctx.params.clave!);
    return { ok: true };
  });

  app.get("/api/config", (ctx) => fila(db, "SELECT id, nombre, firma, tono, zona_horaria, ventana_desde, ventana_hasta, autorizacion_version FROM talleres WHERE id = ?", ctx.usuario!.taller_id));
  app.put("/api/config", (ctx) => {
    requiereRol(ctx, "dueno");
    correr(db, "UPDATE talleres SET firma = ?, tono = ?, ventana_desde = ?, ventana_hasta = ? WHERE id = ?",
      texto(ctx.cuerpo, "firma"), texto(ctx.cuerpo, "tono"), texto(ctx.cuerpo, "ventana_desde"), texto(ctx.cuerpo, "ventana_hasta"), ctx.usuario!.taller_id);
    return fila(db, "SELECT * FROM talleres WHERE id = ?", ctx.usuario!.taller_id);
  });

  // ---- KPIs: embudo de la evaluación y rentabilidad ----
  app.get("/api/kpis/embudo", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    const tallerId = ctx.usuario!.taller_id;
    const desde = ctx.query.get("desde") ?? "1970-01-01";
    const porTipo = filas(db, `
      SELECT json_extract(datos, '$.tipo_aviso') AS tipo_aviso, tipo, COUNT(*) AS n
      FROM eventos WHERE taller_id = ? AND en >= ? AND tipo IN ('aviso_enviado','aviso_entregado','aviso_respondido')
      GROUP BY 1, 2`, tallerId, desde);
    const pasos = filas(db, "SELECT tipo, COUNT(*) AS n FROM eventos WHERE taller_id = ? AND en >= ? GROUP BY tipo", tallerId, desde);
    const avisos = fila<{ pendientes: number; creados: number }>(db,
      "SELECT SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) pendientes, COUNT(*) creados FROM avisos WHERE taller_id = ?", tallerId);
    return { pasos, por_tipo_de_aviso: porTipo, avisos };
  });

  app.get("/api/kpis/rentabilidad", (ctx) => {
    requiereRol(ctx, "dueno");
    const tallerId = ctx.usuario!.taller_id;
    const base = `
      SELECT o.id, o.vehiculo_id, v.placa, v.cliente_id, c.nombre AS cliente_nombre,
             COALESCE(o.total_cobrado, (SELECT COALESCE(SUM(precio),0) FROM orden_items i WHERE i.orden_id = o.id AND i.aprobado = 1)) AS ingreso,
             (SELECT COALESCE(SUM(cantidad * costo_unitario),0) FROM orden_repuestos r WHERE r.orden_id = o.id) AS repuestos,
             (SELECT COALESCE(SUM(valor),0) FROM orden_mano_obra m WHERE m.orden_id = o.id) AS mano_obra
      FROM ordenes o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN clientes c ON c.id = v.cliente_id
      WHERE o.taller_id = ? AND o.estado = 'cerrada'`;
    const ordenes = filas<{ id: string; placa: string; cliente_id: string; cliente_nombre: string; ingreso: number; repuestos: number; mano_obra: number }>(db, base, tallerId);
    const porCliente = new Map<string, { cliente: string; ordenes: number; ingreso: number; costos: number; margen: number }>();
    let total = { ingreso: 0, repuestos: 0, mano_obra: 0, margen: 0, ordenes: 0, sin_costos: 0 };
    for (const o of ordenes) {
      const costos = o.repuestos + o.mano_obra;
      const margen = o.ingreso - costos;
      total.ingreso += o.ingreso; total.repuestos += o.repuestos; total.mano_obra += o.mano_obra; total.margen += margen; total.ordenes++;
      if (costos === 0) total.sin_costos++;
      const c = porCliente.get(o.cliente_id) ?? { cliente: o.cliente_nombre, ordenes: 0, ingreso: 0, costos: 0, margen: 0 };
      c.ordenes++; c.ingreso += o.ingreso; c.costos += costos; c.margen += margen;
      porCliente.set(o.cliente_id, c);
    }
    const ranking = [...porCliente.entries()]
      .map(([cliente_id, c]) => ({ cliente_id, ...c }))
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 50);
    return { total: { ...total, repuestos: Math.round(total.repuestos), margen: Math.round(total.margen) }, ranking_clientes: ranking };
  });

  app.get("/api/usuarios", (ctx) => {
    requiereRol(ctx, "dueno", "recepcion");
    return filas(db, "SELECT id, nombre, rol FROM usuarios WHERE taller_id = ? AND activo = 1 ORDER BY rol, nombre", ctx.usuario!.taller_id);
  });
}
