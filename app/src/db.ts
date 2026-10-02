import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));

/** Capa de datos. Hoy SQLite embebido de Node (cero dependencias, un archivo);
 *  el SQL de schema.sql es portable y esta capa es el único punto a tocar
 *  cuando el hosting defina PostgreSQL. */
export type DB = DatabaseSync;

export function abrirDb(ruta: string): DB {
  if (ruta !== ":memory:") mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(readFileSync(join(aqui, "schema.sql"), "utf8"));
  return db;
}

export const uid = (): string => randomUUID();
export const ahoraIso = (): string => new Date().toISOString();

export function fila<T>(db: DB, sql: string, ...args: (string | number | null)[]): T | undefined {
  return db.prepare(sql).get(...args) as T | undefined;
}
export function filas<T>(db: DB, sql: string, ...args: (string | number | null)[]): T[] {
  return db.prepare(sql).all(...args) as T[];
}
export function correr(db: DB, sql: string, ...args: (string | number | null)[]): void {
  db.prepare(sql).run(...args);
}
