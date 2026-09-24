# Datos

Aquí se trabajan en local los datos crudos del estudio: el histórico de órdenes exportado
del taller, los registros de eventos del sistema y las respuestas de encuestas.

**Nada de esta carpeta se sube al repositorio.** Está ignorada en `.gitignore` salvo este
archivo. Los archivos que sí se versionan son los scripts de análisis y los resultados
agregados, sin identificar a ninguna persona.

Reglas:

1. Los archivos de análisis usan un identificador seudónimo por vehículo (`id_vehiculo`).
   La tabla que relaciona el identificador con la placa la guarda el taller, fuera de este
   repositorio.
2. Nombre, cédula, celular y placa no entran en ningún archivo de análisis.
3. Las copias de respaldo van en la unidad del taller, con acceso restringido.
