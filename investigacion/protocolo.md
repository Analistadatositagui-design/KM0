# Protocolo de investigación: Taller Conectado para Kilómetro 0

Versión 0.2, actualizado con el levantamiento de la visita al taller. 1 de octubre de 2026.
Responsable: Mauricio Márquez Gutiérrez.

El diseño del producto, la presentación y el benchmarking de mercado viven en
[taller-conectado](https://github.com/Analistadatositagui-design/taller-conectado). Este
protocolo define cómo se investiga, con método científico, el producto que ese diseño propone:
qué se quiere saber, qué se mide, con qué diseño, con qué datos y con qué reglas éticas.

> **Estado.** Borrador. Se congela como versión 1.0 antes de que empiece el piloto, con un tag
> de git (`protocolo-v1.0`). Desde ese momento el protocolo funciona como pre-registro: cualquier
> cambio a las hipótesis, a la variable principal o al análisis principal se anota en el registro
> de enmiendas del final, con fecha y motivo, y nunca se borra.

## 1. Resumen

Un taller independiente pierde al cliente entre visitas. Taller Conectado propone un motor de
avisos proactivos por WhatsApp, disparados por kilometraje proyectado, vencimiento de SOAT y
tecnomecánica, y pico y placa, con cita en un toque. El caso de negocio descansa en un supuesto
que nadie ha medido: que los avisos suben en quince puntos el porcentaje de clientes que vuelven a
tiempo.

Esta investigación pone a prueba ese supuesto. Sigue el marco de Design Science Research
(investigación en ciencias del diseño): el producto es el artefacto, la Fase 1 es su construcción
y el piloto es su evaluación. La evaluación es un estudio controlado a nivel de vehículo, con
grupo de comparación, durante seis a doce meses, cuya variable principal es la proporción de
vehículos que vuelven a tiempo al taller. Antes del piloto se establece una línea base
retrospectiva con el histórico de órdenes, se revisa la literatura con una bitácora reproducible
y se validan los tres supuestos técnicos del diseño: la proyección de kilometraje, la lectura de
fechas por foto y el agente de WhatsApp.

## 2. Punto de partida

Lo que existe al 24 de septiembre de 2026:

| Insumo | Dónde | Estado |
|---|---|---|
| Problema y tesis | Presentación, pantallas 2 y 3 | Definido, sin cuantificar |
| Benchmarking de mercado | `docs/01-investigacion.md` de taller-conectado | Hecho con fuentes comerciales; no reproducible (se reconstruyó desde la presentación) |
| Arquitectura y diseño del producto | `docs/02-diseno.md` de taller-conectado | Diseñado; no construido |
| Ficha de levantamiento de la visita | Artefacto privado de claude.ai | Llena el 1 de octubre de 2026 (7 de 11 bloques completos) |
| Código del producto | Este repositorio | No existe |
| Línea base (tres números) | Ficha, bloque 1 | Estimada por el dueño: 150 clientes/mes, ticket 300.000, 15 % vuelve a tiempo; pendiente contraste con el histórico |

Lo que este protocolo aporta: pregunta e hipótesis explícitas, definición operativa de las
variables, diseño de evaluación con tamaño de muestra, instrumentos, plan de revisión de literatura
reproducible, marco ético y legal, cronograma y criterio de decisión.

## 3. Planteamiento del problema

Los talleres independientes administran la visita, no el tiempo entre visitas. Cuando el carro
sale del taller, nadie sabe cuándo debe volver: el taller no lo recuerda y el dueño del carro
tampoco. El resultado es un mantenimiento que se aplaza, un cliente que cotiza en otro taller y un
historial que se pierde. Las herramientas del mercado (locales y globales) resuelven la orden, el
inventario y la factura; el recordatorio es un accesorio.

La propuesta invierte el orden: la plataforma vive entre visitas y le habla al dueño del carro con
información que le sirve aunque no compre nada (documentos por vencer, pico y placa de mañana), y
sobre ese permiso ofrece el servicio. La pregunta científica es si esa intervención produce el
efecto que promete, cuánto, a qué costo y bajo qué condiciones.

## 4. Preguntas de investigación

**Pregunta principal.** ¿Un sistema de avisos proactivos por WhatsApp, disparado por kilometraje
proyectado, vencimiento de documentos y pico y placa, aumenta la proporción de vehículos que
vuelven a tiempo al taller Kilómetro 0, frente a la práctica actual?

Preguntas secundarias:

| # | Pregunta | Alimenta |
|---|---|---|
| P2 | ¿Qué tipo de aviso (kilometraje, documento, pico y placa, cierre de orden) genera más respuestas y más citas? | Configuración del motor de condiciones |
| P3 | ¿Con qué precisión se puede proyectar el kilometraje a partir de lecturas en recepción y reportes del cliente? | Umbral de 500 km de la regla de kilometraje |
| P4 | ¿Con qué exactitud extrae la IA las fechas de vigencia del SOAT y la tecnomecánica desde una foto? | Captura de documentos sin digitar |
| P5 | ¿Qué proporción de respuestas libres de los clientes entiende correctamente el agente de WhatsApp? | Agente de kilometraje y de agenda |
| P6 | ¿Cómo perciben el dueño, el mecánico y los clientes la utilidad y la facilidad de uso del sistema? | Adopción; diseño de la Fase 2 |
| P7 | ¿Cuál es el retorno económico del sistema frente a su costo de operación (mensajes, infraestructura, mantenimiento)? | Caso de negocio; decisión de Fase 2 |
| P8 | ¿Qué condiciones del taller (registro de kilometraje, base de clientes, WhatsApp) deben existir para que el sistema funcione en un segundo taller? | Replicación (Fase 3) |

## 5. Hipótesis y variables

### 5.1 Hipótesis

| # | Hipótesis | Criterio (valor de trabajo, se confirma en la v1.0) |
|---|---|---|
| H1 (principal) | La proporción de vehículos que vuelven a tiempo es mayor en el grupo con avisos que en el grupo sin avisos. | Diferencia de al menos 15 puntos porcentuales, con intervalo de confianza del 95 % que excluya el cero. La hipótesis nula es que no hay diferencia. |
| H2 | El tiempo entre visitas (días) es menor en el grupo con avisos. | Diferencia de medianas con IC 95 % que excluya el cero (análisis de supervivencia). |
| H3 | Los avisos generan respuesta y citas. | Al menos 30 % de los avisos de kilometraje o documento reciben respuesta y al menos 10 % terminan en cita creada. |
| H4 | La proyección de kilometraje es suficientemente precisa para la regla de 500 km. | Error absoluto medio menor que 500 km entre el kilometraje proyectado para la fecha de recepción y el leído en recepción, para proyecciones hechas con al menos 30 días de anticipación. |
| H5 | La lectura de fechas por foto es confiable. | Fechas correctas en al menos 95 % de los documentos legibles; los ilegibles se cuentan aparte. |
| H6 | El agente entiende las respuestas libres. | Interpretación correcta en al menos 90 % de las respuestas de kilometraje y de agenda, contra etiquetado humano. |
| H7 | Los avisos no reducen el ticket promedio (no inferioridad). | El ticket promedio del grupo con avisos no es menor que el del grupo sin avisos en más de 10 %. |

El valor de trabajo de H1 (15 puntos) es el mismo del caso de negocio de la presentación. La
mejora mínima que vale la pena detectar se fija en la v1.0 con la línea base en mano; la tabla de
la sección 8.5 muestra lo que cuesta detectar 10, 15 o 20 puntos.

### 5.2 Variables

| Variable | Tipo | Definición operativa | Fuente |
|---|---|---|---|
| Exposición a avisos | Independiente, binaria por vehículo | Asignado al grupo con avisos (sí) o al grupo sin avisos (no) durante la ventana | Tabla de asignación |
| Retorno a tiempo | Dependiente principal, binaria por vehículo y servicio | Ver sección 8.4 | Órdenes del taller |
| Tiempo hasta el retorno | Dependiente secundaria, días | Días entre el cierre de una orden y la siguiente orden del mismo vehículo; censurado al fin de la ventana | Órdenes del taller |
| Ticket promedio | Dependiente secundaria, pesos | Valor total de la orden, con y sin repuestos (se reportan ambos) | Facturación |
| Respuesta a un aviso | Secundaria, binaria por aviso | Mensaje del cliente en las 72 horas siguientes al aviso | Registro de eventos |
| Cita por aviso | Secundaria, binaria por aviso | Cita creada en los 7 días siguientes al aviso, para el servicio del aviso | Registro de eventos |
| Asistencia a la cita | Secundaria, binaria por cita | Orden abierta el día de la cita o hasta 3 días después | Órdenes |
| Error de proyección de km | Secundaria, km | Valor absoluto de (km proyectado para la fecha de recepción menos km leído) | Motor y recepción |
| Exactitud de lectura de fechas | Secundaria, proporción | Fechas iguales a las verificadas a mano sobre el documento | Muestra etiquetada |
| Exactitud del agente | Secundaria, proporción | Coincidencia entre la interpretación del agente y el etiquetado humano | Muestra etiquetada |
| Utilidad y facilidad de uso percibidas | Secundaria, cualitativa y escala | Entrevistas y encuesta breve (constructos del modelo TAM) | Guion de entrevista |
| Covariables | Control | Tipo de vehículo, marca, antigüedad del modelo, antigüedad como cliente, número de órdenes previas, kilometraje anual estimado, si tenía celular registrado antes del estudio | Histórico |

## 6. Objetivos

**General.** Diseñar, construir y evaluar con evidencia medible un sistema de avisos proactivos que
aumente el retorno a tiempo de los clientes del taller Kilómetro 0, y documentarlo de forma que
pueda replicarse en un segundo taller.

**Específicos.**

1. Establecer la línea base de retorno a tiempo, tiempo entre visitas y ticket promedio con el
   histórico de órdenes del taller.
2. Revisar la literatura científica y el marco legal colombiano aplicable, con bitácora
   reproducible.
3. Construir el artefacto de la Fase 1 según el diseño de taller-conectado.
4. Validar los tres supuestos técnicos: proyección de kilometraje, lectura de fechas por foto y
   comprensión del agente.
5. Evaluar el impacto de los avisos con un diseño controlado y un análisis pre-especificado.
6. Estimar el retorno económico frente al costo de operación.
7. Comunicar los resultados y las condiciones de replicación.

## 7. Marco metodológico

Investigación aplicada, de enfoque mixto, bajo el marco de Design Science Research (Hevner et al.,
2004; Peffers et al., 2007). El marco encaja porque el objeto de estudio es un artefacto
tecnológico que se diseña para resolver un problema práctico y cuya utilidad se demuestra con
evidencia. Las seis actividades del proceso de Peffers se mapean así:

| Actividad de DSR | En este proyecto | Entregable | Estado |
|---|---|---|---|
| 1. Identificar el problema y motivar | Tesis y caso de negocio de la presentación; cuantificación con línea base | Sección 3 de este protocolo; informe de línea base | Definido, sin cuantificar |
| 2. Definir los objetivos de la solución | Hipótesis y criterios de éxito | Secciones 5 y 6 | Este borrador |
| 3. Diseñar y desarrollar | Arquitectura de taller-conectado; construcción de la Fase 1 | Código en este repositorio | Diseñado, no construido |
| 4. Demostrar | Prueba de concepto con un mecánico y un cliente; validación técnica | Informe de validación técnica | Pendiente |
| 5. Evaluar | Estudio controlado de seis a doce meses | Informe de evaluación con scripts | Pendiente |
| 6. Comunicar | Informe final, propuesta de Fase 2, guía de replicación | Documentos en este repositorio | Pendiente |

El componente cuantitativo responde H1 a H7. El cualitativo (entrevistas, hallazgos de la visita,
notas del piloto) responde P6 y P8 y explica los porqués detrás de los números.

## 8. Diseño de la evaluación

### 8.1 Unidad de análisis y población

La unidad de análisis es el **vehículo** (identificado por la placa, seudonimizada en los datos de
análisis), no el cliente: el intervalo de servicio, el kilometraje y los documentos son del
vehículo. La población son los vehículos atendidos por Kilómetro 0 en los 24 meses anteriores al
inicio del piloto cuyo dueño tiene celular registrado y autoriza el tratamiento de datos. Los
vehículos nuevos que entran durante el piloto se incorporan con la misma regla de asignación.

### 8.2 Asignación a grupos

Se presentan tres opciones, de la más fuerte a la más débil. La elección queda registrada en la
v1.0.

**Opción A (recomendada): asignación aleatoria por vehículo.** Cada vehículo elegible se asigna al
azar, uno a uno, al grupo con avisos o al grupo sin avisos, estratificando por tipo de vehículo y
por antigüedad como cliente. El grupo sin avisos recibe exactamente el servicio de hoy. Al cerrar
la ventana, ese grupo empieza a recibir los avisos. La semilla de la aleatorización y la tabla de
asignación se guardan fuera del repositorio junto con la tabla de seudónimos.

**Opción B: incorporación escalonada por cohortes.** Si el dueño no acepta que la mitad de los
clientes quede sin avisos durante la ventana, los vehículos se dividen en tres o cuatro cohortes
que entran cada dos meses, en orden aleatorio. Cada cohorte sirve de comparación hasta que recibe
los avisos (diseño de cuña escalonada; Hussey y Hughes, 2007).

**Opción C: antes y después con control histórico.** Se compara el retorno a tiempo de los 12 a 24
meses previos con el de la ventana del piloto. Es la opción más débil: no separa el efecto de los
avisos de lo que cambió en el entorno (precios, pico y placa, temporada). Solo se usa si A y B son
imposibles, y se reporta como tal.

### 8.3 Ventana temporal

Mínimo seis meses de intervención, porque el intervalo más corto del catálogo (cambio de aceite)
es de 5.000 km o seis meses. Doce meses es lo recomendable: cubre los servicios anuales y la
estacionalidad (diciembre, vacaciones, cambio de tabla de pico y placa). A los tres meses se hace
un corte operativo solo con las métricas de proceso (entregas, respuestas, citas, errores) para
corregir la operación; la variable principal no se mira hasta el cierre, para no sesgar la
decisión de parar o seguir.

### 8.4 Definición operativa de «vuelve a tiempo»

Para cada vehículo y cada servicio del catálogo con intervalo:

1. El **vencimiento** del intervalo es lo primero que ocurra entre el kilometraje del último
   servicio más el intervalo en km, y la fecha del último servicio más el intervalo en meses.
2. El vehículo **vuelve a tiempo** si registra una orden con ese servicio antes del vencimiento más
   una **tolerancia**. Valor de trabajo: 10 % del intervalo en km, o 30 días, según cuál aplique.
   La tolerancia se acuerda con el dueño en la v1.0 y no se cambia después.
3. Solo cuentan los vehículos cuyo vencimiento cae dentro de la ventana de observación (vehículos
   «en riesgo»). Un vehículo cuyo intervalo no vence durante la ventana no entra en el numerador ni
   en el denominador.
4. La proporción de retorno a tiempo es el número de vehículos en riesgo que volvieron a tiempo
   dividido por el número de vehículos en riesgo.

La misma regla se aplica hacia atrás sobre el histórico para calcular la línea base. Cuando el
kilometraje entre visitas no se conoce (no se registró), el vencimiento se calcula solo por fecha,
y el caso se marca.

### 8.5 Tamaño de muestra

Cálculo para comparar dos proporciones independientes con prueba bilateral, nivel de
significancia de 0,05 y potencia de 0,80, generado con
`herramientas/tamano_muestra.py` (sin dependencias; se puede volver a correr con otros valores):

| Línea base (p1) | Mejora (puntos) | p2 | Vehículos por grupo | Total |
|---:|---:|---:|---:|---:|
| 50 % | +10 | 60 % | 388 | 776 |
| 50 % | +15 | 65 % | 170 | 340 |
| 50 % | +20 | 70 % | 93 | 186 |
| 60 % | +10 | 70 % | 356 | 712 |
| 60 % | +15 | 75 % | 152 | 304 |
| 60 % | +20 | 80 % | 82 | 164 |
| 70 % | +10 | 80 % | 294 | 588 |
| 70 % | +15 | 85 % | 121 | 242 |
| 70 % | +20 | 90 % | 62 | 124 |

Lectura: con una línea base de 60 % y la mejora de 15 puntos del caso de negocio, hacen falta
152 vehículos en riesgo por grupo. Un mecánico y un cliente, como plantea la presentación, son una
prueba de concepto, no una evaluación. Si el parque de vehículos elegibles es menor que lo
necesario, el estudio se hace igual, se reporta como piloto con su intervalo de confianza y se
repite en el segundo taller.

### 8.6 Plan de análisis

Todo el análisis se escribe en scripts versionados en `investigacion/analisis/` (Python con
pandas, statsmodels y lifelines, o R). Los datos crudos no entran al repositorio.

- **Análisis principal (H1).** Diferencia de proporciones entre grupos con intervalo de confianza
  del 95 % y prueba z (o chi-cuadrado). Por intención de tratar: cada vehículo se analiza en el
  grupo asignado, aunque un mensaje no se haya entregado.
- **Análisis ajustado.** Regresión logística con las covariables de la sección 5.2, para
  reportar el efecto ajustado y su intervalo.
- **Tiempo hasta el retorno (H2).** Curvas de Kaplan-Meier por grupo y modelo de Cox; los vehículos
  que no vuelven antes del cierre quedan censurados.
- **Embudo de avisos (H3, P2).** Por tipo de aviso: enviado, entregado, leído, respondido, cita
  creada, cita asistida, orden cerrada (definiciones en el anexo C).
- **Validación técnica (H4, H5, H6).** Error absoluto medio de la proyección; exactitud de
  lectura de fechas sobre una muestra etiquetada a mano; exactitud del agente sobre una muestra
  de respuestas etiquetada por dos personas, con acuerdo entre ellas reportado.
- **Ticket (H7).** Diferencia de medias con intervalo; límite de no inferioridad de 10 %.
- **Económico (P7).** Ingresos de los servicios recuperados (vehículos que volvieron a tiempo por
  encima de la línea base, por el ticket promedio) frente a los tres costos: mensajes,
  infraestructura y mantenimiento. Se reporta el retorno simple y el mes en que se recupera la
  inversión, con sus supuestos explícitos.
- **Cualitativo (P6, P8).** Codificación temática de entrevistas y notas del piloto; triangulación
  con los números.

Sin corrección por comparaciones múltiples para las secundarias: se reportan todas, con su
intervalo, y solo H1 sostiene la decisión.

### 8.7 Regla de decisión

Se fija antes del piloto para que el resultado no se interprete a conveniencia:

| Resultado de H1 | Decisión |
|---|---|
| Diferencia de 10 puntos o más y el IC 95 % excluye el cero | Se recomienda la Fase 2 y la replicación en el segundo taller. |
| Diferencia positiva pero el IC 95 % incluye el cero | Se extiende la ventana o se amplía la muestra; no se construye la Fase 2 todavía. |
| Diferencia menor que 5 puntos o negativa | Se detiene la Fase 2. Se revisa con los datos del embudo qué falló (entrega, respuesta, cita o asistencia) y se rediseña la intervención. |

## 9. Fuentes de datos e instrumentos

| # | Fuente | Qué aporta | Instrumento | Cuándo |
|---|---|---|---|---|
| 1 | Ficha de levantamiento (artefacto privado) | Tres números y su origen, taller hoy, catálogo con intervalos, condiciones, piloto, hallazgos | Ficha de ocho bloques ya construida | Visita, semana 0 |
| 2 | Histórico de órdenes (facturación, software o cuaderno) | Línea base retrospectiva y covariables | `instrumentos/historico-ordenes.csv` (plantilla; diccionario en el anexo A) | Semanas 1 y 2 |
| 3 | Registro de eventos del sistema | Avisos, entregas, lecturas, respuestas, citas, órdenes, lecturas de km | Tabla de eventos del backend (se diseña en la Fase 1 con este protocolo a la vista) | Continuo desde el piloto |
| 4 | Lecturas de kilometraje en recepción | Insumo de la proyección y de H4 | Panel del taller | Cada recepción |
| 5 | Encuesta breve al cliente | Utilidad del aviso, recomendación (0 a 10), molestia | Tres preguntas por WhatsApp tras el cierre de la orden; máximo una por cliente cada tres meses | Durante el piloto |
| 6 | Entrevistas semiestructuradas | Percepción, adopción, dolores (P6, P8) | `instrumentos/guion-entrevista.md` | Antes del piloto, mes 3 y cierre |
| 7 | Etiquetado humano | Exactitud de lectura de fechas y del agente (H5, H6) | Hoja de etiquetado con dos etiquetadores | Mensual durante el piloto |
| 8 | Bitácora de búsqueda bibliográfica | Reproducibilidad de la revisión | `instrumentos/bitacora-busqueda.csv` | Semanas 1 a 4 |

## 10. Plan de revisión de literatura

El benchmarking existente usa fuentes comerciales (Capterra, GetApp, páginas de proveedores). Sirve
como evidencia de mercado, no como estado del arte científico. La revisión que se propone es
sistemática en su registro, aunque no pretenda ser una revisión sistemática completa.

### 10.1 Ejes

1. Retención y lealtad del cliente en posventa automotriz y en servicios recurrentes.
2. Efectividad de recordatorios por mensajería (SMS, WhatsApp) sobre asistencia a citas y
   adherencia. La evidencia más sólida está en salud (por ejemplo, Gurol-Urganci et al., 2013) y se
   usa como referencia de magnitud del efecto.
3. Comportamiento del propietario frente al mantenimiento preventivo del vehículo.
4. Adopción de tecnología en micro y pequeñas empresas, en particular talleres, con los modelos
   TAM (Davis, 1989) y UTAUT (Venkatesh et al., 2003).
5. Design Science Research aplicado a sistemas de información en pequeñas empresas.
6. Marco legal colombiano: protección de datos (Ley 1581 de 2012 y Decreto 1377 de 2013),
   contacto comercial con consumidores (Ley 2300 de 2023), obligatoriedad del SOAT y de la revisión
   técnico-mecánica (Ley 769 de 2002 y normas que la modifican), y los decretos semestrales de pico
   y placa de la Alcaldía de Medellín.
7. Políticas de la plataforma de WhatsApp Business: categorías de plantillas, consentimiento y
   costos por mensaje, porque condicionan qué avisos se pueden enviar y a qué precio.

### 10.2 Bases y cadenas de búsqueda

Bases: Google Scholar, Scopus (si hay acceso institucional), SciELO, Redalyc, Dialnet, Cochrane
Library y repositorios institucionales de universidades colombianas.

Cadenas iniciales (se ajustan y se registran en la bitácora):

```
("customer retention" OR "customer loyalty") AND ("automotive aftersales" OR "auto repair" OR "vehicle service")
("SMS reminder" OR "text message reminder" OR WhatsApp) AND ("appointment attendance" OR adherence) AND (trial OR "meta-analysis")
("preventive maintenance" OR "vehicle maintenance") AND ("owner behavior" OR compliance OR adherence)
("technology acceptance" OR TAM OR UTAUT) AND (SME OR "small business" OR pyme OR mipyme) AND (Colombia OR "Latin America")
"design science research" AND ("information systems") AND (SME OR "small business")
(recordatorio OR recordatorios) AND (WhatsApp OR "mensaje de texto") AND (asistencia OR citas)
(fidelización OR retención) AND (taller OR "posventa automotriz")
("adopción tecnológica" OR "aceptación tecnológica") AND (mipymes OR pymes) AND Colombia
```

### 10.3 Criterios

- Inclusión: artículos revisados por pares, tesis y reportes institucionales, de 2010 en
  adelante, más los trabajos seminales de cada eje sin límite de fecha.
- Exclusión: material de marketing de proveedores (se conserva en el benchmarking, no aquí),
  textos sin método descrito.
- Cada búsqueda se registra en `instrumentos/bitacora-busqueda.csv` con fecha, base, cadena,
  filtros, resultados y seleccionados.

### 10.4 Producto

`investigacion/revision-literatura.md`: síntesis por eje, matriz de evidencia (fuente, contexto,
método, hallazgo, magnitud del efecto, pertinencia para Kilómetro 0) y lo que cambia en el diseño a
raíz de la revisión.

## 11. Consideraciones éticas y legales

- **Autorización de datos.** Cada cliente autoriza el tratamiento de sus datos y la recepción de
  avisos, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. La autorización se recoge en
  la orden de trabajo o por WhatsApp, y se registra con fecha y canal. El taller publica su política
  de tratamiento.
- **Retiro.** El cliente puede pedir en cualquier momento que no le escriban más; el sistema lo
  respeta de inmediato y el servicio del taller no cambia por eso.
- **Grupo sin avisos.** Recibe el servicio de siempre, que es la práctica actual. Al cierre de la
  ventana recibe los avisos. Nadie queda peor que hoy.
- **Riesgo.** Mínimo: la intervención son mensajes informativos sobre el vehículo. El beneficio
  esperado es mantenimiento a tiempo y documentos vigentes.
- **Seudonimización.** En los datos de análisis la placa se reemplaza por un identificador. La
  tabla de correspondencia y la de asignación a grupos las guarda el taller, fuera del
  repositorio. Nombre, cédula, celular y placa no entran en ningún archivo de análisis ni en git.
- **Horarios y frecuencia.** Los avisos se envían dentro de los horarios y con la frecuencia que
  permite la Ley 2300 de 2023 para el contacto con consumidores. Hay que verificar el texto vigente
  y cómo clasifica los avisos de servicio frente a los comerciales; el aviso de pico y placa
  programado a las 7 de la noche queda en el límite y debe revisarse antes de la Fase 1.
- **Propiedad y publicación.** Los datos son del taller. Los resultados agregados pueden
  publicarse sin identificar a nadie; el acuerdo con el dueño queda por escrito antes del piloto.
- **Comité de ética.** Si el trabajo se presenta como tesis o artículo, se somete al comité de la
  institución correspondiente con este protocolo como base.

## 12. Amenazas a la validez y cómo se cubren

| Amenaza | Qué podría pasar | Cobertura |
|---|---|---|
| Historia | Cambia el pico y placa, suben los precios, hay una campaña externa | Ambos grupos viven el mismo periodo (opciones A y B); se registran los eventos externos en una bitácora del piloto |
| Selección | Solo los clientes con celular y autorización entran; difieren de los demás | Se describe a los excluidos con el histórico; la aleatorización equilibra los grupos entre los elegibles |
| Contaminación | Un cliente del grupo sin avisos se entera por otro cliente | Se registra como limitación; en la opción A diluye el efecto, no lo infla |
| Efecto Hawthorne | El taller atiende mejor durante el piloto | Ambos grupos reciben la misma atención en el taller; solo cambia el aviso |
| Atrición | Clientes que cambian de número, venden el carro o se mudan | Se registra el motivo; el análisis por intención de tratar mantiene al vehículo en su grupo |
| Instrumentación | Cambia la forma de registrar el kilometraje a mitad del piloto | Procedimiento de recepción fijado desde el día cero y auditado en el corte de tres meses |
| Estacionalidad y regresión a la media | Diciembre, vacaciones, un mes atípico en la línea base | Ventana de doce meses si es posible; línea base de 24 meses |
| Validez de constructo | «A tiempo» y «ticket» mal definidos | Definiciones operativas fijadas en la v1.0; ticket con y sin repuestos |
| Conclusión estadística | Muestra pequeña, muchas comparaciones | Tamaño de muestra calculado; una sola hipótesis sostiene la decisión |
| Validez externa | Un taller, una ciudad | Se reporta como caso; la replicación en el segundo taller es parte del diseño (P8) |
| Sesgo del investigador | Se interpreta el resultado a conveniencia | Pre-registro con tag de git, regla de decisión previa, scripts públicos en el repositorio |

## 13. Cronograma

Re-anclado tras la visita del 1 de octubre de 2026. La fecha dura es la entrega de la Fase 1
operando en el taller el **1 de diciembre de 2026**, con el módulo de costos y rentabilidad
incluido por decisión del dueño. El detalle semana a semana vive en
[`producto/plan-fase-1.md`](../producto/plan-fase-1.md); aquí queda el marco de la investigación.

| Momento | Actividad | Entregable |
|---|---|---|
| 1 oct 2026 | Visita de dos horas; ficha de levantamiento | Hecho: ficha con 7 de 11 bloques |
| Sem. oct 6 a 12 | Histórico de órdenes y línea base retrospectiva; revisión de literatura en paralelo (hasta fin de octubre) | Informe de línea base |
| Sem. oct 13 a 19 | Revisión con el dueño: propuesta escrita, piloto con nombres, catálogo, opción de asignación; cierre de las preguntas abiertas (sección 16) | Tag `protocolo-v1.0` |
| oct 20 a nov 30 | Construcción de la Fase 1 con la tabla de eventos diseñada para el análisis; validación técnica de proyección de km y lectura de fechas en las últimas dos semanas | Código; informe de validación técnica |
| Antes de encender avisos | Asignación según la opción acordada, autorizaciones registradas | Tabla de asignación (fuera del repo) |
| **1 dic 2026** | **Entrega de la Fase 1 en operación** | Sistema en uso en el taller |
| dic 2026 a nov 2027 | Medición con ventana de doce meses (decisión de la visita); corte operativo del embudo a los tres meses | Tablero de seguimiento del embudo |
| Cierre + 4 semanas | Análisis, entrevistas de cierre, informe de evaluación | `evaluacion.md` con scripts |
| Cierre + 6 semanas | Decisión sobre la Fase 2; guía de replicación para el segundo taller | Propuesta de Fase 2 |

## 14. Entregables y criterios de calidad

| Entregable | Ubicación | Criterio de calidad |
|---|---|---|
| Protocolo v1.0 | `investigacion/protocolo.md`, tag `protocolo-v1.0` | Preguntas abiertas cerradas; enmiendas registradas después |
| Informe de línea base | `investigacion/linea-base.md` | Reproducible desde el histórico con el script de análisis |
| Revisión de literatura | `investigacion/revision-literatura.md` | Bitácora completa; matriz de evidencia |
| Informe de validación técnica | `investigacion/validacion-tecnica.md` | Muestras etiquetadas por dos personas; métricas con intervalo |
| Informe de evaluación | `investigacion/evaluacion.md` | Análisis pre-especificado; scripts en `investigacion/analisis/`; limitaciones explícitas |
| Guía de replicación | `investigacion/replicacion.md` | Condiciones mínimas del taller (P8) y configuración necesaria |

## 15. Roles

| Rol | Quién | Responsabilidad |
|---|---|---|
| Investigador responsable | Mauricio Márquez Gutiérrez | Diseño, análisis, informes, custodia de los scripts |
| Dueño del taller | Por confirmar en la visita | Acceso al histórico, decisiones de negocio, autorización de clientes, custodia de las tablas de seudónimos y asignación |
| Mecánico del piloto | Por confirmar en la visita | Registro de kilometraje e inspecciones según el procedimiento |
| Etiquetador segundo | Por definir | Etiquetado independiente de fechas y respuestas del agente |
| Clientes | Vehículos elegibles con autorización | Participantes |

## 16. Preguntas abiertas para cerrar en la v1.0

- [x] Los tres números y su origen (ficha, bloque 1): 150 clientes/mes, ticket 300.000, 15 % vuelve a tiempo, estimado del dueño. Se contrastan con el histórico.
- [ ] Histórico de órdenes: hay 3.600 órdenes de 24 meses en Excel (fecha, placa, km, servicios, celular; exporta contabilidad). Falta la fecha de entrega y que el export incluya el valor de la orden.
- [ ] Tolerancia de «a tiempo» acordada con el dueño.
- [ ] Opción de asignación (A, B o C) aceptada por el dueño, y por qué.
- [ ] Mejora mínima que vale la pena detectar, fijada con la línea base.
- [x] Ventana: doce meses (ficha, bloque 10).
- [ ] Texto de autorización de datos y política de tratamiento publicada.
- [ ] Horarios de envío conformes a la Ley 2300 de 2023, verificados sobre el texto vigente.
- [ ] Categoría de plantilla en WhatsApp Business para cada tipo de aviso y costo por mensaje.
- [ ] Persona que hace el segundo etiquetado.
- [ ] Acuerdo escrito con el dueño sobre datos, propiedad y publicación.

## Referencias iniciales

Se amplían y verifican en la revisión de literatura. Las normas se citan por su número; el texto
vigente se confirma en la revisión.

- Brooke, J. (1996). SUS: A quick and dirty usability scale. En *Usability Evaluation in Industry*. Taylor & Francis.
- Campbell, D. T. y Stanley, J. C. (1963). *Experimental and Quasi-Experimental Designs for Research*. Rand McNally.
- Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. *MIS Quarterly, 13*(3), 319-340.
- Gurol-Urganci, I., de Jongh, T., Vodopivec-Jamsek, V., Atun, R. y Car, J. (2013). Mobile phone messaging reminders for attendance at healthcare appointments. *Cochrane Database of Systematic Reviews*, (12), CD007458.
- Hevner, A. R., March, S. T., Park, J. y Ram, S. (2004). Design science in information systems research. *MIS Quarterly, 28*(1), 75-105.
- Hussey, M. A. y Hughes, J. P. (2007). Design and analysis of stepped wedge cluster randomized trials. *Contemporary Clinical Trials, 28*(2), 182-191.
- Peffers, K., Tuunanen, T., Rothenberger, M. A. y Chatterjee, S. (2007). A design science research methodology for information systems research. *Journal of Management Information Systems, 24*(3), 45-77.
- Reichheld, F. F. (2003). The one number you need to grow. *Harvard Business Review, 81*(12), 46-54.
- Shadish, W. R., Cook, T. D. y Campbell, D. T. (2002). *Experimental and Quasi-Experimental Designs for Generalized Causal Inference*. Houghton Mifflin.
- Thaler, R. H. y Sunstein, C. R. (2008). *Nudge: Improving Decisions About Health, Wealth, and Happiness*. Yale University Press.
- Venkatesh, V., Morris, M. G., Davis, G. B. y Davis, F. D. (2003). User acceptance of information technology: Toward a unified view. *MIS Quarterly, 27*(3), 425-478.
- Congreso de Colombia. Ley 1581 de 2012, protección de datos personales. Decreto 1377 de 2013, reglamentario.
- Congreso de Colombia. Ley 2300 de 2023, medidas que protegen el derecho a la intimidad de los consumidores frente al contacto comercial y de cobranza.
- Congreso de Colombia. Ley 769 de 2002, Código Nacional de Tránsito Terrestre (SOAT y revisión técnico-mecánica).
- Alcaldía de Medellín, Secretaría de Movilidad. Decreto de pico y placa vigente para el semestre.
- Documentación previa del proyecto: [taller-conectado/docs](https://github.com/Analistadatositagui-design/taller-conectado/tree/main/docs), con las fuentes de mercado del benchmarking.

## Anexo A. Diccionario de datos del histórico de órdenes

Plantilla en `instrumentos/historico-ordenes.csv`. Una fila por orden. Sin nombre, cédula,
celular ni placa.

| Columna | Tipo | Descripción |
|---|---|---|
| `id_orden` | texto | Número de la orden o factura, tal como lo usa el taller |
| `fecha_orden` | fecha AAAA-MM-DD | Fecha de recepción del vehículo |
| `id_vehiculo` | texto | Seudónimo del vehículo; la correspondencia con la placa queda en el taller |
| `tipo_vehiculo` | carro, moto, camioneta, flota | Tipo |
| `marca` | texto | Marca |
| `modelo` | texto | Modelo |
| `anio_modelo` | entero | Año del modelo |
| `km_recepcion` | entero | Kilometraje leído al recibir; vacío si no se registró |
| `servicios` | texto | Servicios realizados, separados por punto y coma, con los nombres del catálogo cuando aplique |
| `valor_total` | entero, pesos | Valor total de la orden; si es posible, `valor_mano_obra` y `valor_repuestos` como columnas adicionales |
| `cita_previa` | si, no | Si el cliente llegó con cita |
| `aviso_previo` | ninguno, llamada, whatsapp, otro | Cómo se le avisó al cliente que le tocaba, si se hizo |
| `celular_registrado` | si, no | Si el taller tenía celular del dueño en ese momento |
| `fecha_soat_vence` | fecha | Si el taller la conocía |
| `fecha_rtm_vence` | fecha | Vencimiento de la revisión técnico-mecánica, si se conocía |
| `observaciones` | texto | Lo que el taller quiera anotar, sin datos personales |

## Anexo B. Bitácora de búsqueda

Plantilla en `instrumentos/bitacora-busqueda.csv`. Una fila por búsqueda: fecha, base de datos,
cadena exacta, filtros (años, idioma, tipo de documento), número de resultados, revisados por
título, revisados por resumen, seleccionados y notas. Los seleccionados pasan a la matriz de
evidencia de la revisión.

## Anexo C. Embudo de un aviso

Métricas de proceso que se registran por cada aviso en la tabla de eventos del sistema:

| Paso | Definición |
|---|---|
| Enviado | El motor generó el mensaje y lo entregó al proveedor de WhatsApp |
| Entregado | El proveedor confirmó entrega al teléfono |
| Leído | El proveedor confirmó lectura (cuando el cliente lo permite) |
| Respondido | El cliente escribió algo en las 72 horas siguientes |
| Cita creada | Se creó una cita para el servicio del aviso en los 7 días siguientes |
| Cita asistida | Se abrió una orden el día de la cita o hasta 3 días después |
| Orden cerrada | La orden se cerró con al menos el servicio del aviso |

Cada paso se reporta como proporción del anterior y del total enviado, por tipo de aviso y por
mes. Este embudo es lo que se revisa en el corte operativo de los tres meses.

## Registro de enmiendas

| Versión | Fecha | Cambio | Motivo |
|---|---|---|---|
| 0.1 | 2026-09-24 | Borrador inicial | Punto de partida para la revisión del equipo y la visita al taller |
| 0.2 | 2026-10-01 | Visita realizada: línea base estimada 15 %, ventana de doce meses, cronograma re-anclado con entrega de la Fase 1 el 2026-12-01, y alcance de la Fase 1 ampliado con el módulo de costos y rentabilidad (decisión del dueño). Con p1=15 % y mejora de 15 puntos: 121 vehículos por grupo | Levantamiento del 1 de octubre; instrucción del responsable |
