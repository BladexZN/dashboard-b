# Video Team DC - Contexto Completo

Este skill proporciona contexto completo del proyecto para debugging y desarrollo.

## Información del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre** | Dashboard Video Team DC |
| **Repo** | BladexZN/dashboard-b |
| **Supabase ID** | jiorvtskypelmdpffddc |
| **Stack** | React 19 + TypeScript + Vite + Supabase + Framer Motion + Recharts |

## Propósito
Sistema de gestión de producción de videos para el equipo de Video Team DC. Maneja solicitudes de video desde su creación hasta entrega, con tracking de estados, asignación a productores, y métricas de rendimiento.

## Productores (4 tableros Kanban)
| Board | Nombre |
|-------|--------|
| 1 | Carlos |
| 2 | Moises |
| 3 | Angel |
| 4 | Giovany |

## Flujo de Estados
```
Pendiente → En Producción → Listo → Entregado
              ↓
          Corrección (puede ocurrir en cualquier momento)
```

## Tipos de Video
- **Stock:** Videos con material de stock
- **Híbrido:** Combinación de stock y original
- **Original:** 100% contenido original

## Tipos de Solicitud
- **Video completo:** Nueva producción completa
- **Agregado:** Agregar contenido a video existente
- **Variante:** Variación de video existente
- **Corrección:** Correcciones a video entregado

## Prioridades
- Urgente (rojo)
- Alta (naranja)
- Media (amarillo)
- Baja (verde)

## Tablas de Base de Datos

| Tabla | Filas | Descripción |
|-------|-------|-------------|
| solicitudes | 5 | Solicitudes de video |
| estados_solicitud | 44 | Historial de estados |
| usuarios | 14 | Usuarios del sistema |
| productores | 4 | Los 4 productores |
| notificaciones | 30 | Notificaciones in-app |
| notificaciones_logs | 11 | Logs de envío |
| archivos | 0 | Archivos adjuntos |
| creative_starred_items | 0 | AdsLab - creativos guardados |
| competitor_brands | 0 | AdsLab - competidores |
| competitor_ads | 0 | AdsLab - anuncios competidores |

## Roles de Usuario
- **Admin:** Acceso total
- **Dirección:** Vista ejecutiva
- **Asesor de Marketing:** Crea solicitudes, ve entregas
- **Productor:** Trabaja en solicitudes asignadas

## Componentes Principales
- `App.tsx` - Componente principal, estado global
- `ProductionKanban.tsx` - Vista Kanban de producción
- `RequestsTable.tsx` - Vista de tabla con paginación
- `ReportsView.tsx` - Analytics y rendimiento
- `AuditLogView.tsx` - Bitácora de cambios
- `AdsLabView.tsx` - Herramienta de research de anuncios
- `NewRequestModal.tsx` - Crear solicitudes
- `RequestDetailModal.tsx` - Detalle y edición

## Features Recientes (commits)
1. AdsLab con Meta Ads, YouTube, Google Trends
2. Optimizaciones para 50+ solicitudes diarias
3. Rendimiento de productores con filtros de fecha
4. Seguridad: session timeout, DevTools blocking
5. Paginación y Load More en Kanban

## Métricas de Velocidad
- **Rápidos:** < 24 horas
- **Normal:** 1-7 días
- **Lentos:** > 7 días

## Soft Delete
Las solicitudes eliminadas van a papelera con:
- `is_deleted = true`
- `deleted_at = timestamp`
- `deleted_by = user_id`
