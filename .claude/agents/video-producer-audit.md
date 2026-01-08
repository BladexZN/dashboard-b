# Subagent: Video Producer Audit

Este agente realiza una auditoría completa del rendimiento de un productor específico.

## Proyecto
- **Supabase ID:** jiorvtskypelmdpffddc
- **Repo:** BladexZN/dashboard-b

## Input Requerido
El usuario debe especificar el productor a auditar:
- **Carlos** (board_number = 1)
- **Moises** (board_number = 2)
- **Angel** (board_number = 3)
- **Giovany** (board_number = 4)

## Workflow Autónomo

Reemplaza `{BOARD}` con el número de tablero del productor.

### 1. Carga actual del productor
```sql
SELECT 
  p.nombre as productor,
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
WHERE p.board_number = {BOARD}
GROUP BY p.id, p.nombre;
```

### 2. Videos completados (últimos 30 días)
```sql
SELECT 
  COUNT(*) as total_entregados,
  COUNT(*) FILTER (WHERE s.video_type = 'Stock') as stock,
  COUNT(*) FILTER (WHERE s.video_type = 'Hibrido') as hibridos,
  COUNT(*) FILTER (WHERE s.video_type = 'Original') as originales,
  COUNT(*) FILTER (WHERE s.tipo = 'Video completo') as videos_completos,
  COUNT(*) FILTER (WHERE s.tipo = 'Agregado') as agregados,
  COUNT(*) FILTER (WHERE s.tipo = 'Variante') as variantes,
  COUNT(*) FILTER (WHERE s.tipo = 'Corrección') as correcciones_tipo
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id AND es.estado = 'Entregado'
WHERE s.board_number = {BOARD}
  AND s.is_deleted = false
  AND es.timestamp >= NOW() - INTERVAL '30 days';
```

### 3. Tiempo promedio de entrega
```sql
WITH tiempos AS (
  SELECT 
    s.id,
    s.folio,
    MIN(es.timestamp) FILTER (WHERE es.estado = 'En Producción') as inicio,
    MAX(es.timestamp) FILTER (WHERE es.estado = 'Entregado') as fin
  FROM solicitudes s
  JOIN estados_solicitud es ON es.solicitud_id = s.id
  WHERE s.board_number = {BOARD}
    AND s.is_deleted = false
  GROUP BY s.id, s.folio
  HAVING MAX(es.timestamp) FILTER (WHERE es.estado = 'Entregado') IS NOT NULL
)
SELECT 
  COUNT(*) as total_videos,
  ROUND(AVG(EXTRACT(EPOCH FROM (fin - inicio)) / 3600)::numeric, 1) as horas_promedio,
  ROUND(MIN(EXTRACT(EPOCH FROM (fin - inicio)) / 3600)::numeric, 1) as min_horas,
  ROUND(MAX(EXTRACT(EPOCH FROM (fin - inicio)) / 3600)::numeric, 1) as max_horas,
  COUNT(*) FILTER (WHERE fin - inicio < INTERVAL '24 hours') as rapidos,
  COUNT(*) FILTER (WHERE fin - inicio BETWEEN INTERVAL '24 hours' AND INTERVAL '7 days') as normales,
  COUNT(*) FILTER (WHERE fin - inicio > INTERVAL '7 days') as lentos
FROM tiempos;
```

### 4. Correcciones recibidas
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  COUNT(*) FILTER (WHERE es.estado = 'Corrección') as veces_en_correccion
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id
WHERE s.board_number = {BOARD}
  AND s.is_deleted = false
  AND es.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY s.id, s.folio, s.cliente, s.producto
HAVING COUNT(*) FILTER (WHERE es.estado = 'Corrección') > 0
ORDER BY veces_en_correccion DESC
LIMIT 10;
```

### 5. Solicitudes actuales detalladas
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.tipo,
  s.video_type,
  s.prioridad,
  es.estado,
  s.fecha_creacion,
  EXTRACT(DAY FROM NOW() - s.fecha_creacion) as dias_antiguedad
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
WHERE s.board_number = {BOARD}
  AND s.is_deleted = false
  AND es.estado NOT IN ('Entregado')
ORDER BY 
  CASE s.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END,
  s.fecha_creacion;
```

### 6. Tendencia semanal
```sql
SELECT 
  DATE_TRUNC('week', es.timestamp)::date as semana,
  COUNT(*) as videos_entregados
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id AND es.estado = 'Entregado'
WHERE s.board_number = {BOARD}
  AND s.is_deleted = false
  AND es.timestamp >= NOW() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', es.timestamp)
ORDER BY semana DESC;
```

## Output Esperado

```markdown
## 👤 Auditoría de Productor: [NOMBRE]
**Período:** Últimos 30 días

### 📊 Carga Actual
| Estado | Cantidad |
|--------|----------|
| Pendientes | X |
| En Producción | X |
| Correcciones | X |
| Listos | X |
| **Total Activos** | **X** |

### 🏆 Productividad (30 días)
- **Total entregados:** X videos
- Por tipo de video: Stock (X), Híbrido (X), Original (X)
- Por tipo de solicitud: Completos (X), Agregados (X), Variantes (X)

### ⏱️ Tiempos de Entrega
| Métrica | Valor |
|---------|-------|
| Promedio | X horas |
| Mínimo | X horas |
| Máximo | X horas |
| Rápidos (<24h) | X |
| Normales (1-7d) | X |
| Lentos (>7d) | X |

### ⚠️ Correcciones Recibidas
| Folio | Cliente | Veces |
|-------|---------|-------|
| X | X | X |

### 📈 Tendencia Semanal
| Semana | Entregados |
|--------|------------|
| [fecha] | X |

### 📝 Solicitudes Activas
[Lista detallada con prioridad y antigüedad]
```
