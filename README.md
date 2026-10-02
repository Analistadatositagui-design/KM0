# KM0

Investigación y, más adelante, código del producto **Taller Conectado** para el taller Kilómetro 0
(Medellín).

El diseño del producto, la presentación y el benchmarking de mercado viven en
[taller-conectado](https://github.com/Analistadatositagui-design/taller-conectado). Este
repositorio recoge lo que sigue: la investigación con método científico sobre el producto a
construir, y después el producto.

## Estado

La visita al taller se hizo el 1 de octubre de 2026 y el levantamiento está en la ficha. La Fase 1
se entrega operando en el taller el **1 de diciembre de 2026**, con el módulo de costos y
rentabilidad incluido. El protocolo va en la versión 0.2; el plan de construcción está en
`producto/plan-fase-1.md` y el código del núcleo arrancó en `app/`.

## Contenido

| Ruta | Qué contiene |
|---|---|
| `producto/plan-fase-1.md` | Plan del proyecto final: alcance de la Fase 1 (diez módulos, costos y rentabilidad incluido), cronograma al 1 de diciembre de 2026, prerrequisitos y riesgos. |
| `app/` | Código de la Fase 1: API en TypeScript sobre Node, motor de condiciones, panel del taller y pruebas. `app/README.md` dice cómo correrlo. |
| `investigacion/protocolo.md` | Protocolo de investigación: problema, preguntas, hipótesis, diseño de evaluación, tamaño de muestra, instrumentos, revisión de literatura, ética, amenazas a la validez, cronograma y regla de decisión. |
| `investigacion/instrumentos/` | Plantilla para el histórico de órdenes, bitácora de búsqueda bibliográfica y guion de entrevista. |
| `investigacion/herramientas/` | Scripts de apoyo. `tamano_muestra.py` calcula el tamaño de muestra sin dependencias externas. |
| `investigacion/datos/` | Datos crudos, solo en local. Está ignorada por git: nunca se suben datos personales. |

## Cómo usar

Tabla de escenarios de tamaño de muestra:

```
python3 investigacion/herramientas/tamano_muestra.py
```

Un escenario concreto (retorno a tiempo de 60 % sin avisos frente a 75 % con avisos):

```
python3 investigacion/herramientas/tamano_muestra.py 0.60 0.75
```

## Qué sigue

1. Recibir el histórico de órdenes (con valor de la orden) y calcular la línea base real.
2. Revisión con el dueño en la quincena de octubre: propuesta escrita, piloto con nombres, intervalos del catálogo y opción de asignación; cerrar la sección 16 y congelar el protocolo como v1.0.
3. Construir la Fase 1 según `producto/plan-fase-1.md`, entrega el 1 de diciembre de 2026.
