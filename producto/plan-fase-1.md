# Plan del proyecto: Fase 1 de Taller Conectado para Kilómetro 0

Versión 1.0, 1 de octubre de 2026. Responsable: Mauricio Márquez Gutiérrez.

Construido sobre el levantamiento de la visita al taller del 1 de octubre de 2026 (ficha de
levantamiento, 11 bloques) y el diseño de
[taller-conectado](https://github.com/Analistadatositagui-design/taller-conectado). La medición
sigue el protocolo de `investigacion/protocolo.md`.

> **Compromiso central.** La Fase 1 se entrega operando en el taller el **1 de diciembre de 2026**.
> Esa fecha es de entrega de software en uso, no de propuesta. Por decisión del dueño, la Fase 1
> incluye el **módulo de costos y rentabilidad**.

## 1. Lo que la visita fijó

Datos del levantamiento que definen este plan:

| Dato | Valor | Consecuencia para el plan |
|---|---|---|
| Clientes al mes | 150 | Coincide con el histórico (3.600 órdenes / 24 meses); la escala es real |
| Ticket promedio | 300.000 pesos (estimado) | Se contrasta con el histórico cuando el export traiga el valor de la orden |
| Vuelven a tiempo | 15 % (estimado del dueño) | Línea base bajísima: recuperar 15 puntos vale 82,8 millones al año |
| Tamaño del taller | 9 mecánicos, 7 bahías, flotas | Más grande y más correctivo que el supuesto del diseño; los perfiles y la centralización suben de prioridad |
| Servicios que más vende | Reparación, latonería y pintura, motor, embrague | El «vuelve a tiempo» se mide sobre la porción preventiva (aceite, frenos, mantenimiento), no sobre colisiones |
| Histórico | 3.600 órdenes, 900 vehículos, en Excel, con huecos | La línea base es calculable; faltan la fecha de entrega del export y el valor de la orden |
| Herramientas | SIIGO (facturación), Excel (inventario y clientes), Drive (historial) | El módulo de costos arranca con importación desde SIIGO y Excel, no con integración directa |
| WhatsApp | Número personal, responde recepción | Migrar o estrenar número con la API de WhatsApp Business es prerrequisito de los avisos |
| Autorización de datos | No se pide hoy | El texto de autorización (Ley 1581) entra en la orden desde el primer día de uso |
| SOAT y tecnomecánica | No se guardan copias ni fechas | La condicional propia arranca de cero: las fechas se capturan en recepción |
| Dolores del dueño | Control de tickets, histórico por vehículo, perfiles e información centralizada, costos de repuestos, priorizar clientes rentables, checklist con evidencia | Definen el módulo de costos y suben los perfiles a Fase 1 |

## 2. Alcance de la Fase 1 (entrega 1 de diciembre de 2026)

### 2.1 Núcleo comprometido

| # | Módulo | Qué hace | Criterio de entrega |
|---|---|---|---|
| 1 | Panel del taller con perfiles | Tablero de citas y órdenes por estado; usuarios con rol dueño, recepción y mecánico; información centralizada | Una orden viaja de cita a cierre sin papel; cada rol ve lo suyo |
| 2 | Orden de trabajo y historial por vehículo | Recepción con kilometraje y fechas de SOAT y tecnomecánica; cada orden cerrada alimenta el historial | El historial de un vehículo del piloto se consulta en un toque |
| 3 | Checklist de ingreso con fotos | El mecánico registra la inspección en su celular Android; cada hallazgo con foto y estado | El checklist que hoy se hace en papel queda digital con evidencia |
| 4 | Cotización por WhatsApp con evidencia | Si hay piezas por cambiar, el cliente recibe cotización con foto y razón del cambio, y aprueba ítem por ítem | Queda registro de qué aprobó el cliente y cuándo |
| 5 | Avisos por kilometraje | Proyección por promedio diario; aviso a 500 km del intervalo con dos horarios de cita | Un aviso real genera una cita en el tablero |
| 6 | Avisos de SOAT y tecnomecánica | Recordatorio a los 30, 15 y 3 días con la fecha exacta | Un vehículo con fechas capturadas recibe su recordatorio |
| 7 | Citas desde WhatsApp | El cliente elige día y hora; la cita aparece en el tablero | Cita creada sin llamada |
| 8 | Autorización de datos (Ley 1581) | Texto en la orden y por WhatsApp, con registro de fecha y canal; política de tratamiento publicada | Ningún aviso sale a un cliente sin autorización registrada |
| 9 | Registro de eventos para la evaluación | Avisos enviados, entregados, respondidos, citas y órdenes, diseñado con el protocolo a la vista | El embudo del protocolo (anexo C) se calcula desde la tabla de eventos |
| 10 | **Costos y rentabilidad** | Costo de repuestos y mano de obra por orden; margen por orden, vehículo y cliente; ranking de clientes rentables | El dueño ve el margen de una orden cerrada y el ranking de clientes |

**Definición del módulo de costos en Fase 1.** Cada orden registra los repuestos usados con su costo
de compra y la mano de obra (horas por tarifa o valor fijo). El margen es el valor cobrado menos
repuestos menos mano de obra. Los costos de compra entran por importación de archivo desde SIIGO o
Excel y por captura manual en la orden; la integración directa con SIIGO por API queda para la
Fase 2. Esto responde tres dolores del levantamiento: «costos repuestos, módulo costos, no tenemos
esa variable», «priorizar clientes rentables» y «control de los tickets».

### 2.2 Si alcanza, sin mover la fecha

Aviso de pico y placa la víspera, centro de control del dueño con KPIs, y lectura de fechas de
documentos por foto. Entran solo si el núcleo está estable; si no, pasan a los días siguientes a la
entrega.

### 2.3 Fuera de la Fase 1

Agente de WhatsApp que entiende respuestas libres (Fase 2, decisión del dueño), app del cliente,
pagos en línea, campañas de reactivación, integración directa con SIIGO, inventario propio,
multi-sede y flotas como cuentas empresa.

## 3. Cronograma hacia el 1 de diciembre

Nueve semanas desde la visita. Dos hitos internos antes de la entrega.

| Semana | Fechas | Trabajo | Sale al final |
|---|---|---|---|
| 1 | oct 1 a 5 | Correcciones de la ficha (hecho). Solicitud del número y verificación en la API de WhatsApp Business. Borrador del texto de autorización y la política de datos. Pedir a contabilidad el export del histórico con valor de la orden | Trámites que tienen tiempos de terceros, iniciados |
| 2 | oct 6 a 12 | Línea base desde el histórico (retorno a tiempo real, no estimado). Modelo de datos y esqueleto del backend y el panel | Línea base calculada; repositorio con el núcleo andando en desarrollo |
| 3 | oct 13 a 19 | **Revisión con David (quincena): propuesta escrita cerrada, mecánico y cliente del piloto con nombre y celular, intervalos del catálogo, opción de asignación de la evaluación, bloque 11 confirmado con costos** | Acuerdos cerrados; pendientes del levantamiento en cero |
| 4 y 5 | oct 20 a nov 2 | **Hito 1, núcleo operativo:** órdenes, checklist con fotos, historial, catálogo, perfiles. Prueba interna con el mecánico del piloto | El taller registra órdenes reales en el sistema |
| 6 y 7 | nov 3 a 16 | Avisos por kilometraje y documentos con plantillas aprobadas, cotización por WhatsApp, citas, registro de eventos. **Módulo de costos:** captura e importación, margen y ranking | **Hito 2:** primer aviso real enviado; margen visible en una orden cerrada |
| 8 | nov 17 a 23 | Si alcanza: pico y placa, KPIs del dueño, fechas por foto. Carga de datos reales (clientes con celular y autorización) | Sistema con datos reales del taller |
| 9 | nov 24 a 30 | Pruebas de punta a punta, capacitación de recepción y mecánicos, ajustes | Listo para operar |
| — | **dic 1** | **Entrega de la Fase 1 operando en el taller** | |

Desde el primer aviso real empieza a correr la medición del protocolo, con ventana de doce meses
(decisión del levantamiento).

## 4. Prerrequisitos que no dependen del código

Si alguno se atrasa, mueve la fecha; por eso van en la semana 1 a 3.

1. **Número de WhatsApp con API de Business.** El número actual es personal. Migrarlo o estrenar
   número, con verificación de Meta y plantillas aprobadas; el trámite tarda días o semanas.
2. **Histórico con valor de la orden.** Contabilidad exporta desde SIIGO; sin el valor no se
   contrasta el ticket ni se calcula margen histórico. Falta fijar la fecha de entrega.
3. **Mecánico y cliente del piloto.** El bloque 6 de la ficha sigue vacío; sin ellos el hito 1 no
   tiene con quién probarse.
4. **Intervalos del catálogo.** Hoy solo aceite (5.000 km / 2 meses, por verificar: dos meses es
   inusualmente corto) y revisión de frenos (3 meses). Se necesitan al menos tres servicios con
   intervalo; se completan con el manual del fabricante.
5. **Autorización y horario de envío.** Texto de la Ley 1581 listo antes de cargar clientes.
   Resolver el conflicto de horario: la ventana quedó de 08:30 a 16:30 y el aviso de pico y placa a
   las 19:00; se amplía la ventana o se mueve el aviso, verificando la Ley 2300 de 2023.
6. **Credenciales y propiedad.** Quién guarda las cuentas (WhatsApp, dominio, repositorio) quedó sin
   definir; se cierra en la revisión de la quincena.

## 5. Riesgos del plan

| Riesgo | Cobertura |
|---|---|
| Nueve semanas para diez módulos | El orden del cronograma protege el núcleo: si algo se cae, se cae un «si alcanza», nunca los diez comprometidos |
| El módulo de costos crece (es el dolor más sentido del dueño) | Alcance cerrado en 2.1: captura, importación, margen y ranking; la integración directa con SIIGO es Fase 2 por escrito |
| La verificación de WhatsApp Business se demora | Se inicia la semana 1; mientras tanto, todo lo demás avanza; los avisos son semanas 6 y 7 |
| El histórico llega tarde o sin valor | La línea base por fechas se calcula igual (campos fecha, placa, km, servicios ya confirmados); el margen histórico se pospone sin mover la entrega |
| El «2 meses» del aceite infla los avisos | Se verifica con David antes de activar la regla; la tolerancia quedó en 10 % del intervalo |
| Datos personales en el camino | La ficha y sus PDF quedan fuera de git; los clientes solo entran al sistema con autorización registrada |

## 6. La medición, en dos líneas

Con la línea base estimada de 15 % y la mejora de 15 puntos del caso de negocio, el protocolo
necesita 121 vehículos por grupo (242 en total): viable con los 900 vehículos del histórico. La
opción de asignación (al azar, por cohortes o antes y después) se decide con David en la revisión de
la quincena y queda registrada en el protocolo antes de encender los avisos.

## 7. Después del 1 de diciembre

- **Diciembre a noviembre de 2027:** operación y medición, con corte operativo del embudo a los tres
  meses (protocolo, sección 8.3).
- **Fase 2, decidida con la regla del protocolo (sección 8.7):** agente de WhatsApp, app del
  cliente, pagos, campañas, integración directa con SIIGO.
- **Fase 3:** multi-taller, flotas, facturación.
