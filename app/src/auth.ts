import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { type DB, fila, correr, uid, ahoraIso } from "./db.ts";
import { ErrorHttp, type Ctx } from "./http.ts";

const HORAS_SESION = 12;

export function hashClave(clave: string): string {
  const sal = randomBytes(16).toString("hex");
  return sal + ":" + scryptSync(clave, sal, 64).toString("hex");
}
export function verificarClave(clave: string, guardado: string): boolean {
  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;
  const calculado = scryptSync(clave, sal, 64);
  const esperado = Buffer.from(hash, "hex");
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

interface FilaUsuario { id: string; taller_id: string; nombre: string; usuario: string; clave_hash: string; rol: "dueno" | "recepcion" | "mecanico"; activo: number; }

export function crearSesion(db: DB, usuario: string, clave: string) {
  const u = fila<FilaUsuario>(db, "SELECT * FROM usuarios WHERE usuario = ? AND activo = 1", usuario);
  if (!u || !verificarClave(clave, u.clave_hash)) throw new ErrorHttp(401, "Usuario o clave incorrectos");
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_SESION * 3600_000).toISOString();
  correr(db, "INSERT INTO sesiones (token, usuario_id, expira_en) VALUES (?,?,?)", token, u.id, expira);
  return { token, usuario: { id: u.id, nombre: u.nombre, rol: u.rol } };
}

export function usuarioDeToken(db: DB, token: string | null): Ctx["usuario"] | undefined {
  if (!token) return undefined;
  const s = fila<{ usuario_id: string; expira_en: string }>(db, "SELECT usuario_id, expira_en FROM sesiones WHERE token = ?", token);
  if (!s || s.expira_en < ahoraIso()) return undefined;
  const u = fila<FilaUsuario>(db, "SELECT * FROM usuarios WHERE id = ? AND activo = 1", s.usuario_id);
  if (!u) return undefined;
  return { id: u.id, taller_id: u.taller_id, nombre: u.nombre, rol: u.rol };
}

export function cerrarSesion(db: DB, token: string) {
  correr(db, "DELETE FROM sesiones WHERE token = ?", token);
}

export function crearUsuario(db: DB, tallerId: string, nombre: string, usuario: string, clave: string, rol: FilaUsuario["rol"]): string {
  const id = uid();
  correr(db, "INSERT INTO usuarios (id, taller_id, nombre, usuario, clave_hash, rol, creado_en) VALUES (?,?,?,?,?,?,?)",
    id, tallerId, nombre, usuario, hashClave(clave), rol, ahoraIso());
  return id;
}
