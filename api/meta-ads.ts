import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.META_ADS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Meta Ads token not configured on server' });
  }

  const { keyword, filters } = req.body || {};
  if (!keyword) {
    return res.status(400).json({ error: 'keyword is required' });
  }

  const adStatus = filters?.adStatus || 'ALL';
  const countries = filters?.countries || ['US'];
  const mediaType = filters?.mediaType || 'ALL';
  const language = filters?.language || 'all';
  const maxPages = Math.min(filters?.maxPages || 5, 10);

  const countriesArray = JSON.stringify(countries);

  const params = new URLSearchParams({
    access_token: token,
    search_terms: keyword,
    ad_active_status: adStatus,
    fields: 'id,ad_creative_bodies,ad_creative_link_titles,page_name,publisher_platforms,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url',
    limit: '50',
  });

  if (mediaType !== 'ALL') {
    params.append('media_type', mediaType);
  }

  const baseUrl = 'https://graph.facebook.com/v23.0/ads_archive';
  const countriesParam = `ad_reached_countries=${encodeURIComponent(countriesArray)}`;
  const languageParam = language && language !== 'all'
    ? `&languages=${encodeURIComponent(JSON.stringify([language]))}`
    : '';

  let allResults: any[] = [];
  let nextUrl: string | null = `${baseUrl}?${params.toString()}&${countriesParam}${languageParam}`;
  let pageCount = 0;

  try {
    while (nextUrl && pageCount < maxPages) {
      const response = await fetch(nextUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: errorData.error?.message || `Meta Ads API error: ${response.status}`,
          code: errorData.error?.code,
        });
      }

      const data = await response.json();
      const pageResults = data.data || [];
      allResults = [...allResults, ...pageResults];

      nextUrl = data.paging?.next || null;
      pageCount++;

      if (nextUrl && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return res.status(200).json({ data: allResults, pages: pageCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
