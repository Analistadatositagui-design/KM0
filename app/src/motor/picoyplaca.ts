import { type DB, fila } from "../db.ts";

export interface TablaPico {
  vigente_desde: string;
  vigente_hasta: string;
  digitos: Record<string, number[]>; // día ISO ("1"=lunes … "5"=viernes) → dígitos
  festivos: string[];
}

export function tablaVigente(db: DB, tallerId: string, fechaLocal: string): TablaPico | null {
  const r = fila<{ vigente_desde: string; vigente_hasta: string; digitos: string; festivos: string }>(
    db,
    "SELECT vigente_desde, vigente_hasta, digitos, festivos FROM pico_placa WHERE taller_id = ? AND vigente_desde <= ? AND vigente_hasta >= ? ORDER BY vigente_desde DESC LIMIT 1",
    tallerId, fechaLocal, fechaLocal,
  );
  if (!r) return null;
  return { vigente_desde: r.vigente_desde, vigente_hasta: r.vigente_hasta, digitos: JSON.parse(r.digitos), festivos: JSON.parse(r.festivos) };
}

export function diaIso(fechaLocal: string): number {
  const [a, m, d] = fechaLocal.split("-").map(Number);
  const dow = new Date(Date.UTC(a!, m! - 1, d!)).getUTCDay(); // 0=domingo
  return dow === 0 ? 7 : dow;
}

export function ultimoDigito(placa: string): number | null {
  const m = placa.match(/(\d)\s*$/);
  return m ? Number(m[1]) : null; // motos terminan en letra: sin dígito final, no aplica esta tabla
}

/** ¿Aplica pico y placa a esta placa en esta fecha local? */
export function aplica(tabla: TablaPico, fechaLocal: string, placa: string): boolean {
  const dia = diaIso(fechaLocal);
  if (dia > 5) return false;
  if (tabla.festivos.includes(fechaLocal)) return false;
  const digito = ultimoDigito(placa);
  if (digito === null) return false;
  return (tabla.digitos[String(dia)] ?? []).includes(digito);
}
