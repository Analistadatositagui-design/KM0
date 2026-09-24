# KM0

Investigación y, más adelante, código del producto **Taller Conectado** para el taller Kilómetro 0
(Medellín).

El diseño del producto, la presentación y el benchmarking de mercado viven en
[taller-conectado](https://github.com/Analistadatositagui-design/taller-conectado). Este
repositorio recoge lo que sigue: la investigación con método científico sobre el producto a
construir, y después el producto.

## Estado

Fase de investigación. No hay código del producto todavía. El protocolo está en borrador
(versión 0.1) a la espera de la visita al taller, que aporta la línea base.

## Contenido

| Ruta | Qué contiene |
|---|---|
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

1. Agendar la visita al taller y llenar la ficha de levantamiento.
2. Exportar el histórico de órdenes con la plantilla de `investigacion/instrumentos/` y calcular la línea base.
3. Cerrar las preguntas abiertas de la sección 16 del protocolo y congelarlo como versión 1.0 con el tag `protocolo-v1.0`.
