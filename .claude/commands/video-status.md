# Video Team DC - Estado del Sistema

Este skill genera un resumen ejecutivo del estado de producción de videos.

## Proyecto Supabase
- **Nombre:** Video Team - DC
- **ID:** jiorvtskypelmdpffddc

## Consultas SQL para ejecutar:

### 1. Resumen general de solicitudes
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_deleted = false) as activas,
  COUNT(*) FILTER (WHERE is_deleted = true) as en_papelera
FROM solicitudes;
```

### 2. Solicitudes por estado (activas)
```sql
SELECT 
  es.estado,
  COUNT(DISTINCT s.id) as cantidad
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.is_deleted = false
GROUP BY es.estado
ORDER BY 
  CASE es.estado
    WHEN 'Pendiente' THEN 1
    WHEN 'En Producción' THEN 2
    WHEN 'Corrección' THEN 3
    WHEN 'Listo' THEN 4
    WHEN 'Entregado' THEN 5
  END;
```

### 3. Carga por productor (board)
```sql
SELECT 
  p.nombre as productor,
  p.board_number,
  COUNT(s.id) FILTER (WHERE es.estado IN ('Pendiente', 'En Producción', 'Corrección')) as pendientes,
  COUNT(s.id) FILTER (WHERE es.estado = 'Listo') as listos
FROM productores p
LEFT JOIN solicitudes s ON s.board_number = p.board_number AND s.is_deleted = false
LEFT JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
GROUP BY p.id, p.nombre, p.board_number
ORDER BY p.board_number;
```

### 4. Solicitudes urgentes/alta prioridad pendientes
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.prioridad,
  p.nombre as productor
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false 
  AND s.prioridad IN ('Urgente', 'Alta')
  AND es.estado NOT IN ('Entregado')
ORDER BY 
  CASE s.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 END,
  s.fecha_creacion;
```

## Instrucciones
Ejecuta estas consultas usando `mcp__supabase__execute_sql` con project_id `jiorvtskypelmdpffddc` y presenta un resumen ejecutivo.
