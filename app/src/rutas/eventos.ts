import { type DB, correr, uid, ahoraIso } from "../db.ts";

/** Embudo de la evaluación (protocolo, anexo C): cada paso queda como evento. */
export function registrarEvento(
  db: DB, tallerId: string,
  tipo: "aviso_enviado" | "aviso_entregado" | "aviso_respondido" | "cita_creada" | "cita_asistida" | "orden_cerrada",
  refs: { aviso_id?: string; vehiculo_id?: string; orden_id?: string; cita_id?: string },
  datos: Record<string, unknown> = {},
) {
  correr(db, "INSERT INTO eventos (id, taller_id, tipo, aviso_id, vehiculo_id, orden_id, cita_id, datos, en) VALUES (?,?,?,?,?,?,?,?,?)",
    uid(), tallerId, tipo, refs.aviso_id ?? null, refs.vehiculo_id ?? null, refs.orden_id ?? null, refs.cita_id ?? null, JSON.stringify(datos), ahoraIso());
}
