# Subagent: Video Bottleneck Finder

Este agente identifica cuellos de botella en el proceso de producción de videos.

## Proyecto
- **Supabase ID:** jiorvtskypelmdpffddc
- **Repo:** BladexZN/dashboard-b

## Workflow Autónomo

### 1. Solicitudes estancadas (más de 3 días sin cambio)
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.prioridad,
  p.nombre as productor,
  es.estado,
  es.timestamp as ultimo_cambio,
  NOW() - es.timestamp as tiempo_estancado
FROM solicitudes s
JOIN LATERAL (
  SELECT estado, timestamp FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false
  AND es.estado NOT IN ('Entregado')
  AND es.timestamp < NOW() - INTERVAL '3 days'
ORDER BY es.timestamp ASC;
```

### 2. Productor con más carga
```sql
SELECT 
  p.nombre as productor,
  COUNT(s.id) FILTER (WHERE es.estado NOT IN ('Entregado')) as carga_total,
  COUNT(s.id) FILTER (WHERE es.estado = 'Pendiente') as pendientes,
  COUNT(s.id) FILTER (WHERE es.estado = 'En Producción') as en_produccion,
  COUNT(s.id) FILTER (WHERE es.estado = 'Corrección') as correcciones
FROM productores p
LEFT JOIN solicitudes s ON s.board_number = p.board_number AND s.is_deleted = false
LEFT JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
GROUP BY p.id, p.nombre, p.board_number
ORDER BY carga_total DESC;
```

### 3. Clientes con más correcciones (problemas de comunicación)
```sql
SELECT 
  s.cliente,
  COUNT(DISTINCT s.id) as total_solicitudes,
  COUNT(*) FILTER (WHERE es.estado = 'Corrección') as total_correcciones,
  ROUND(COUNT(*) FILTER (WHERE es.estado = 'Corrección')::numeric / 
        NULLIF(COUNT(DISTINCT s.id), 0), 2) as ratio_correccion
FROM solicitudes s
JOIN estados_solicitud es ON es.solicitud_id = s.id
WHERE s.is_deleted = false
  AND s.fecha_creacion >= NOW() - INTERVAL '60 days'
GROUP BY s.cliente
HAVING COUNT(*) FILTER (WHERE es.estado = 'Corrección') > 0
ORDER BY ratio_correccion DESC
LIMIT 10;
```

### 4. Tiempo promedio por estado (identificar cuellos de botella)
```sql
WITH transiciones AS (
  SELECT 
    es1.solicitud_id,
    es1.estado as estado_desde,
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
  AND es1.timestamp >= NOW() - INTERVAL '30 days'
)
SELECT 
  estado_desde as estado,
  COUNT(*) as transiciones,
  ROUND(AVG(EXTRACT(EPOCH FROM duracion) / 3600)::numeric, 1) as horas_promedio,
  ROUND(MAX(EXTRACT(EPOCH FROM duracion) / 3600)::numeric, 1) as horas_max
FROM transiciones
GROUP BY estado_desde
ORDER BY horas_promedio DESC;
```

### 5. Solicitudes urgentes/altas sin atender
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  s.prioridad,
  p.nombre as productor,
  es.estado,
  s.fecha_creacion,
  NOW() - s.fecha_creacion as tiempo_espera
FROM solicitudes s
JOIN LATERAL (
  SELECT estado FROM estados_solicitud 
  WHERE solicitud_id = s.id 
  ORDER BY timestamp DESC LIMIT 1
) es ON true
LEFT JOIN productores p ON p.board_number = s.board_number
WHERE s.is_deleted = false
  AND s.prioridad IN ('Urgente', 'Alta')
  AND es.estado = 'Pendiente'
ORDER BY 
  CASE s.prioridad WHEN 'Urgente' THEN 1 ELSE 2 END,
  s.fecha_creacion;
```

### 6. Desbalance de carga entre productores
```sql
WITH carga AS (
  SELECT 
    p.board_number,
    p.nombre,
    COUNT(s.id) FILTER (WHERE es.estado NOT IN ('Entregado')) as activos
  FROM productores p
  LEFT JOIN solicitudes s ON s.board_number = p.board_number AND s.is_deleted = false
  LEFT JOIN LATERAL (
    SELECT estado FROM estados_solicitud 
    WHERE solicitud_id = s.id 
    ORDER BY timestamp DESC LIMIT 1
  ) es ON true
  GROUP BY p.board_number, p.nombre
)
SELECT 
  nombre,
  activos,
  ROUND(activos * 100.0 / NULLIF(SUM(activos) OVER(), 0), 1) as porcentaje_carga,
  activos - AVG(activos) OVER() as diferencia_promedio
FROM carga
ORDER BY activos DESC;
```

### 7. Días de la semana más lentos
```sql
SELECT 
  TO_CHAR(es.timestamp, 'Day') as dia_semana,
  EXTRACT(DOW FROM es.timestamp) as dia_num,
  COUNT(*) FILTER (WHERE es.estado = 'Entregado') as entregas
FROM estados_solicitud es
WHERE es.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY TO_CHAR(es.timestamp, 'Day'), EXTRACT(DOW FROM es.timestamp)
ORDER BY dia_num;
```

## Output Esperado

```markdown
## 🚨 Análisis de Cuellos de Botella - Video Team DC

### ⚠️ Solicitudes Estancadas (>3 días)
| Folio | Cliente | Estado | Productor | Días |
|-------|---------|--------|-----------|------|
| X | X | X | X | X |

**Total estancadas:** X solicitudes

### 📊 Carga por Productor
| Productor | Activos | Pendientes | Producción | Corrección | % Carga |
|-----------|---------|------------|------------|------------|----------|
| X | X | X | X | X | X% |

**⚠️ Desbalance detectado:** [Sí/No] - [Detalle]

### ⏱️ Tiempo Promedio por Estado
| Estado | Horas Promedio | Horas Máx | ¿Cuello de botella? |
|--------|----------------|-----------|---------------------|
| Pendiente | X | X | [Sí/No] |
| En Producción | X | X | [Sí/No] |
| ... | ... | ... | ... |

**Principal cuello de botella:** [Estado] con X horas promedio

### 🔴 Urgentes/Altas Sin Atender
| Folio | Cliente | Prioridad | Tiempo espera |
|-------|---------|-----------|---------------|
| X | X | X | X días |

### 🔄 Clientes con Más Correcciones
| Cliente | Solicitudes | Correcciones | Ratio |
|---------|-------------|--------------|-------|
| X | X | X | X |

**Posibles problemas de comunicación con:** [Clientes con ratio > 1]

### 📅 Días de la Semana
| Día | Entregas |
|-----|----------|
| Lunes | X |
| ... | ... |

**Día más productivo:** [Día]
**Día menos productivo:** [Día]

### 💡 Recomendaciones
1. [Recomendación basada en análisis]
2. [Recomendación de redistribución de carga]
3. [Recomendación para clientes problemáticos]
```
