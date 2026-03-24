import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured on server' });
  }

  const { keyword, filters } = req.body || {};
  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required' });
  }

  const orderBy = filters?.orderBy || 'relevance';
  const country = filters?.country || 'US';
  const strictMatch = filters?.strictMatch !== false;
  const maxPages = Math.min(filters?.maxPages || 2, 5);

  const languageMap: Record<string, string> = {
    US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
    EC: 'es', VE: 'es', UY: 'es', PY: 'es', BO: 'es', CR: 'es',
    PA: 'es', GT: 'es', HN: 'es', SV: 'es', NI: 'es', DO: 'es', PR: 'es', CU: 'es',
    BR: 'pt', PT: 'pt', FR: 'fr', BE: 'fr', DE: 'de', AT: 'de', CH: 'de',
    IT: 'it', JP: 'ja', KR: 'ko', RU: 'ru', UA: 'ru', IN: 'hi', CN: 'zh',
  };
  const relevanceLanguage = languageMap[country] || 'en';

  const searchQuery = strictMatch ? `"${keyword}"` : `${keyword} shorts`;

  try {
    let allItems: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;

    while (pageCount < maxPages) {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        videoDuration: 'short',
        maxResults: '50',
        order: orderBy,
        regionCode: country,
        relevanceLanguage,
        key: apiKey,
      });

      if (nextPageToken) {
        searchParams.append('pageToken', nextPageToken);
      }

      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams}`
      );

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        return res.status(searchResponse.status).json({
          error: errorData.error?.message || 'YouTube API error',
        });
      }

      const searchData = await searchResponse.json();
      const pageItems = searchData.items || [];
      allItems = [...allItems, ...pageItems];

      nextPageToken = searchData.nextPageToken || null;
      pageCount++;

      if (!nextPageToken) break;
      if (pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (allItems.length === 0) {
      return res.status(200).json({ items: [] });
    }

    const videoIds = allItems
      .filter((item: any) => item.id?.videoId)
      .map((item: any) => item.id.videoId);

    const statsMap = new Map<string, any>();

    for (let i = 0; i < videoIds.length; i += 50) {
      const chunkIds = videoIds.slice(i, i + 50).join(',');
      const statsParams = new URLSearchParams({
        part: 'statistics,contentDetails',
        id: chunkIds,
        key: apiKey,
      });

      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${statsParams}`
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        (statsData.items || []).forEach((stat: any) => {
          statsMap.set(stat.id, stat);
        });
      }
    }

    const enrichedItems = allItems.map((item: any) => {
      const stats = statsMap.get(item.id?.videoId);
      return {
        ...item,
        statistics: stats?.statistics || {},
        contentDetails: stats?.contentDetails || {},
      };
    });

    return res.status(200).json({ items: enrichedItems, pages: pageCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
