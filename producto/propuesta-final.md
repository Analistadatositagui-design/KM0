# Taller Conectado · Proyecto final

Propuesta para Mario, dueño del taller Kilómetro 0 (Medellín). Versión editable para entrega:
documento vivo en claude.ai (artefacto «Taller Conectado · Proyecto final»). Este archivo es la
copia versionada; la Fase 1 está en firme y las cifras de las fases 2 y 3 son de referencia.

Fecha: 2026-10-02 · Autor: Mauricio Márquez Gutiérrez

## Qué resuelve

Hoy la información del taller está dispersa y los perfiles no se hablan entre sí: recepción lleva
sus planillas, contabilidad exporta su propio Excel (unas 3.600 órdenes y 900 clientes), los
mecánicos reportan en papel o de palabra, y los mensajes a clientes salen de un WhatsApp personal.
Nadie ve el negocio completo, y por eso solo vuelve cerca del 15 % de los clientes: nadie les avisa
a tiempo que les toca mantenimiento.

Taller Conectado centraliza todo sin cambiar la forma de trabajar de cada quien. Cada perfil
(recepción, mecánico, administrador) sigue registrando los mismos datos que hoy, pero en el
sistema; y el panel administrador muestra todo unificado y en vivo, para tomar decisiones basadas
en datos: qué órdenes hay abiertas, qué clientes dejan margen, qué avisos salieron y quién
respondió.

## Cómo queda implementado

Cada rol entra con su usuario y clave y ve solo lo suyo; el administrador lo ve todo. Es una
aplicación web: funciona desde el celular o el computador, sin instalar nada.

| Perfil | Quién | Qué registra | Qué ve |
| --- | --- | --- | --- |
| Administrador | Mario (dueño) | Reglas, catálogo, precios | Todo unificado: embudo, costos, margen y ranking de clientes |
| Recepción | Quien recibe vehículos | Cliente, orden, kilometraje, autorización de datos, citas | Tablero del día, bandeja de WhatsApp |
| Mecánico | Taller | Checklist de ingreso con fotos, hallazgos | Sus órdenes en trabajo |
| Contabilidad (Fase 2) | SIIGO / Excel | Costos reales importados | Reportes de rentabilidad |

El corazón es un **motor inteligente multiestados**: cada orden y cada aviso avanzan por estados y
el sistema actúa solo según el estado en que esté cada cliente.

- **Estados de la orden**: recibida → en inspección → cotizada → aprobada (ítem por ítem) → en
  trabajo → cerrada.
- **Estados del aviso**: pendiente → enviado → entregado → respondido → cita agendada → llegó al
  taller.
- **Condiciones que vigila**: kilometraje proyectado por el uso real de cada vehículo, vencimiento
  de SOAT y técnico-mecánica (avisos a 30, 15 y 3 días), pico y placa, clientes inactivos para
  reactivar y lecturas de kilometraje vencidas.
- **Candados**: sin autorización de datos registrada (Ley 1581) no sale ningún mensaje, y todo se
  envía solo dentro del horario definido por el taller (hoy 08:30 a 16:30).

Ciclo del motor: servicio cerrado → el motor vigila las condiciones → aviso por WhatsApp → el
cliente responde → cita agendada → nueva orden en el taller → cerrada, y el ciclo vuelve a empezar.
Cada paso queda registrado como evento; esos son los mismos números del reporte mensual.

## Fases, costos y plazos

El proyecto se construye por fases. Cada fase tiene un costo inicial de construcción y una
mensualidad de mantenimiento y soporte que arranca cuando esa fase entra en operación. Valores en
COP. La Fase 1 está en firme; los valores de las fases 2 y 3 son de referencia y se fijan antes de
aprobar cada una.

| Fase | Qué entrega | Plazo | Costo inicial (COP) | Mensualidad (COP) |
| --- | --- | --- | --- | --- |
| 1 · Núcleo operativo | Sistema completo operando: perfiles, órdenes, checklist con fotos, cotización y avisos por WhatsApp, citas, costos y rentabilidad | 2 meses desde la aprobación | 10.000.000 (en firme) | 500.000 (en firme) |
| 2 · Integraciones | Conexión con SIIGO, carga del histórico completo, WhatsApp Business API plena, reportes avanzados, respaldo ampliado | 6 semanas | 5.000.000 – 7.000.000 (por confirmar) | reemplaza a la anterior: 550.000 – 700.000 |
| 3 · Inteligencia | Agente que responde a los clientes, predicción de deserción, encuestas de satisfacción automáticas | 6–8 semanas | 6.000.000 – 8.000.000 (por confirmar) | reemplaza a la anterior: 700.000 – 900.000 |

- La mensualidad es una sola por todo el sistema: al entrar una fase nueva, la mensualidad sube a
  la de esa fase (no se suman).
