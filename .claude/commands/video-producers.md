# Video Team DC - Productores

Este skill contiene consultas para analizar carga y rendimiento de productores.

## Proyecto Supabase
- **ID:** jiorvtskypelmdpffddc

## Productores (4 tableros)
| Board | Nombre |
|-------|--------|
| 1 | Carlos |
| 2 | Moises |
| 3 | Angel |
| 4 | Giovany |

## Consultas disponibles:

### Carga actual por productor
```sql
SELECT 
  p.nombre as productor,
  p.board_number,
  COUNT(s.id) FILTER (WHERE es.estado = 'Pendiente') as pendientes,
  COUNT(s.id) FILTER (WHERE es.estado = 'En Producción') as en_produccion,
  COUNT(s.id) FILTER (WHERE es.estado = 'Corrección') as correcciones,
  COUNT(s.id) FILTER (WHERE es.estado = 'Listo') as listos,
  COUNT(s.id) FILTER (WHERE es.estado NOT IN ('Entregado')) as total_activos
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

### Videos completados por productor (último mes)
```sql
SELECT 
  p.nombre as productor,
  COUNT(*) as videos_completados,
  COUNT(*) FILTER (WHERE s.video_type = 'Stock') as stock,
  COUNT(*) FILTER (WHERE s.video_type = 'Hibrido') as hibridos,
  COUNT(*) FILTER (WHERE s.video_type = 'Original') as originales
FROM productores p
JOIN solicitudes s ON s.board_number = p.board_number AND s.is_deleted = false
JOIN estados_solicitud es ON es.solicitud_id = s.id AND es.estado = 'Entregado'
WHERE es.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.nombre
ORDER BY videos_completados DESC;
```

### Tiempo promedio de entrega por productor
```sql
WITH tiempos AS (
  SELECT 
    s.board_number,
    s.id,
    MIN(es.timestamp) FILTER (WHERE es.estado = 'En Producción') as inicio,
    MAX(es.timestamp) FILTER (WHERE es.estado = 'Entregado') as fin
  FROM solicitudes s
  JOIN estados_solicitud es ON es.solicitud_id = s.id
  WHERE s.is_deleted = false
    AND s.board_number IS NOT NULL
  GROUP BY s.id, s.board_number
  HAVING MAX(es.timestamp) FILTER (WHERE es.estado = 'Entregado') IS NOT NULL
)
SELECT 
  p.nombre as productor,
  COUNT(*) as videos,
  ROUND(AVG(EXTRACT(EPOCH FROM (t.fin - t.inicio)) / 3600)::numeric, 1) as horas_promedio,
  COUNT(*) FILTER (WHERE t.fin - t.inicio < INTERVAL '24 hours') as rapidos,
  COUNT(*) FILTER (WHERE t.fin - t.inicio BETWEEN INTERVAL '24 hours' AND INTERVAL '7 days') as normales,
  COUNT(*) FILTER (WHERE t.fin - t.inicio > INTERVAL '7 days') as lentos
FROM productores p
JOIN tiempos t ON t.board_number = p.board_number
GROUP BY p.id, p.nombre
ORDER BY horas_promedio;
```

### Detalle de solicitudes por productor específico
```sql
-- Reemplaza {BOARD_NUMBER} con 1, 2, 3 o 4
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  s.video_type,
  s.prioridad,
  es.estado,
  s.fecha_creacion
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.board_number = {BOARD_NUMBER}
  AND s.is_deleted = false
  AND es.estado NOT IN ('Entregado')
ORDER BY 
  CASE s.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END,
  s.fecha_creacion;
```

### Solicitudes sin asignar a tablero
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  s.prioridad,
  es.estado,
  s.fecha_creacion
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE (s.board_number IS NULL OR s.board_number = 0)
  AND s.is_deleted = false
  AND es.estado NOT IN ('Entregado')
ORDER BY s.fecha_creacion;
```

## Métricas de velocidad
- **Rápidos:** < 24 horas
- **Normal:** 1-7 días
- **Lentos:** > 7 días
