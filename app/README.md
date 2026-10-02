# Taller Conectado · código de la Fase 1

Núcleo del sistema para Kilómetro 0 según `../producto/plan-fase-1.md`. API en TypeScript sobre
Node 22 (ejecutado nativamente, sin paso de compilación), base de datos SQLite embebida y panel
web servido por el mismo proceso.

## Correr

```
cd app
npm install          # solo herramientas de desarrollo (typescript); el runtime no tiene dependencias
npm run seed:demo    # configura el taller y crea datos de demostración (placa DEM001)
npm run dev          # http://localhost:3000
npm test             # pruebas del motor, pico y placa y flujo completo
npm run typecheck    # tsc estricto
```

Usuarios iniciales (claves de arranque, **cambiarlas antes de operar con datos reales**):
`david` / `k0-dueno-2026` (dueño) · `recepcion` / `k0-recepcion-2026` · `mecanico` / `k0-mecanico-2026`.

Variables: `PUERTO` (3000), `TALLER_DATOS` (carpeta de datos; por defecto `app/data`, ignorada por
git), `MOTOR_CADA_MINUTOS` (30), `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` (API de Meta, cuando exista).

## Demo en línea

Hay una demo navegable del panel (puerto del motor y la interfaz a una página, con datos ficticios
marcados como demo) en <https://claude.ai/artifact/1FiYmeD5asXjksxjT6GEj4>. Es privada del dueño del
proyecto y sirve para probar desde el celular; no es el servidor real de esta carpeta, que se
desplegará cuando se defina el hosting (prerrequisito 6 del plan).

## Qué cubre del plan (módulos de la sección 2.1)

| Módulo | Estado |
|---|---|
| 1 Panel con perfiles (dueño, recepción, mecánico) | Hecho: sesiones, roles en API y panel |
| 2 Orden e historial por vehículo | Hecho: recepción con km y documentos, historial consultable |
| 3 Checklist de ingreso con fotos | Hecho: hallazgos bien/atención/urgente con foto desde el celular |
| 4 Cotización por WhatsApp con evidencia | Hecho: mensaje a la bandeja; aprobación ítem por ítem con fecha y vía |
| 5 Avisos por kilometraje | Hecho: proyección por promedio diario, umbral 500 km, dedup por hito |
| 6 Avisos de SOAT y tecnomecánica | Hecho: escalonado 30/15/3 con una etapa a la vez |
| 7 Citas | Hecho: agendar, llegada desde el tablero, eventos del embudo |
| 8 Autorización de datos (Ley 1581) | Hecho: registro por canal y versión; sin ella no sale ningún mensaje |
| 9 Registro de eventos para la evaluación | Hecho: tabla de eventos con el embudo del protocolo (anexo C) |
| 10 Costos y rentabilidad | Hecho: repuestos y mano de obra por orden, margen, ranking de clientes |
| «Si alcanza»: pico y placa | Motor y tabla configurable hechos; el conflicto de horario (19:00 vs. ventana) queda señalado en cada aviso |

El motor corre dentro del servidor cada 30 minutos y respeta la ventana de envío del taller:
lo que vence de noche queda programado para la apertura del día siguiente.

## Decisiones (y lo que falta)

- **WhatsApp por bandeja de salida.** Hasta que el número migre a la API de WhatsApp Business
  (prerrequisito 1 del plan), recepción envía cada aviso desde el panel (botón que abre WhatsApp
  con el mensaje listo) y marca enviado, entregado y respondido; eso alimenta la medición. El envío
  automático por la API está implementado pero sin credenciales reales queda sin probar.
- **SQLite embebido, PostgreSQL en la mira.** El diseño de taller-conectado nombra PostgreSQL; aquí
  arranca con el SQLite de Node (cero dependencias, un archivo, suficiente para un taller) con el
  SQL portable y la capa de datos aislada en `src/db.ts`. El cambio se decide cuando se defina el
  hosting, antes del hito 1.
- **Fotos como JPG en disco** (`data/fotos/`), reducidas en el navegador a 1280 px. En producción
  esa carpeta entra al respaldo del servidor.
- **TypeScript sin transpilar** (type stripping de Node 22.18+). `npm run typecheck` corre tsc
  estricto; no hay bundler ni build.
- Pendiente de este núcleo: importación de costos desde archivo SIIGO/Excel, carga masiva de la
  base de clientes, respaldo automático, y cambio de claves desde el panel. Van antes del hito 1
  (2 de noviembre).

Los datos (`app/data/`) nunca entran a git: contienen información personal de clientes.
