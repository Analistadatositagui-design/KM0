-- Taller Conectado · Fase 1. SQL portable (SQLite hoy; tipos y claves pensados para PostgreSQL).
-- Toda tabla de negocio lleva taller_id: el multi-taller de la Fase 3 es configuración, no rediseño.

CREATE TABLE IF NOT EXISTS talleres (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  firma TEXT NOT NULL DEFAULT 'Kilómetro 0',
  tono TEXT NOT NULL DEFAULT 'usted' CHECK (tono IN ('tu','usted')),
  zona_horaria TEXT NOT NULL DEFAULT 'America/Bogota',
  ventana_desde TEXT NOT NULL DEFAULT '08:30',
  ventana_hasta TEXT NOT NULL DEFAULT '16:30',
  autorizacion_version TEXT NOT NULL DEFAULT 'v1-2026',
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL REFERENCES talleres(id),
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  clave_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('dueno','recepcion','mecanico')),
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  expira_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL REFERENCES talleres(id),
  nombre TEXT NOT NULL,
  celular TEXT,
  correo TEXT,
  -- Ley 1581: sin autorización registrada no sale ningún aviso.
  autorizacion_en TEXT,
  autorizacion_canal TEXT CHECK (autorizacion_canal IN ('orden','whatsapp','verbal_registrada') OR autorizacion_canal IS NULL),
  autorizacion_version TEXT,
  demo INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL REFERENCES talleres(id),
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  placa TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  tipo TEXT NOT NULL DEFAULT 'carro' CHECK (tipo IN ('carro','camioneta','moto','flota')),
  soat_vence TEXT,
  tecno_vence TEXT,
  demo INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL,
  UNIQUE (taller_id, placa)
);

CREATE TABLE IF NOT EXISTS lecturas_km (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL,
  vehiculo_id TEXT NOT NULL REFERENCES vehiculos(id),
  km INTEGER NOT NULL CHECK (km >= 0),
  fuente TEXT NOT NULL CHECK (fuente IN ('recepcion','cliente','cierre')),
  leida_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lecturas_veh ON lecturas_km (vehiculo_id, leida_en);

CREATE TABLE IF NOT EXISTS catalogo (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL REFERENCES talleres(id),
  nombre TEXT NOT NULL,
  intervalo_km INTEGER,
  intervalo_meses INTEGER,
  precio_ref INTEGER,
  activo INTEGER NOT NULL DEFAULT 1,
  posicion INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS citas (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL,
  vehiculo_id TEXT NOT NULL REFERENCES vehiculos(id),
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  motivo TEXT,
  aviso_id TEXT,
  estado TEXT NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada','asistida','no_asistio','cancelada')),
  creada_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ordenes (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL,
  vehiculo_id TEXT NOT NULL REFERENCES vehiculos(id),
  cita_id TEXT REFERENCES citas(id),
  consecutivo INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida','cotizada','aprobada','lista','cerrada')),
  km_recepcion INTEGER,
  mecanico_id TEXT REFERENCES usuarios(id),
  notas TEXT,
  total_cobrado INTEGER,
  creada_en TEXT NOT NULL,
  cerrada_en TEXT
);
CREATE INDEX IF NOT EXISTS ix_ordenes_estado ON ordenes (taller_id, estado);
CREATE INDEX IF NOT EXISTS ix_ordenes_veh ON ordenes (vehiculo_id, creada_en);

CREATE TABLE IF NOT EXISTS inspecciones (
  id TEXT PRIMARY KEY,
  orden_id TEXT NOT NULL REFERENCES ordenes(id),
  item TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('bien','atencion','urgente')),
  nota TEXT,
  foto TEXT,
  creada_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orden_items (
  id TEXT PRIMARY KEY,
  orden_id TEXT NOT NULL REFERENCES ordenes(id),
  catalogo_id TEXT REFERENCES catalogo(id),
  descripcion TEXT NOT NULL,
  precio INTEGER NOT NULL DEFAULT 0,
  inspeccion_id TEXT REFERENCES inspecciones(id),
  aprobado INTEGER,            -- NULL: sin responder; 1: aprobado; 0: rechazado
  aprobado_en TEXT,
  aprobado_via TEXT CHECK (aprobado_via IN ('whatsapp','presencial','telefono') OR aprobado_via IS NULL)
);

CREATE TABLE IF NOT EXISTS orden_repuestos (
  id TEXT PRIMARY KEY,
  orden_id TEXT NOT NULL REFERENCES ordenes(id),
  descripcion TEXT NOT NULL,
  cantidad REAL NOT NULL DEFAULT 1,
  costo_unitario INTEGER NOT NULL CHECK (costo_unitario >= 0),
  origen TEXT NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual','importado'))
);

CREATE TABLE IF NOT EXISTS orden_mano_obra (
  id TEXT PRIMARY KEY,
  orden_id TEXT NOT NULL REFERENCES ordenes(id),
  descripcion TEXT NOT NULL,
  valor INTEGER NOT NULL CHECK (valor >= 0)
);

-- Motor «si… entonces…»: una fila por regla, parámetros en JSON.
CREATE TABLE IF NOT EXISTS condiciones (
  taller_id TEXT NOT NULL REFERENCES talleres(id),
  clave TEXT NOT NULL CHECK (clave IN ('km','docs','pico','lectura','cierre','reactivar')),
  activa INTEGER NOT NULL DEFAULT 1,
  params TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (taller_id, clave)
);

CREATE TABLE IF NOT EXISTS avisos (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL,
  vehiculo_id TEXT NOT NULL REFERENCES vehiculos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('km','docs','pico','lectura','cierre','reactivar','cotizacion')),
  clave TEXT NOT NULL UNIQUE,  -- dedup: un aviso por hito
  mensaje TEXT NOT NULL,
  programado_para TEXT NOT NULL,
  fuera_de_ventana INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviado','entregado','respondido','cancelado')),
  creado_en TEXT NOT NULL,
  enviado_en TEXT,
  respondido_en TEXT
);
CREATE INDEX IF NOT EXISTS ix_avisos_estado ON avisos (taller_id, estado, programado_para);

-- Embudo del protocolo (anexo C): cada paso es un evento.
CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  taller_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('aviso_enviado','aviso_entregado','aviso_respondido','cita_creada','cita_asistida','orden_cerrada')),
  aviso_id TEXT,
  vehiculo_id TEXT,
  orden_id TEXT,
  cita_id TEXT,
  datos TEXT NOT NULL DEFAULT '{}',
  en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_eventos_tipo ON eventos (taller_id, tipo, en);

-- Pico y placa: tabla configurable por semestre, no lógica fija.
CREATE TABLE IF NOT EXISTS pico_placa (
  taller_id TEXT NOT NULL REFERENCES talleres(id),
  vigente_desde TEXT NOT NULL,
  vigente_hasta TEXT NOT NULL,
  digitos TEXT NOT NULL,   -- JSON {"1":[5,8],...} por día ISO (1=lunes … 5=viernes)
  festivos TEXT NOT NULL,  -- JSON ["2026-10-12", ...]
  PRIMARY KEY (taller_id, vigente_desde)
);
