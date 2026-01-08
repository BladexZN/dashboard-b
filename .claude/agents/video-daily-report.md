# Subagent: Video Daily Report

Este agente genera un reporte diario ejecutivo del sistema de producción.

## Proyecto
- **Supabase ID:** jiorvtskypelmdpffddc
- **Repo:** BladexZN/dashboard-b

## Workflow Autónomo

Ejecuta las siguientes consultas usando `mcp__supabase__execute_sql`:

### 1. Resumen del día
```sql
SELECT 
  COUNT(*) FILTER (WHERE DATE(s.fecha_creacion) = CURRENT_DATE) as creadas_hoy,
  COUNT(*) FILTER (WHERE DATE(es_entregado.timestamp) = CURRENT_DATE) as entregadas_hoy,
  COUNT(*) FILTER (WHERE es_actual.estado IN ('Pendiente', 'En Producción', 'Corrección')) as backlog_actual
FROM solicitudes s
LEFT JOIN LATERAL (
  SELECT timestamp FROM estados_solicitud 
  WHERE solicitud_id = s.id AND estado = 'Entregado'
  ORDER BY timestamp DESC LIMIT 1
) es_entregado ON true
LEFT JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es_actual ON true
WHERE s.is_deleted = false;
```

### 2. Productividad por productor hoy
```sql
SELECT 
  p.nombre as productor,
  COUNT(DISTINCT s.id) FILTER (WHERE DATE(es.timestamp) = CURRENT_DATE AND es.estado = 'Entregado') as entregados_hoy,
  COUNT(DISTINCT s.id) FILTER (WHERE DATE(es.timestamp) = CURRENT_DATE AND es.estado = 'Listo') as completados_hoy,
  COUNT(DISTINCT s.id) FILTER (WHERE es_actual.estado IN ('Pendiente', 'En Producción', 'Corrección')) as pendientes
FROM productores p
LEFT JOIN solicitudes s ON s.board_number = p.board_number AND s.is_deleted = false
LEFT JOIN estados_solicitud es ON es.solicitud_id = s.id
LEFT JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es_actual ON true
GROUP BY p.id, p.nombre, p.board_number
ORDER BY p.board_number;
```

### 3. Cambios de estado hoy
```sql
SELECT 
  es.estado,
  COUNT(*) as transiciones
FROM estados_solicitud es
WHERE DATE(es.timestamp) = CURRENT_DATE
GROUP BY es.estado
ORDER BY transiciones DESC;
```

### 4. Detalle de entregas de hoy
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  s.video_type,
  p.nombre as productor,
  es.timestamp as hora_entrega
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id AND es.estado = 'Entregado'
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE DATE(es.timestamp) = CURRENT_DATE
  AND s.is_deleted = false
ORDER BY es.timestamp DESC;
```

### 5. Nuevas solicitudes de hoy
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  s.prioridad,
  u.nombre as asesor,
  p.nombre as productor_asignado
FROM solicitudes s
LEFT JOIN usuarios u ON u.id = s.asesor_id
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE DATE(s.fecha_creacion) = CURRENT_DATE
  AND s.is_deleted = false
ORDER BY s.fecha_creacion DESC;
```

### 6. Comparativa con ayer
```sql
SELECT 
  'Ayer' as periodo,
  COUNT(*) FILTER (WHERE DATE(s.fecha_creacion) = CURRENT_DATE - 1) as creadas,
  COUNT(*) FILTER (WHERE DATE(es.timestamp) = CURRENT_DATE - 1 AND es.estado = 'Entregado') as entregadas
FROM solicitudes s
LEFT JOIN estados_solicitud es ON es.solicitud_id = s.id
WHERE s.is_deleted = false
UNION ALL
SELECT 
  'Hoy' as periodo,
  COUNT(*) FILTER (WHERE DATE(s.fecha_creacion) = CURRENT_DATE) as creadas,
  COUNT(*) FILTER (WHERE DATE(es.timestamp) = CURRENT_DATE AND es.estado = 'Entregado') as entregadas
FROM solicitudes s
LEFT JOIN estados_solicitud es ON es.solicitud_id = s.id
WHERE s.is_deleted = false;
```

## Output Esperado

```markdown
## 📅 Reporte Diario - Video Team DC
**Fecha:** [FECHA]

### 📊 Resumen del Día
| Métrica | Hoy | Ayer |
|---------|-----|------|
| Creadas | X | X |
| Entregadas | X | X |
| Backlog actual | X | - |

### 🏆 Productividad por Productor
| Productor | Entregados | Completados | Pendientes |
|-----------|------------|-------------|------------|
| Carlos | X | X | X |
| Moises | X | X | X |
| Angel | X | X | X |
| Giovany | X | X | X |

### ✅ Entregas de Hoy
1. [Folio] - [Cliente] - [Producto] - [Productor]
...

### 🆕 Nuevas Solicitudes
1. [Folio] - [Cliente] - [Prioridad] - Asignado a: [Productor]
...

### 📊 Flujo del Día
| Estado | Transiciones |
|--------|--------------|
| Pendiente | X |
| En Producción | X |
| ... | ... |
```
