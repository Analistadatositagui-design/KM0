import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App } from "../src/http.ts";
import { abrirDb, type DB } from "../src/db.ts";
import { usuarioDeToken, crearSesion } from "../src/auth.ts";
import { rutasNucleo } from "../src/rutas/nucleo.ts";
import { rutasOrdenes } from "../src/rutas/ordenes.ts";
import { rutasControl } from "../src/rutas/control.ts";
import { sembrarBase } from "../src/seed.ts";

export function appDePrueba(): { db: DB; app: App; dirDatos: string } {
  const db = abrirDb(":memory:");
  sembrarBase(db);
  const dirDatos = mkdtempSync(join(tmpdir(), "taller-"));
  const app = new App();
  app.autenticar = (t) => usuarioDeToken(db, t);
  rutasNucleo(app, db);
  rutasOrdenes(app, db, dirDatos);
  rutasControl(app, db);
  return { db, app, dirDatos };
}

export function token(db: DB, usuario: string, clave: string): string {
  return crearSesion(db, usuario, clave).token;
}

export async function escuchar(app: App): Promise<{ base: string; cerrar: () => void }> {
  const srv = app.servidor();
  await new Promise<void>((res) => srv.listen(0, res));
  const dir = srv.address();
  const puerto = typeof dir === "object" && dir ? dir.port : 0;
  return { base: `http://127.0.0.1:${puerto}`, cerrar: () => srv.close() };
}

export async function llamar(base: string, tok: string | null, metodo: string, ruta: string, cuerpo?: unknown) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const json = (await r.json()) as Record<string, unknown>;
  return { estado: r.status, json };
}
