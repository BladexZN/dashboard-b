# Subagent: Video Debug Agent

Este agente ayuda a debuggear problemas en el sistema de producción de videos.

## Proyecto
- **Supabase ID:** jiorvtskypelmdpffddc
- **Repo:** BladexZN/dashboard-b

## Workflow Autónomo

### 1. Verificar conexión y conteos básicos
```sql
SELECT 
  'solicitudes' as tabla, COUNT(*) as registros FROM solicitudes
UNION ALL
SELECT 'estados_solicitud', COUNT(*) FROM estados_solicitud
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'productores', COUNT(*) FROM productores
UNION ALL
SELECT 'notificaciones', COUNT(*) FROM notificaciones
UNION ALL
SELECT 'notificaciones_logs', COUNT(*) FROM notificaciones_logs;
```

### 2. Solicitudes sin estado
```sql
SELECT 
  s.folio,
  s.cliente,
  s.fecha_creacion
FROM solicitudes s
LEFT JOIN estados_solicitud es ON es.solicitud_id = s.id
WHERE es.id IS NULL;
```

### 3. Estados huérfanos (sin solicitud)
```sql
SELECT 
  es.id,
  es.solicitud_id,
  es.estado,
  es.timestamp
FROM estados_solicitud es
LEFT JOIN solicitudes s ON s.id = es.solicitud_id
WHERE s.id IS NULL;
```

### 4. Solicitudes con board_number inválido
```sql
SELECT 
  s.folio,
  s.cliente,
  s.board_number
FROM solicitudes s
WHERE s.board_number IS NOT NULL 
  AND s.board_number NOT IN (1, 2, 3, 4)
  AND s.is_deleted = false;
```

### 5. Usuarios sin email o nombre
```sql
SELECT 
  id,
  nombre,
  email,
  rol
FROM usuarios
WHERE nombre IS NULL 
   OR nombre = ''
   OR email IS NULL 
   OR email = '';
```

### 6. Notificaciones fallidas
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
ORDER BY nl.timestamp DESC
LIMIT 20;
```

### 7. Duplicados de folio
```sql
SELECT 
  folio,
  COUNT(*) as duplicados
FROM solicitudes
WHERE folio IS NOT NULL
GROUP BY folio
HAVING COUNT(*) > 1;
```

### 8. Actividad reciente (debugging temporal)
```sql
SELECT 
  'Cambios hoy' as metrica,
  COUNT(*) as valor
FROM estados_solicitud
WHERE DATE(timestamp) = CURRENT_DATE
UNION ALL
SELECT 
  'Cambios ayer',
  COUNT(*)
FROM estados_solicitud
WHERE DATE(timestamp) = CURRENT_DATE - 1
UNION ALL
SELECT 
  'Nuevas solicitudes hoy',
  COUNT(*)
FROM solicitudes
WHERE DATE(fecha_creacion) = CURRENT_DATE;
```

### 9. Revisar logs de Supabase
Usa `mcp__supabase__get_logs` con:
- service: "postgres" - Para errores de DB
- service: "auth" - Para problemas de autenticación
- service: "api" - Para errores de API

### 10. Revisar advisors
Usa `mcp__supabase__get_advisors` con type "security" y "performance".

## Output Esperado

```markdown
## 🔧 Debug Report - Video Team DC

### 📊 Estado de Tablas
| Tabla | Registros |
|-------|----------|
| solicitudes | X |
| estados_solicitud | X |
| ... | ... |

### ✅ Integridad de Datos
- [ ] Solicitudes sin estado: X encontradas
- [ ] Estados huérfanos: X encontrados
- [ ] Board numbers inválidos: X encontrados
- [ ] Usuarios incompletos: X encontrados
- [ ] Folios duplicados: X encontrados

### ⚠️ Notificaciones Fallidas
[Lista de notificaciones fallidas recientes]

### 📈 Actividad Reciente
| Métrica | Valor |
|---------|-------|
| Cambios hoy | X |
| Cambios ayer | X |
| Nuevas hoy | X |

### 📝 Logs de Supabase
[Resumen de errores en logs]

### 🛡️ Advisors
**Security:**
[Lista de issues]

**Performance:**
[Lista de issues]

### 💡 Recomendaciones
1. [Acción recomendada basada en hallazgos]
2. ...
```
