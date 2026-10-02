#!/usr/bin/env python3
"""Tamaño de muestra para comparar dos proporciones.

Sirve para la hipótesis principal del protocolo: la proporción de vehículos
que vuelven a tiempo con avisos (p2) frente a la proporción sin avisos (p1).

Uso:
  python3 tamano_muestra.py                    # tabla de escenarios
  python3 tamano_muestra.py 0.60 0.75          # n por grupo para p1=0.60 y p2=0.75
  python3 tamano_muestra.py 0.60 0.75 --alfa 0.05 --potencia 0.90

Fórmula clásica para dos proporciones independientes (prueba z bilateral),
sin corrección de continuidad. Es una primera aproximación: el análisis
definitivo se hace con el software estadístico del proyecto. No usa
dependencias externas.
"""
import argparse
import math
from statistics import NormalDist


def n_por_grupo(p1: float, p2: float, alfa: float = 0.05, potencia: float = 0.80) -> int:
    """Vehículos necesarios en cada grupo para detectar p2 frente a p1."""
    if not (0 < p1 < 1 and 0 < p2 < 1):
        raise ValueError("p1 y p2 deben estar entre 0 y 1 (por ejemplo 0.60)")
    if p1 == p2:
        raise ValueError("p1 y p2 deben ser distintas")
    nd = NormalDist()
    z_alfa = nd.inv_cdf(1 - alfa / 2)
    z_beta = nd.inv_cdf(potencia)
    p_medio = (p1 + p2) / 2
    numerador = (
        z_alfa * math.sqrt(2 * p_medio * (1 - p_medio))
        + z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
    ) ** 2
    return math.ceil(numerador / (p2 - p1) ** 2)


def tabla(alfa: float, potencia: float) -> str:
    lineas_base = [0.50, 0.60, 0.70]
    deltas = [0.10, 0.15, 0.20]
    filas = ["| Línea base (p1) | Mejora (puntos) | p2 | n por grupo | n total |", "|---:|---:|---:|---:|---:|"]
    for p1 in lineas_base:
        for d in deltas:
            p2 = p1 + d
            if p2 >= 0.95:
                continue
            n = n_por_grupo(p1, p2, alfa, potencia)
            filas.append(f"| {p1:.0%} | +{d * 100:.0f} | {p2:.0%} | {n} | {2 * n} |")
    return "\n".join(filas)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("p1", nargs="?", type=float, help="proporción sin avisos, por ejemplo 0.60")
    ap.add_argument("p2", nargs="?", type=float, help="proporción esperada con avisos, por ejemplo 0.75")
    ap.add_argument("--alfa", type=float, default=0.05, help="nivel de significancia bilateral (0.05)")
    ap.add_argument("--potencia", type=float, default=0.80, help="potencia estadística (0.80)")
    a = ap.parse_args()
    if a.p1 is not None and a.p2 is not None:
        n = n_por_grupo(a.p1, a.p2, a.alfa, a.potencia)
        print(f"p1={a.p1:.0%}  p2={a.p2:.0%}  alfa={a.alfa}  potencia={a.potencia}")
        print(f"n por grupo = {n}   n total = {2 * n}")
    else:
        print(f"Escenarios con alfa={a.alfa} (bilateral) y potencia={a.potencia}\n")
        print(tabla(a.alfa, a.potencia))


if __name__ == "__main__":
    main()
