import { type DB, fila, filas, correr, uid } from "../db.ts";
import { tablaVigente, aplica } from "./picoyplaca.ts";
import { plantillas, miles, type DatosPlantilla } from "../canales/whatsapp.ts";

/** Motor «si… entonces…» de la Fase 1.
 *  Evalúa el estado del taller en un instante dado y materializa avisos en la bandeja
 *  de salida. Es idempotente: cada hito tiene una clave única y un aviso por clave.
 *  Regla de oro (plan, módulo 8): ningún aviso sale para un cliente sin autorización
 *  de datos registrada o sin celular. */

export interface Taller {
  id: string; nombre: string; firma: string; tono: "tu" | "usted";
  zona_horaria: string; ventana_desde: string; ventana_hasta: string;
}
interface Regla { activa: number; params: Record<string, number | string> }
interface Veh {
  id: string; placa: string; marca: string | null; modelo: string | null;
  soat_vence: string | null; tecno_vence: string | null;
  cliente_nombre: string; celular: string | null; autorizacion_en: string | null;
}

export function fechaLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function horaLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const t = new Date(Date.UTC(a!, m! - 1, d! + dias));
  return t.toISOString().slice(0, 10);
}
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta + "T00:00:00Z") - Date.parse(desde + "T00:00:00Z")) / 86_400_000);
}

export function cargarTaller(db: DB, tallerId: string): Taller {
  const t = fila<Taller>(db, "SELECT id, nombre, firma, tono, zona_horaria, ventana_desde, ventana_hasta FROM talleres WHERE id = ?", tallerId);
  if (!t) throw new Error("Taller no configurado");
  return t;
}
export function reglas(db: DB, tallerId: string): Record<string, Regla> {
  const salida: Record<string, Regla> = {};
  for (const r of filas<{ clave: string; activa: number; params: string }>(db, "SELECT clave, activa, params FROM condiciones WHERE taller_id = ?", tallerId))
    salida[r.clave] = { activa: r.activa, params: JSON.parse(r.params) };
  return salida;
}

/** Promedio diario de km con las lecturas disponibles (primera a última; mínimo 2 lecturas y 1 día). */
export function promedioDiario(lecturas: { km: number; leida_en: string }[]): number | null {
  if (lecturas.length < 2) return null;
  const orden = [...lecturas].sort((a, b) => a.leida_en.localeCompare(b.leida_en));
  const primera = orden[0]!, ultima = orden[orden.length - 1]!;
  const dias = (Date.parse(ultima.leida_en) - Date.parse(primera.leida_en)) / 86_400_000;
  if (dias < 1 || ultima.km <= primera.km) return null;
  return (ultima.km - primera.km) / dias;
}

export function kmProyectado(ultima: { km: number; leida_en: string }, promedio: number, ahora: Date): number {
  const dias = Math.max(0, (ahora.getTime() - Date.parse(ultima.leida_en)) / 86_400_000);
  return Math.round(ultima.km + promedio * dias);
}

function minutos(hhmm: string): number { const [h, m] = hhmm.split(":").map(Number); return h! * 60 + (m ?? 0); }

/** Cuándo programar un aviso respetando la ventana de envío del taller. */
export function programarEnVentana(ahora: Date, t: Taller): { cuando: string; fuera: boolean } {
  const hora = minutos(horaLocal(ahora, t.zona_horaria));
  const desde = minutos(t.ventana_desde), hasta = minutos(t.ventana_hasta);
  if (hora >= desde && hora <= hasta) return { cuando: ahora.toISOString(), fuera: false };
  const hoy = fechaLocal(ahora, t.zona_horaria);
  const fecha = hora < desde ? hoy : sumarDias(hoy, 1);
  return { cuando: localAUtc(fecha, t.ventana_desde, t.zona_horaria, ahora), fuera: false };
}

