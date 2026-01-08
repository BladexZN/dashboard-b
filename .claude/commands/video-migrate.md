# Video Team DC - Helper de Migraciones

Este skill ayuda a crear migraciones SQL seguras para el proyecto Video Team DC.

## Proyecto Supabase
- **ID:** jiorvtskypelmdpffddc

## Estructura de tablas actual

### solicitudes
```sql
-- Tabla principal de solicitudes de video
CREATE TABLE solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT UNIQUE,
  cliente TEXT NOT NULL,
  producto TEXT NOT NULL,
  asesor_id UUID REFERENCES usuarios(id),
  tipo tipo_solicitud NOT NULL, -- 'Video completo', 'Agregado', 'Variante', 'Corrección'
  prioridad prioridad_solicitud, -- 'Baja', 'Media', 'Alta', 'Urgente'
  descripcion TEXT,
  fecha_creacion TIMESTAMPTZ DEFAULT now(),
  escaleta_video TEXT,
  material_descargable JSONB DEFAULT '[]',
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES usuarios(id),
  video_type TEXT CHECK (video_type IN ('Stock', 'Hibrido', 'Original')),
  board_number INTEGER DEFAULT 1 CHECK (board_number >= 1 AND board_number <= 4),
  completed_at TIMESTAMPTZ,
  logos JSONB DEFAULT '[]',
  created_by_user_id UUID
);
```

### estados_solicitud
```sql
-- Historial de estados de cada solicitud
CREATE TABLE estados_solicitud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES solicitudes(id),
  estado estado_solicitud NOT NULL, -- 'Pendiente', 'En Producción', 'Listo', 'Entregado', 'Corrección'
  usuario_id UUID REFERENCES usuarios(id),
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

### usuarios
```sql
-- Usuarios del sistema
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol rol_usuario DEFAULT 'Productor', -- 'Admin', 'Asesor de Marketing', 'Productor', 'Dirección'
  estado estado_usuario DEFAULT 'Activo', -- 'Activo', 'Inactivo'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### productores
```sql
-- Los 4 productores (tableros)
CREATE TABLE productores (
  id SERIAL PRIMARY KEY,
  board_number INTEGER UNIQUE CHECK (board_number >= 1 AND board_number <= 4),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Datos: Carlos(1), Moises(2), Angel(3), Giovany(4)
```

## Checklist de migración

1. [ ] Verificar que la columna/tabla no existe
2. [ ] Usar IF NOT EXISTS donde sea posible
3. [ ] Agregar RLS si es tabla nueva
4. [ ] Considerar índices para campos de búsqueda frecuente
5. [ ] Probar en desarrollo antes de producción
6. [ ] Documentar el cambio

## Ejemplo de migración segura

```sql
-- Nombre: add_notes_to_solicitudes
-- Descripción: Agrega campo de notas internas a solicitudes

-- 1. Agregar columna
ALTER TABLE solicitudes 
ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- 2. Agregar índice si es necesario
CREATE INDEX IF NOT EXISTS idx_solicitudes_notas 
ON solicitudes USING gin(to_tsvector('spanish', notas_internas))
WHERE notas_internas IS NOT NULL;

-- 3. Comentario para documentación
COMMENT ON COLUMN solicitudes.notas_internas IS 'Notas internas del equipo de producción';
```

## Enums definidos

```sql
-- tipo_solicitud: 'Video completo', 'Agregado', 'Variante', 'Corrección'
-- prioridad_solicitud: 'Baja', 'Media', 'Alta', 'Urgente'
-- estado_solicitud: 'Pendiente', 'En Producción', 'Listo', 'Entregado', 'Corrección'
-- rol_usuario: 'Admin', 'Asesor de Marketing', 'Productor', 'Dirección'
-- estado_usuario: 'Activo', 'Inactivo'
-- tipo_archivo: 'brief', 'referencia', 'entregable'
-- canal_notificacion: 'in_app', 'email', 'whatsapp'
-- status_notificacion: 'queued', 'sent', 'failed'
```

## Usar mcp__supabase__apply_migration
```
project_id: jiorvtskypelmdpffddc
name: nombre_en_snake_case
query: <SQL>
```
