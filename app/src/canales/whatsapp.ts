/** Canal de WhatsApp de la Fase 1.
 *
 *  Mientras el taller migra su número a la API de WhatsApp Business (prerrequisito 1 del
 *  plan), el canal operativo es la BANDEJA DE SALIDA: el motor deja cada aviso listo y
 *  recepción lo copia y lo envía desde el WhatsApp actual del taller, marcando enviado,
 *  entregado y respondido. Esos marcados alimentan el embudo de la evaluación.
 *
 *  Cuando existan credenciales (WHATSAPP_TOKEN y WHATSAPP_PHONE_ID con plantillas
 *  aprobadas por Meta), enviarPorApi() completa el envío automático. Sin credenciales
 *  reales ese camino queda SIN PROBAR y la bandeja sigue siendo la fuente de verdad. */

export interface DatosPlantilla {
  tono: "tu" | "usted";
  firma: string;
  nombre: string;
  vehiculo: string;
  placa: string;
}

const saludo = (d: DatosPlantilla) => (d.tono === "tu" ? `Hola, ${d.nombre}.` : `Buen día, ${d.nombre}.`);
const su = (d: DatosPlantilla) => (d.tono === "tu" ? "tu" : "su");

export const plantillas = {
  km: (d: DatosPlantilla, p: { servicio: string; km_faltan: number }) =>
    `${saludo(d)} ${cap(su(d))} ${d.vehiculo} (${d.placa}) está a unos ${miles(p.km_faltan)} km del servicio «${p.servicio}». ¿Le reservamos una cita esta semana? — ${d.firma}`,
  kmFecha: (d: DatosPlantilla, p: { servicio: string }) =>
    `${saludo(d)} A ${su(d)} ${d.vehiculo} (${d.placa}) le corresponde por tiempo el servicio «${p.servicio}». ¿Le agendamos una cita? — ${d.firma}`,
  docs: (d: DatosPlantilla, p: { documento: string; fecha: string; dias: number }) =>
    `${saludo(d)} ${p.documento} del vehículo ${d.placa} vence el ${p.fecha} (en ${p.dias} ${p.dias === 1 ? "día" : "días"}). — ${d.firma}`,
  pico: (d: DatosPlantilla) =>
    `${saludo(d)} Mañana la placa ${d.placa} tiene pico y placa en Medellín de 5:00 a. m. a 8:00 p. m. Que no lo tome por sorpresa. — ${d.firma}`,
  lectura: (d: DatosPlantilla) =>
    `${saludo(d)} ¿Nos regala el kilometraje actual de ${su(d)} ${d.vehiculo} (${d.placa})? Así le avisamos a tiempo el próximo mantenimiento. — ${d.firma}`,
  cierre: (d: DatosPlantilla, p: { resumen: string; proximo: string | null }) =>
    `${saludo(d)} Entregamos ${su(d)} ${d.vehiculo} (${d.placa}): ${p.resumen}.${p.proximo ? ` Próximo servicio estimado: ${p.proximo}.` : ""} Gracias por confiar en nosotros. — ${d.firma}`,
  reactivar: (d: DatosPlantilla) =>
    `${saludo(d)} Hace tiempo no vemos ${su(d)} ${d.vehiculo} (${d.placa}). Si quiere, le agendamos una revisión. — ${d.firma}`,
  cotizacion: (d: DatosPlantilla, p: { n: number; total: number }) =>
    `${saludo(d)} La revisión de ${su(d)} ${d.vehiculo} (${d.placa}) sugiere ${p.n} ${p.n === 1 ? "trabajo" : "trabajos"} por ${miles(p.total)} pesos. Le compartimos el detalle con fotos; responda cuáles aprueba. — ${d.firma}`,
};

export function miles(n: number): string { return new Intl.NumberFormat("es-CO").format(n); }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Envío automático por la Cloud API de Meta. Requiere plantillas aprobadas; sin
 *  credenciales devuelve pendiente y el aviso se gestiona desde la bandeja. */
export async function enviarPorApi(celular: string, mensaje: string): Promise<{ ok: boolean; detalle: string }> {
  const token = process.env.WHATSAPP_TOKEN, telefonoId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !telefonoId) return { ok: false, detalle: "sin_credenciales" };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${telefonoId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: "57" + celular.replace(/\D/g, ""), type: "text", text: { body: mensaje } }),
    });
    return r.ok ? { ok: true, detalle: "api" } : { ok: false, detalle: `api_${r.status}` };
  } catch (e) {
    return { ok: false, detalle: "api_error" };
  }
}
