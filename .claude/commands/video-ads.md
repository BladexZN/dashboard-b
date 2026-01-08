# Video Team DC - AdsLab

Este skill contiene consultas para el módulo AdsLab (investigación de anuncios).

## Proyecto Supabase
- **ID:** jiorvtskypelmdpffddc

## Tablas de AdsLab
- `creative_starred_items` - Creativos guardados/destacados
- `competitor_brands` - Marcas competidoras registradas
- `competitor_ads` - Anuncios de competidores guardados

## Consultas disponibles:

### Creativos destacados
```sql
SELECT 
  platform,
  external_id,
  creator_display_name,
  caption,
  view_count,
  like_count,
  content_type,
  starred_at,
  search_keyword,
  notes
FROM creative_starred_items
ORDER BY starred_at DESC
LIMIT 20;
```

### Creativos por plataforma
```sql
SELECT 
  COALESCE(platform, 'Sin especificar') as plataforma,
  COUNT(*) as cantidad,
  AVG(view_count) as promedio_vistas,
  AVG(like_count) as promedio_likes
FROM creative_starred_items
GROUP BY platform
ORDER BY cantidad DESC;
```

### Marcas competidoras registradas
```sql
SELECT 
  brand_name,
  meta_page_id,
  tiktok_username,
  notes,
  created_at
FROM competitor_brands
ORDER BY created_at DESC;
```

### Anuncios de competidores guardados
```sql
SELECT 
  cb.brand_name as competidor,
  ca.platform,
  ca.category,
  ca.description,
  ca.tags,
  ca.notes,
  ca.saved_at
FROM competitor_ads ca
JOIN competitor_brands cb ON cb.id = ca.competitor_id
ORDER BY ca.saved_at DESC
LIMIT 20;
```

### Anuncios por competidor
```sql
SELECT 
  cb.brand_name as competidor,
  COUNT(*) as anuncios_guardados,
  COUNT(DISTINCT ca.platform) as plataformas,
  MAX(ca.saved_at) as ultimo_guardado
FROM competitor_brands cb
LEFT JOIN competitor_ads ca ON ca.competitor_id = cb.id
GROUP BY cb.id, cb.brand_name
ORDER BY anuncios_guardados DESC;
```

### Keywords de búsqueda más usados
```sql
SELECT 
  search_keyword,
  COUNT(*) as creativos_guardados,
  AVG(view_count) as promedio_vistas
FROM creative_starred_items
WHERE search_keyword IS NOT NULL
GROUP BY search_keyword
ORDER BY creativos_guardados DESC
LIMIT 15;
```

### Creativos con mejor engagement
```sql
SELECT 
  platform,
  creator_display_name,
  caption,
  view_count,
  like_count,
  comment_count,
  ROUND((like_count::numeric / NULLIF(view_count, 0)) * 100, 2) as engagement_rate
FROM creative_starred_items
WHERE view_count > 0
ORDER BY engagement_rate DESC
LIMIT 10;
```

## Notas
- AdsLab integra: Meta Ads Library, YouTube Search, Google Trends
- Los creativos se pueden marcar con notas y keywords para búsqueda posterior