/** Convierte fecha+hora locales del taller a ISO UTC (aprovecha que Colombia no cambia de hora: UTC-5 fijo). */
export function localAUtc(fecha: string, hhmm: string, tz: string, ref: Date): string {
  const enTz = new Date(new Date(ref).toLocaleString("en-US", { timeZone: tz }));
  const offsetMin = Math.round((ref.getTime() - enTz.getTime()) / 60_000);
  return new Date(Date.parse(`${fecha}T${hhmm}:00Z`) + offsetMin * 60_000).toISOString();
}

interface NuevoAviso { vehiculo_id: string; tipo: string; clave: string; mensaje: string; programado_para: string; fuera_de_ventana: boolean }

function insertarAviso(db: DB, tallerId: string, a: NuevoAviso, ahora: Date): boolean {
  const existe = fila<{ id: string }>(db, "SELECT id FROM avisos WHERE clave = ?", a.clave);
  if (existe) return false;
  correr(db,
    "INSERT INTO avisos (id, taller_id, vehiculo_id, tipo, clave, mensaje, programado_para, fuera_de_ventana, creado_en) VALUES (?,?,?,?,?,?,?,?,?)",
    uid(), tallerId, a.vehiculo_id, a.tipo, a.clave, a.mensaje, a.programado_para, a.fuera_de_ventana ? 1 : 0, ahora.toISOString());
  return true;
}

function datosPlantilla(t: Taller, v: Veh): DatosPlantilla {
  return { tono: t.tono, firma: t.firma, nombre: v.cliente_nombre.split(" ")[0] ?? v.cliente_nombre, vehiculo: [v.marca, v.modelo].filter(Boolean).join(" ") || "vehículo", placa: v.placa };
}

