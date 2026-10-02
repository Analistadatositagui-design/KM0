import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  cuerpo: unknown;
  usuario?: { id: string; taller_id: string; nombre: string; rol: "dueno" | "recepcion" | "mecanico" };
}
export type Manejador = (ctx: Ctx) => Promise<unknown> | unknown;

export class ErrorHttp extends Error {
  codigo: number;
  constructor(codigo: number, mensaje: string) { super(mensaje); this.codigo = codigo; }
}

interface Ruta { metodo: string; partes: string[]; fn: Manejador; limite: number; }

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".json": "application/json",
};

export class App {
  rutas: Ruta[] = [];
  estaticos: { prefijo: string; dir: string }[] = [];
  autenticar?: (token: string | null) => Ctx["usuario"] | undefined;
  abiertas = new Set<string>(); // "METODO /ruta" sin autenticación

  en(metodo: string, patron: string, fn: Manejador, opciones?: { limite?: number; abierta?: boolean }) {
    this.rutas.push({ metodo, partes: patron.split("/").filter(Boolean), fn, limite: opciones?.limite ?? 262_144 });
    if (opciones?.abierta) this.abiertas.add(metodo + " " + patron);
    return this;
  }
  get(p: string, fn: Manejador, o?: { abierta?: boolean }) { return this.en("GET", p, fn, o); }
  post(p: string, fn: Manejador, o?: { limite?: number; abierta?: boolean }) { return this.en("POST", p, fn, o); }
  put(p: string, fn: Manejador, o?: { limite?: number }) { return this.en("PUT", p, fn, o); }
  del(p: string, fn: Manejador) { return this.en("DELETE", p, fn); }
  estatico(prefijo: string, dir: string) { this.estaticos.push({ prefijo, dir }); return this; }

  private casar(metodo: string, ruta: string): { r: Ruta; params: Record<string, string>; patron: string } | undefined {
    const partes = ruta.split("/").filter(Boolean);
    for (const r of this.rutas) {
      if (r.metodo !== metodo || r.partes.length !== partes.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < partes.length; i++) {
        const p = r.partes[i]!, v = partes[i]!;
        if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(v);
        else if (p !== v) { ok = false; break; }
      }
      if (ok) return { r, params, patron: r.metodo + " /" + r.partes.join("/") };
    }
    return undefined;
  }

  servidor(): Server {
    return createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://x");
      try {
        const casada = this.casar(req.method ?? "GET", url.pathname);
        if (casada) {
          const ctx: Ctx = { req, res, params: casada.params, query: url.searchParams, cuerpo: undefined };
          if (!this.abiertas.has(casada.patron)) {
            const auth = req.headers.authorization;
            const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
            ctx.usuario = this.autenticar?.(token);
            if (!ctx.usuario) throw new ErrorHttp(401, "Sesión inválida o vencida");
          }
          if (req.method === "POST" || req.method === "PUT") ctx.cuerpo = await leerJson(req, casada.r.limite);
          const salida = await casada.r.fn(ctx);
          if (!res.writableEnded) json(res, 200, salida ?? { ok: true });
          return;
        }
        if ((req.method ?? "GET") === "GET" && await this.servirEstatico(url.pathname, res)) return;
        json(res, 404, { error: "No existe la ruta " + url.pathname });
      } catch (e) {
        const codigo = e instanceof ErrorHttp ? e.codigo : 500;
        if (codigo === 500) console.error("[error]", req.method, url.pathname, e);
        if (!res.writableEnded) json(res, codigo, { error: e instanceof Error ? e.message : "Error interno" });
      }
    });
  }

  private async servirEstatico(ruta: string, res: ServerResponse): Promise<boolean> {
    for (const { prefijo, dir } of this.estaticos) {
      if (!ruta.startsWith(prefijo)) continue;
      let rel = normalize(ruta.slice(prefijo.length)).replace(/^([/\\])+/, "");
      if (rel.includes("..")) return false;
      if (rel === "") rel = "index.html";
      let abs = join(dir, rel);
      try {
        if ((await stat(abs)).isDirectory()) abs = join(abs, "index.html");
        const datos = await readFile(abs);
        res.writeHead(200, { "content-type": MIME[extname(abs)] ?? "application/octet-stream", "cache-control": "no-cache" });
        res.end(datos);
        return true;
      } catch { /* siguiente prefijo */ }
    }
    return false;
  }
}

function json(res: ServerResponse, codigo: number, cuerpo: unknown) {
  const datos = JSON.stringify(cuerpo);
  res.writeHead(codigo, { "content-type": "application/json; charset=utf-8" });
  res.end(datos);
}

async function leerJson(req: IncomingMessage, limite: number): Promise<unknown> {
  const trozos: Buffer[] = [];
  let total = 0;
  for await (const t of req) {
    total += (t as Buffer).length;
    if (total > limite) throw new ErrorHttp(413, "El cuerpo supera el límite permitido");
    trozos.push(t as Buffer);
  }
  if (total === 0) return {};
  try { return JSON.parse(Buffer.concat(trozos).toString("utf8")); }
  catch { throw new ErrorHttp(400, "El cuerpo no es JSON válido"); }
}

/** Validación mínima de entrada. */
export function texto(c: unknown, campo: string, opcional = false): string {
  const v = (c as Record<string, unknown>)?.[campo];
  if (v === undefined || v === null || v === "") {
    if (opcional) return "";
    throw new ErrorHttp(400, `Falta el campo «${campo}»`);
  }
  if (typeof v !== "string") throw new ErrorHttp(400, `El campo «${campo}» debe ser texto`);
  return v.trim();
}
export function entero(c: unknown, campo: string, opcional = false): number | null {
  const v = (c as Record<string, unknown>)?.[campo];
  if (v === undefined || v === null || v === "") {
    if (opcional) return null;
    throw new ErrorHttp(400, `Falta el campo «${campo}»`);
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ErrorHttp(400, `El campo «${campo}» debe ser numérico`);
  return Math.round(n);
}
export function requiereRol(ctx: Ctx, ...roles: Array<"dueno" | "recepcion" | "mecanico">) {
  if (!ctx.usuario || !roles.includes(ctx.usuario.rol))
    throw new ErrorHttp(403, "Tu rol no permite esta acción");
}
