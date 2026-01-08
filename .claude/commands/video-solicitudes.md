# Video Team DC - Consultas de Solicitudes

Este skill contiene consultas frecuentes para solicitudes de video.

## Proyecto Supabase
- **ID:** jiorvtskypelmdpffddc

## Consultas disponibles:

### Solicitudes pendientes por tablero
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  s.prioridad,
  s.video_type,
  p.nombre as productor,
  es.estado,
  s.fecha_creacion
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false 
  AND es.estado IN ('Pendiente', 'En Producción', 'Corrección')
ORDER BY s.board_number, s.fecha_creacion;
```

### Solicitudes en corrección
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  p.nombre as productor,
  es.timestamp as fecha_correccion
FROM solicitudes s
JOIN LATERAL (
  SELECT estado, timestamp FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false AND es.estado = 'Corrección'
ORDER BY es.timestamp DESC;
```

### Solicitudes listas para entregar
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  u.nombre as asesor,
  p.nombre as productor,
  s.completed_at
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN usuarios u ON u.id = s.asesor_id
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false AND es.estado = 'Listo'
ORDER BY s.completed_at DESC;
```

### Solicitudes entregadas hoy
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  p.nombre as productor
FROM solicitudes s
JOIN LATERAL (
  SELECT estado, timestamp FROM estados_solicitud 
  WHERE solicitud_id = s.id AND estado = 'Entregado'
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false 
  AND DATE(es.timestamp) = CURRENT_DATE
ORDER BY es.timestamp DESC;
```

### Buscar solicitud por folio
```sql
-- Reemplaza {FOLIO} con el folio a buscar
SELECT 
  s.*,
  u.nombre as asesor_nombre,
  p.nombre as productor_nombre,
  es.estado as estado_actual
FROM solicitudes s
LEFT JOIN usuarios u ON u.id = s.asesor_id
LEFT JOIN productores p ON p.board_number = s.board_number
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.folio = '{FOLIO}';
```

### Solicitudes por cliente
```sql
-- Reemplaza {CLIENTE} con el nombre del cliente (puede ser parcial con ILIKE)
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  es.estado,
  s.fecha_creacion
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.cliente ILIKE '%{CLIENTE}%'
  AND s.is_deleted = false
ORDER BY s.fecha_creacion DESC;
```

### Papelera (eliminados)
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.deleted_at,
  u.nombre as eliminado_por
FROM solicitudes s
LEFT JOIN usuarios u ON u.id::text = s.deleted_by::text
WHERE s.is_deleted = true
ORDER BY s.deleted_at DESC
LIMIT 50;
```

## Tipos de solicitud
- Video completo
- Agregado
- Variante
- Corrección

## Tipos de video
- Stock
- Híbrido
- Original