/** Corre todas las reglas de calendario. Devuelve cuántos avisos nuevos materializó. */
export function evaluar(db: DB, tallerId: string, ahora: Date = new Date()): { creados: number; detalle: string[] } {
  const t = cargarTaller(db, tallerId);
  const r = reglas(db, tallerId);
  const hoy = fechaLocal(ahora, t.zona_horaria);
  const detalle: string[] = [];
  let creados = 0;

  const vehiculos = filas<Veh>(db, `
    SELECT v.id, v.placa, v.marca, v.modelo, v.soat_vence, v.tecno_vence,
           c.nombre AS cliente_nombre, c.celular, c.autorizacion_en
    FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id
    WHERE v.taller_id = ?`, tallerId);

  const servicios = filas<{ id: string; nombre: string; intervalo_km: number | null; intervalo_meses: number | null }>(
    db, "SELECT id, nombre, intervalo_km, intervalo_meses FROM catalogo WHERE taller_id = ? AND activo = 1", tallerId);

  const pico = r.pico?.activa ? tablaVigente(db, tallerId, hoy) : null;

  for (const v of vehiculos) {
    if (!v.celular || !v.autorizacion_en) continue; // Ley 1581: sin autorización no hay mensajes
    const d = datosPlantilla(t, v);
    const lecturas = filas<{ km: number; leida_en: string }>(db, "SELECT km, leida_en FROM lecturas_km WHERE vehiculo_id = ? ORDER BY leida_en", v.id);
    const ultima = lecturas[lecturas.length - 1];
    const prom = promedioDiario(lecturas);
    const enVentana = programarEnVentana(ahora, t);

    // 1 · Kilometraje cerca del intervalo (por km proyectado y por meses)
    if (r.km?.activa && servicios.length) {
      const umbral = Number(r.km.params["umbralKm"] ?? 500);
      for (const s of servicios) {
        const base = fila<{ km: number | null; fecha: string }>(db, `
          SELECT o.km_recepcion AS km, o.cerrada_en AS fecha
          FROM ordenes o JOIN orden_items i ON i.orden_id = o.id
          WHERE o.vehiculo_id = ? AND o.estado = 'cerrada' AND i.aprobado = 1 AND i.catalogo_id = ?
          ORDER BY o.cerrada_en DESC LIMIT 1`, v.id, s.id);
        if (!base) continue;
        if (s.intervalo_km && base.km != null && ultima && prom) {
          const hito = base.km + s.intervalo_km;
          const proyectado = kmProyectado(ultima, prom, ahora);
          const faltan = hito - proyectado;
          if (faltan <= umbral) {
            const ok = insertarAviso(db, tallerId, {
              vehiculo_id: v.id, tipo: "km", clave: `km:${v.id}:${s.id}:${hito}`,
              mensaje: plantillas.km(d, { servicio: s.nombre, km_faltan: Math.max(0, faltan) }),
              programado_para: enVentana.cuando, fuera_de_ventana: false,
            }, ahora);
            if (ok) { creados++; detalle.push(`km ${v.placa} ${s.nombre}`); }
          }
        }
        if (s.intervalo_meses) {
          const vence = sumarDias(base.fecha.slice(0, 10), Math.round(s.intervalo_meses * 30.44));
          const dias = diasEntre(hoy, vence);
          if (dias <= 15 && dias >= -15) {
            const ok = insertarAviso(db, tallerId, {
              vehiculo_id: v.id, tipo: "km", clave: `kmF:${v.id}:${s.id}:${vence}`,
              mensaje: plantillas.kmFecha(d, { servicio: s.nombre }),
              programado_para: enVentana.cuando, fuera_de_ventana: false,
            }, ahora);
            if (ok) { creados++; detalle.push(`km(fecha) ${v.placa} ${s.nombre}`); }
          }
        }
      }
    }

    // 2 · Documentos por vencer: recordatorio escalonado (p. ej. 30, 15 y 3 días)
    if (r.docs?.activa) {
      const umbrales = [Number(r.docs.params["d1"] ?? 30), Number(r.docs.params["d2"] ?? 15), Number(r.docs.params["d3"] ?? 3)].sort((a, b) => b - a);
      for (const [campo, nombreDoc] of [["soat_vence", "SOAT"], ["tecno_vence", "revisión técnico-mecánica"]] as const) {
        const vence = v[campo];
        if (!vence) continue;
        const dias = diasEntre(hoy, vence);
        if (dias < 0) continue;
        const etapa = [...umbrales].reverse().find((u) => dias <= u); // la etapa más próxima que ya se alcanzó
        if (etapa === undefined) continue;
        const ok = insertarAviso(db, tallerId, {
          vehiculo_id: v.id, tipo: "docs", clave: `docs:${v.id}:${campo}:${vence}:${etapa}`,
          mensaje: plantillas.docs(d, { documento: nombreDoc, fecha: vence, dias }),
          programado_para: enVentana.cuando, fuera_de_ventana: false,
        }, ahora);
        if (ok) { creados++; detalle.push(`docs ${v.placa} ${nombreDoc} ${etapa}d`); }
      }
    }

    // 3 · Pico y placa de mañana (hora propia de la regla; puede quedar fuera de la ventana
    //     general: el conflicto con la Ley 2300 está señalado en el plan, prerrequisito 5)
    if (r.pico?.activa && pico) {
      const manana = sumarDias(hoy, 1);
      if (aplica(pico, manana, v.placa)) {
        const hora = String(r.pico.params["hora"] ?? "19:00");
        const cuando = localAUtc(hoy, hora, t.zona_horaria, ahora);
        const fuera = minutos(hora) < minutos(t.ventana_desde) || minutos(hora) > minutos(t.ventana_hasta);
        const ok = insertarAviso(db, tallerId, {
          vehiculo_id: v.id, tipo: "pico", clave: `pico:${v.id}:${manana}`,
          mensaje: plantillas.pico(d),
          programado_para: Date.parse(cuando) < ahora.getTime() ? ahora.toISOString() : cuando,
          fuera_de_ventana: fuera,
        }, ahora);
        if (ok) { creados++; detalle.push(`pico ${v.placa} ${manana}`); }
      }
    }

    // 4 · Muchos días sin lectura de kilometraje
    if (r.lectura?.activa && ultima) {
      const diasSin = Number(r.lectura.params["dias"] ?? 45);
      const dias = (ahora.getTime() - Date.parse(ultima.leida_en)) / 86_400_000;
      if (dias >= diasSin) {
        const ok = insertarAviso(db, tallerId, {
          vehiculo_id: v.id, tipo: "lectura", clave: `lectura:${v.id}:${ultima.leida_en}`,
          mensaje: plantillas.lectura(d),
          programado_para: enVentana.cuando, fuera_de_ventana: false,
        }, ahora);
        if (ok) { creados++; detalle.push(`lectura ${v.placa}`); }
      }
    }

    // 6 · Cliente que no vuelve (factor × el intervalo de referencia del catálogo)
    if (r.reactivar?.activa) {
      const factor = Number(r.reactivar.params["factor"] ?? 2);
      const mesesRef = servicios.map((s) => s.intervalo_meses).filter((m): m is number => !!m).sort((a, b) => a - b)[0] ?? 6;
      const ultimaOrden = fila<{ cerrada_en: string }>(db, "SELECT cerrada_en FROM ordenes WHERE vehiculo_id = ? AND estado = 'cerrada' ORDER BY cerrada_en DESC LIMIT 1", v.id);
      const abierta = fila<{ id: string }>(db, "SELECT id FROM ordenes WHERE vehiculo_id = ? AND estado != 'cerrada' LIMIT 1", v.id);
      if (ultimaOrden && !abierta) {
        const limite = factor * mesesRef * 30.44 * 86_400_000;
        if (ahora.getTime() - Date.parse(ultimaOrden.cerrada_en) >= limite) {
          const ok = insertarAviso(db, tallerId, {
            vehiculo_id: v.id, tipo: "reactivar", clave: `reactivar:${v.id}:${ultimaOrden.cerrada_en}`,
            mensaje: plantillas.reactivar(d),
            programado_para: enVentana.cuando, fuera_de_ventana: false,
          }, ahora);
          if (ok) { creados++; detalle.push(`reactivar ${v.placa}`); }
        }
      }
    }
  }
  return { creados, detalle };
}

