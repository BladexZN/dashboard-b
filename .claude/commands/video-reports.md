# Video Team DC - Reportes y Analytics

Este skill contiene consultas para reportes y analytics de producción.

## Proyecto Supabase
- **ID:** jiorvtskypelmdpffddc

## Consultas disponibles:

### Videos entregados por período
```sql
-- Últimos 30 días
SELECT 
  DATE(es.timestamp) as fecha,
  COUNT(*) as videos_entregados
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id AND es.estado = 'Entregado'
WHERE s.is_deleted = false
  AND es.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(es.timestamp)
ORDER BY fecha DESC;
```

### Distribución por tipo de video
```sql
SELECT 
  COALESCE(s.video_type, 'Sin especificar') as tipo_video,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as porcentaje
FROM solicitudes s
WHERE s.is_deleted = false
GROUP BY s.video_type
ORDER BY cantidad DESC;
```

### Distribución por tipo de solicitud
```sql
SELECT 
  s.tipo,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as porcentaje
FROM solicitudes s
WHERE s.is_deleted = false
GROUP BY s.tipo
ORDER BY cantidad DESC;
```

### Top clientes por volumen
```sql
SELECT 
  s.cliente,
  COUNT(*) as total_solicitudes,
  COUNT(*) FILTER (WHERE es.estado = 'Entregado') as entregados,
  COUNT(*) FILTER (WHERE es.estado NOT IN ('Entregado')) as en_proceso
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.is_deleted = false
GROUP BY s.cliente
ORDER BY total_solicitudes DESC
LIMIT 10;
```

### Tendencia semanal
```sql
SELECT 
  DATE_TRUNC('week', s.fecha_creacion) as semana,
  COUNT(*) as solicitudes_creadas,
  COUNT(*) FILTER (WHERE es.estado = 'Entregado') as entregadas
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.is_deleted = false
  AND s.fecha_creacion >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', s.fecha_creacion)
ORDER BY semana DESC;
```

### Solicitudes por asesor
```sql
SELECT 
  u.nombre as asesor,
  COUNT(*) as total_solicitudes,
  COUNT(*) FILTER (WHERE es.estado = 'Entregado') as entregados,
  COUNT(*) FILTER (WHERE es.estado = 'Corrección') as en_correccion
FROM solicitudes s
JOIN usuarios u ON u.id = s.asesor_id
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.is_deleted = false
GROUP BY u.id, u.nombre
ORDER BY total_solicitudes DESC;
```

### Tiempo promedio por estado
```sql
WITH transiciones AS (
  SELECT 
    es1.solicitud_id,
    es1.estado as estado_desde,
    es2.estado as estado_hasta,
    es2.timestamp - es1.timestamp as duracion
  FROM estados_solicitud es1
  JOIN estados_solicitud es2 ON es1.solicitud_id = es2.solicitud_id 
    AND es2.timestamp > es1.timestamp
  JOIN solicitudes s ON s.id = es1.solicitud_id AND s.is_deleted = false
  WHERE NOT EXISTS (
    SELECT 1 FROM estados_solicitud es3 
    WHERE es3.solicitud_id = es1.solicitud_id 
      AND es3.timestamp > es1.timestamp 
      AND es3.timestamp < es2.timestamp
  )
)
SELECT 
  estado_desde,
  estado_hasta,
  COUNT(*) as transiciones,
  ROUND(AVG(EXTRACT(EPOCH FROM duracion) / 3600)::numeric, 1) as horas_promedio
FROM transiciones
GROUP BY estado_desde, estado_hasta
ORDER BY estado_desde, estado_hasta;
```

### Correcciones por cliente (problemas recurrentes)
```sql
SELECT 
  s.cliente,
  COUNT(*) FILTER (WHERE es.estado = 'Corrección') as correcciones,
  COUNT(DISTINCT s.id) as total_solicitudes,
  ROUND(COUNT(*) FILTER (WHERE es.estado = 'Corrección')::numeric / COUNT(DISTINCT s.id), 2) as ratio_correccion
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id
WHERE s.is_deleted = false
GROUP BY s.cliente
HAVING COUNT(*) FILTER (WHERE es.estado = 'Corrección') > 0
ORDER BY correcciones DESC
LIMIT 10;
```
