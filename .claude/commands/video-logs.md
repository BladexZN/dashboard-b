# Video Team DC - Bitácora y Logs

Este skill contiene consultas para auditoría y debugging.

## Proyecto Supabase
- **ID:** jiorvtskypelmdpffddc

## Consultas disponibles:

### Últimos cambios de estado
```sql
SELECT 
  s.folio,
  s.cliente,
  s.producto,
  es.estado,
  u.nombre as usuario,
  es.timestamp
FROM estados_solicitud es
JOIN solicitudes s ON s.id = es.solicitud_id
LEFT JOIN usuarios u ON u.id = es.usuario_id
ORDER BY es.timestamp DESC
LIMIT 50;
```

### Historial de una solicitud específica
```sql
-- Reemplaza {FOLIO} con el folio de la solicitud
SELECT 
  es.estado,
  u.nombre as cambiado_por,
  es.timestamp,
  es.timestamp - LAG(es.timestamp) OVER (ORDER BY es.timestamp) as tiempo_en_estado_anterior
FROM estados_solicitud es
JOIN solicitudes s ON s.id = es.solicitud_id
LEFT JOIN usuarios u ON u.id = es.usuario_id
WHERE s.folio = '{FOLIO}'
ORDER BY es.timestamp;
```

### Actividad por usuario hoy
```sql
SELECT 
  u.nombre,
  u.rol,
  COUNT(*) as cambios_hoy
FROM estados_solicitud es
JOIN usuarios u ON u.id = es.usuario_id
WHERE DATE(es.timestamp) = CURRENT_DATE
GROUP BY u.id, u.nombre, u.rol
ORDER BY cambios_hoy DESC;
```

### Notificaciones recientes
```sql
SELECT 
  n.titulo,
  n.mensaje,
  n.tipo,
  u.nombre as destinatario,
  n.is_read,
  n.created_at
FROM notificaciones n
JOIN usuarios u ON u.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 30;
```

### Logs de notificaciones enviadas
```sql
SELECT 
  nl.tipo,
  nl.destinatario,
  nl.canal,
  nl.status,
  s.folio,
  nl.timestamp
FROM notificaciones_logs nl
LEFT JOIN solicitudes s ON s.id = nl.solicitud_id
ORDER BY nl.timestamp DESC
LIMIT 30;
```

### Eliminaciones recientes (papelera)
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
LIMIT 20;
```

### Errores en notificaciones
```sql
SELECT 
  nl.tipo,
  nl.destinatario,
  nl.canal,
  s.folio,
  nl.timestamp
FROM notificaciones_logs nl
LEFT JOIN solicitudes s ON s.id = nl.solicitud_id
WHERE nl.status = 'failed'
ORDER BY nl.timestamp DESC;
```

### Usuarios del sistema
```sql
SELECT 
  nombre,
  email,
  rol,
  estado,
  created_at
FROM usuarios
ORDER BY 
  CASE rol 
    WHEN 'Admin' THEN 1 
    WHEN 'Dirección' THEN 2
    WHEN 'Asesor de Marketing' THEN 3
    WHEN 'Productor' THEN 4
  END,
  nombre;
```

### Cambios de estado por hora (últimas 24h)
```sql
SELECT 
  DATE_TRUNC('hour', es.timestamp) as hora,
  COUNT(*) as cambios
FROM estados_solicitud es
WHERE es.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', es.timestamp)
ORDER BY hora DESC;
```