/** Regla 5 · Orden cerrada: se dispara al cerrar la orden, no por calendario. */
export function avisoCierre(db: DB, tallerId: string, ordenId: string, ahora: Date = new Date()): boolean {
  const r = reglas(db, tallerId);
  if (!r.cierre?.activa) return false;
  const t = cargarTaller(db, tallerId);
  const o = fila<{ vehiculo_id: string; km_recepcion: number | null }>(db, "SELECT vehiculo_id, km_recepcion FROM ordenes WHERE id = ?", ordenId);
  if (!o) return false;
  const v = fila<Veh>(db, `
    SELECT v.id, v.placa, v.marca, v.modelo, v.soat_vence, v.tecno_vence, c.nombre AS cliente_nombre, c.celular, c.autorizacion_en
    FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?`, o.vehiculo_id);
  if (!v || !v.celular || !v.autorizacion_en) return false;
  const items = filas<{ descripcion: string }>(db, "SELECT descripcion FROM orden_items WHERE orden_id = ? AND aprobado = 1", ordenId);
  const resumen = items.length ? items.map((i) => i.descripcion).join(", ") : "revisión general";
  let proximo: string | null = null;
  const s = fila<{ nombre: string; intervalo_km: number }>(db, `
    SELECT c.nombre, c.intervalo_km FROM orden_items i JOIN catalogo c ON c.id = i.catalogo_id
    WHERE i.orden_id = ? AND i.aprobado = 1 AND c.intervalo_km IS NOT NULL ORDER BY c.intervalo_km LIMIT 1`, ordenId);
  if (s && o.km_recepcion != null) proximo = `${s.nombre} hacia los ${miles(o.km_recepcion + s.intervalo_km)} km`;
  const enVentana = programarEnVentana(ahora, t);
  return insertarAviso(db, tallerId, {
    vehiculo_id: v.id, tipo: "cierre", clave: `cierre:${ordenId}`,
    mensaje: plantillas.cierre(datosPlantilla(t, v), { resumen, proximo }),
    programado_para: enVentana.cuando, fuera_de_ventana: false,
  }, ahora);
}
