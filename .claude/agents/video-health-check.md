# Subagent: Video Team Health Check

Este agente ejecuta un chequeo completo de salud del sistema de producción de videos.

## Proyecto
- **Supabase ID:** jiorvtskypelmdpffddc
- **Repo:** BladexZN/dashboard-b

## Workflow Autónomo

Ejecuta las siguientes consultas en secuencia usando `mcp__supabase__execute_sql`:

### 1. Estado general del sistema
```sql
SELECT 
  COUNT(*) as total_solicitudes,
  COUNT(*) FILTER (WHERE is_deleted = false) as activas,
  COUNT(*) FILTER (WHERE is_deleted = true) as en_papelera
FROM solicitudes;
```

### 2. Solicitudes por estado actual
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

### 3. Carga por productor
```sql
SELECT 
  p.nombre as productor,
  p.board_number,
  COUNT(s.id) FILTER (WHERE es.estado IN ('Pendiente', 'En Producción', 'Corrección')) as carga_activa,
  COUNT(s.id) FILTER (WHERE es.estado = 'Listo') as listos_para_entregar
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
  p.nombre as productor,
  es.estado
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
  CASE s.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 END;
```

### 5. Solicitudes en corrección (problemas)
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  p.nombre as productor,
  es.timestamp as desde
FROM solicitudes s
JOIN LATERAL (
  SELECT estado, timestamp FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false AND es.estado = 'Corrección'
ORDER BY es.timestamp;
```

### 6. Solicitudes sin asignar a tablero
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
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
  AND es.estado NOT IN ('Entregado');
```

### 7. Notificaciones no leídas por usuario
```sql
SELECT 
  u.nombre,
  COUNT(*) as notificaciones_sin_leer
FROM notificaciones n
JOIN usuarios u ON u.id = n.user_id
WHERE n.is_read = false
GROUP BY u.id, u.nombre
HAVING COUNT(*) > 0
ORDER BY notificaciones_sin_leer DESC;
```

### 8. Revisar advisors de Supabase
Usa `mcp__supabase__get_advisors` con type "security" y "performance".

## Output Esperado

Generar un reporte estructurado:

```
## 📊 Health Check - Video Team DC

### Estado General
- Total solicitudes: X
- Activas: X | En papelera: X

### Por Estado
| Estado | Cantidad |
|--------|----------|
| Pendiente | X |
| En Producción | X |
| Corrección | X |
| Listo | X |
| Entregado | X |

### Carga por Productor
| Productor | Activos | Listos |
|-----------|---------|--------|
| Carlos | X | X |
| Moises | X | X |
| Angel | X | X |
| Giovany | X | X |

### ⚠️ Alertas
- Urgentes pendientes: X
- En corrección: X
- Sin asignar: X

### 🔔 Notificaciones Pendientes
- [Usuario]: X sin leer

### 🛡️ Advisors
- Security: [resumen]
- Performance: [resumen]
```