- Forma de pago sugerida del costo inicial: 50 % al aprobar la fase y 50 % a la entrega operando
  (en la Fase 1: 5.000.000 y 5.000.000).
- El costo por conversación de WhatsApp Business API lo factura Meta aparte según el volumen; se
  estima con datos reales durante la Fase 1.
- Cada fase se aprueba por separado: terminar la Fase 1 no obliga a contratar la 2.

## Fase 1 en detalle

La Fase 1 entrega el sistema completo operando con estos diez módulos, ya construidos en su núcleo
y probados con datos del levantamiento del 1 de octubre (ver `plan-fase-1.md` y `app/`):

| # | Módulo | Qué hace |
| --- | --- | --- |
| 1 | Panel con perfiles | Usuarios y claves por rol: administrador, recepción, mecánico |
| 2 | Orden e historial | Cada vehículo con su historia completa: kilometraje, documentos, servicios |
| 3 | Checklist de ingreso | Revisión con fotos desde el celular: bien / atención / urgente |
| 4 | Cotización por WhatsApp | Cotización con evidencia (fotos) y aprobación ítem por ítem con fecha |
| 5 | Avisos por kilometraje | Proyecta el uso real de cada vehículo y avisa cuando se acerca el mantenimiento |
| 6 | Avisos de SOAT y técnico-mecánica | Recordatorios escalonados a 30, 15 y 3 días del vencimiento |
| 7 | Citas | Agenda ligada al aviso: del mensaje a la cita y de la cita a la orden |
| 8 | Autorización de datos (Ley 1581) | Registro de autorización por cliente; sin ella no sale ningún mensaje |
| 9 | Registro de eventos | Embudo automático: aviso → respuesta → cita → visita, para medir resultados |
| 10 | Costos y rentabilidad | Repuestos y mano de obra por orden, margen real y ranking de clientes rentables |

Además queda incluido el aviso de pico y placa por placa y día, con tabla configurable y festivos.

**Reajustes durante el desarrollo.** La Fase 1 no es rígida: durante los 2 meses se revisa el
avance con el equipo del taller y los ajustes sobre lo construido (textos de los mensajes, campos,
reglas, pantallas) están incluidos en el costo inicial. Los módulos nuevos que surjan se evalúan en
una línea: si caben en el plazo entran a la Fase 1; si no, pasan a la fase siguiente con su costo,
sin frenar la entrega.

## Cronograma de la Fase 1

Plazo: 2 meses desde la aprobación de ejecución del proyecto. Aprobando en la primera semana de
octubre, la entrega operando queda el 1 de diciembre de 2026.

| Semanas | Qué pasa | Hito |
| --- | --- | --- |
| 1–2 | Instalación en hosting, perfiles y claves, catálogo de servicios, carga inicial de clientes y vehículos desde el histórico | Sistema instalado |
| 3–5 | Operación piloto en recepción: órdenes reales, checklist con fotos, cotizaciones por WhatsApp | Hito 1: núcleo en uso diario |
| 6–7 | Módulo de costos y rentabilidad en uso; motor de avisos activo con el grupo piloto; reajustes acordados | Hito 2: avisos saliendo |
| 8 | Capacitación de todo el equipo; afinación de mensajes, tono y horario de envío | Equipo entrenado |
| 9 | Entrega: Fase 1 completa operando con todos los módulos | Entrega de la Fase 1 |

Para arrancar el reloj se necesitan de parte del taller: el número que se usará para WhatsApp, el
Excel histórico de contabilidad, los nombres del grupo piloto, los intervalos del catálogo
validados y el texto de autorización de datos con el horario de contacto.

## Qué incluye la mensualidad

- Hosting, monitoreo y respaldo diario de la información.
- Soporte por canal directo con respuesta en máximo 1 día hábil.
- Ajustes menores: textos de mensajes, catálogo, precios, reglas del motor, usuarios.
- Actualizaciones de seguridad y mejoras pequeñas del sistema.
- Reporte mensual de resultados para el administrador.

No incluye: módulos o desarrollos nuevos (se cotizan como fase o adición), el costo por
conversación que factura Meta por WhatsApp Business API, ni equipos o celulares del taller.

## Compromisos y medición de resultados

- **Los datos son del taller.** Toda la información queda en una base exportable completa cuando
  Mario lo pida; si algún día termina el servicio, se entrega todo.
- **Ley 1581 de protección de datos.** Cada cliente queda con su autorización registrada (cómo y
  cuándo la dio); el sistema bloquea cualquier mensaje a quien no la tenga.
- **Seguridad.** Usuario y clave individual por persona, con permisos según el rol.
- **Medición honesta.** Línea base: hoy vuelve cerca del 15 % de los clientes; meta de la Fase 1:
  30 %. El embudo (aviso → respuesta → cita → visita) se registra solo y Mario recibe un reporte
  mensual con los números reales.

Así la decisión de seguir a la Fase 2 se toma igual que todo en este sistema: con datos.
