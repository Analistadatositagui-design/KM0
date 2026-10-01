import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "./http.ts";
import { abrirDb } from "./db.ts";
import { usuarioDeToken } from "./auth.ts";
import { rutasNucleo } from "./rutas/nucleo.ts";
import { rutasOrdenes } from "./rutas/ordenes.ts";
import { rutasControl } from "./rutas/control.ts";
import { sembrarBase, TALLER_ID } from "./seed.ts";
import { evaluar } from "./motor/condiciones.ts";

const aqui = dirname(fileURLToPath(import.meta.url));
const dirDatos = process.env.TALLER_DATOS ?? join(aqui, "..", "data");
const db = abrirDb(process.env.TALLER_DB ?? join(dirDatos, "taller.db"));
sembrarBase(db);

export const app = new App();
app.autenticar = (token) => usuarioDeToken(db, token);
rutasNucleo(app, db);
rutasOrdenes(app, db, dirDatos);
rutasControl(app, db);
app.estatico("/fotos/", join(dirDatos, "fotos"));
app.estatico("/", join(aqui, "..", "web"));

const puerto = Number(process.env.PUERTO ?? 3000);
const cadaMinutos = Number(process.env.MOTOR_CADA_MINUTOS ?? 30);

if (process.env.NODE_ENV !== "test") {
  app.servidor().listen(puerto, () => {
    console.log(`Taller Conectado · Fase 1 — http://localhost:${puerto}`);
    console.log(`Motor de condiciones cada ${cadaMinutos} min; datos en ${dirDatos}`);
  });
  const correrMotor = () => {
    try {
      const r = evaluar(db, TALLER_ID);
      if (r.creados) console.log(`[motor] ${r.creados} avisos nuevos: ${r.detalle.join("; ")}`);
    } catch (e) { console.error("[motor] error", e); }
  };
  correrMotor();
  setInterval(correrMotor, cadaMinutos * 60_000).unref();
}
