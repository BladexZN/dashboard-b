import { supabase } from './supabaseClient';

// Types
export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'meta' | 'trends';
export type PlatformStatus = 'idle' | 'loading' | 'done' | 'error';

export interface CreativeItem {
  id?: string;
  external_id: string;
  platform: Platform;
  post_url: string;
  thumbnail_url: string | null;
  creator_username: string | null;
  creator_display_name: string | null;
  caption: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  hashtags: string[];
  content_type: string | null;
  duration_seconds: number | null;
  is_ad: boolean;
  published_at: string | null;
  isStarred?: boolean;
  // Viral detection (Meta Ads only)
  repetition_count?: number;  // How many times this ad appears in results
  isViral?: boolean;          // true if repetition_count >= 3
}

export interface StarredItem extends CreativeItem {
  starred_at: string;
  notes: string | null;
  search_keyword: string | null;
  user_id: string;
}

export interface SearchProgress {
  tiktok: PlatformStatus;
  instagram: PlatformStatus;
  youtube: PlatformStatus;
  meta: PlatformStatus;
}

export interface PlatformResults {
  platform: Platform;
  items: CreativeItem[];
  count: number;
  error?: string;
  fallbackLinks?: Record<string, string>;
  fallbackMessage?: string;
}

// Meta Ads Library API (Official)
const META_ADS_TOKEN = import.meta.env.VITE_META_ADS_TOKEN;

// YouTube Data API v3 (Official)
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// Enabled platforms (free/working)
// TikTok removed - direct search blocked, use Creative Center links in Trends tab
export const ENABLED_PLATFORMS: Platform[] = ['meta', 'youtube'];

// Google Trends Types
export interface TrendingTopic {
  title: string;
  formattedTraffic: string;
  relatedQueries: string[];
  articles: {
    title: string;
    url: string;
    source: string;
    snippet: string;
  }[];
}

export interface TrendsData {
  keyword: string;
  interestOverTime: number[];
  relatedTopics: { topic: string; value: number }[];
  relatedQueries: { query: string; value: number }[];
  risingQueries: { query: string; value: string }[];
  geo: string;
}

// Google Trends geo codes (same as YouTube/Meta for consistency)
export const TRENDS_REGIONS: { code: string; name: string }[] = [
  { code: '', name: 'Mundial' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'BR', name: 'Brasil' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'DE', name: 'Alemania' },
  { code: 'FR', name: 'Francia' },
  { code: 'IT', name: 'Italia' },
  { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japón' },
  { code: 'IN', name: 'India' },
];

// Meta Ads Filter Options
export interface MetaAdsFilters {
  countries: string[];
  adStatus: 'ACTIVE' | 'INACTIVE' | 'ALL';
  mediaType: 'ALL' | 'IMAGE' | 'VIDEO' | 'MEME' | 'NONE';
  language: string; // Language filter (e.g., 'es', 'en', 'all')
  strictMatch: boolean; // Only show ads with keyword in text
}

// Available languages for Meta Ads
export const META_ADS_LANGUAGES: { code: string; name: string }[] = [
  { code: 'all', name: 'Todos los idiomas' },
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'Inglés' },
  { code: 'pt', name: 'Portugués' },
  { code: 'fr', name: 'Francés' },
  { code: 'de', name: 'Alemán' },
  { code: 'it', name: 'Italiano' },
  { code: 'zh', name: 'Chino' },
  { code: 'ja', name: 'Japonés' },
  { code: 'ko', name: 'Coreano' },
];

export const META_ADS_COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'BR', name: 'Brasil' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'DE', name: 'Alemania' },
  { code: 'FR', name: 'Francia' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'MY', name: 'Malasia' },
  { code: 'SG', name: 'Singapur' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'SE', name: 'Suecia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'PL', name: 'Polonia' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Suiza' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'AE', name: 'Emiratos Árabes' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turquía' },
  { code: 'RU', name: 'Rusia' },
  { code: 'UA', name: 'Ucrania' },
  { code: 'EG', name: 'Egipto' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenia' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'CU', name: 'Cuba' },
];

export const DEFAULT_META_FILTERS: MetaAdsFilters = {
  countries: ['US', 'MX', 'ES', 'AR', 'CO'], // Search multiple countries by default
  adStatus: 'ALL', // Include active and inactive ads
  mediaType: 'ALL',
  language: 'es', // Default to Spanish
  strictMatch: false, // Show all related ads, not just exact keyword matches
};

// YouTube Filter Options
export interface YouTubeFilters {
  country: string;
  orderBy: 'relevance' | 'viewCount' | 'date';
  strictMatch: boolean; // Only show videos with keyword in title
}

export const DEFAULT_YOUTUBE_FILTERS: YouTubeFilters = {
  country: 'US',
  orderBy: 'relevance', // Default to relevance for better matches
  strictMatch: true, // Only show videos that contain the keyword
};

// Search Meta Ads using official API with filters and pagination
async function searchMetaAdsAPI(keyword: string, filters: MetaAdsFilters = DEFAULT_META_FILTERS): Promise<any[]> {
  console.log(`[AdsLab] Searching Meta Ads for: ${keyword}`, filters);

  if (!META_ADS_TOKEN) {
    throw new Error('Meta Ads token not configured');
  }

  // Properly format countries as JSON array
  const countriesArray = JSON.stringify(filters.countries);

  const params = new URLSearchParams({
    access_token: META_ADS_TOKEN,
    search_terms: keyword,
    ad_active_status: filters.adStatus,
    fields: 'id,ad_creative_bodies,ad_creative_link_titles,page_name,publisher_platforms,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url',
    limit: '50' // Per page limit
  });

  // Add media_type if not ALL
  if (filters.mediaType !== 'ALL') {
    params.append('media_type', filters.mediaType);
  }

  const baseUrl = 'https://graph.facebook.com/v23.0/ads_archive';
  const countriesParam = `ad_reached_countries=${encodeURIComponent(countriesArray)}`;

  // Add language filter if not 'all'
  const languageParam = filters.language && filters.language !== 'all'
    ? `&languages=${encodeURIComponent(JSON.stringify([filters.language]))}`
    : '';

  let allResults: any[] = [];
  let nextUrl: string | null = `${baseUrl}?${params.toString()}&${countriesParam}${languageParam}`;
  let pageCount = 0;
  const maxPages = 5; // Get up to 250 results (5 pages x 50) before deduplication

  try {
    while (nextUrl && pageCount < maxPages) {
      console.log(`[AdsLab] Meta Ads page ${pageCount + 1}...`);

      const response = await fetch(nextUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[AdsLab] Meta Ads API error:`, errorData);

        if (errorData.error?.code === 190) {
          throw new Error('Token de Meta Ads expirado o inválido. Verifica VITE_META_ADS_TOKEN.');
        }
        if (errorData.error?.code === 100) {
          throw new Error('Parámetros inválidos en la búsqueda de Meta Ads.');
        }
        if (errorData.error?.code === 4) {
          throw new Error('Límite de requests alcanzado. Intenta de nuevo en unos minutos.');
        }

        throw new Error(errorData.error?.message || `Meta Ads API error: ${response.status}`);
      }

      const data = await response.json();
      const pageResults = data.data || [];
      allResults = [...allResults, ...pageResults];

      console.log(`[AdsLab] Page ${pageCount + 1}: ${pageResults.length} results (total: ${allResults.length})`);

      // Check for next page
      nextUrl = data.paging?.next || null;
      pageCount++;

      // Small delay between pages to avoid rate limiting
      if (nextUrl && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`[AdsLab] Total Meta Ads results: ${allResults.length}`);
    return allResults;
  } catch (error: any) {
    console.error('[AdsLab] Meta Ads fetch error:', error);
    throw error;
  }
}

// Search YouTube using official API with statistics, filters and pagination
async function searchYouTubeAPI(keyword: string, filters: YouTubeFilters = DEFAULT_YOUTUBE_FILTERS): Promise<any[]> {
  console.log(`[AdsLab] Searching YouTube for: ${keyword}`, filters);

  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  // Use quotes for exact phrase matching
  const searchQuery = filters.strictMatch ? `"${keyword}"` : `${keyword} shorts`;

  let allItems: any[] = [];
  let nextPageToken: string | null = null;
  let pageCount = 0;
  const maxPages = 2; // Get up to 100 results (2 pages x 50)

  // Step 1: Search for videos with pagination
  while (pageCount < maxPages) {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      videoDuration: 'short',
      maxResults: '50',
      order: filters.orderBy,
      regionCode: filters.country,
      relevanceLanguage: getLanguageForCountry(filters.country),
      key: YOUTUBE_API_KEY,
    });

    if (nextPageToken) {
      searchParams.append('pageToken', nextPageToken);
    }

    console.log(`[AdsLab] YouTube page ${pageCount + 1}...`);

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`
    );

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      console.error(`[AdsLab] YouTube Search API error:`, errorData);
      throw new Error(errorData.error?.message || 'YouTube API error');
    }

    const searchData = await searchResponse.json();
    const pageItems = searchData.items || [];
    allItems = [...allItems, ...pageItems];

    console.log(`[AdsLab] Page ${pageCount + 1}: ${pageItems.length} results (total: ${allItems.length})`);

    nextPageToken = searchData.nextPageToken || null;
    pageCount++;

    if (!nextPageToken) break;

    // Small delay between pages
    if (pageCount < maxPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (allItems.length === 0) return [];

  // Step 2: Get video IDs
  const videoIds = allItems
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => item.id.videoId)
    .join(',');

  // Step 3: Get video statistics (API supports up to 50 IDs per request)
  const statsMap = new Map<string, any>();
  const idChunks = videoIds.split(',');

  for (let i = 0; i < idChunks.length; i += 50) {
    const chunkIds = idChunks.slice(i, i + 50).join(',');

    const statsParams = new URLSearchParams({
      part: 'statistics,contentDetails',
      id: chunkIds,
      key: YOUTUBE_API_KEY,
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

  // Step 4: Merge search results with statistics
  const enrichedItems = allItems.map((item: any) => {
    const stats = statsMap.get(item.id?.videoId);
    return {
      ...item,
      statistics: stats?.statistics || {},
      contentDetails: stats?.contentDetails || {},
    };
  });

  console.log(`[AdsLab] Total YouTube results: ${enrichedItems.length}`);
  return enrichedItems;
}

// Get language code for country (for better relevance)
function getLanguageForCountry(countryCode: string): string {
  const languageMap: Record<string, string> = {
    US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
    EC: 'es', VE: 'es', UY: 'es', PY: 'es', BO: 'es', CR: 'es',
    PA: 'es', GT: 'es', HN: 'es', SV: 'es', NI: 'es', DO: 'es', PR: 'es', CU: 'es',
    BR: 'pt', PT: 'pt',
    FR: 'fr', BE: 'fr',
    DE: 'de', AT: 'de', CH: 'de',
    IT: 'it',
    JP: 'ja',
    KR: 'ko',
    RU: 'ru', UA: 'ru',
    IN: 'hi',
    CN: 'zh',
  };
  return languageMap[countryCode] || 'en';
}

// Transform YouTube API results to unified schema (with statistics and keyword filtering)
function transformYouTubeAPI(items: any[], keyword: string, strictMatch: boolean): CreativeItem[] {
  const keywordLower = keyword.toLowerCase();
  const keywordWords = keywordLower.split(/\s+/);

  return items
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      external_id: `youtube_${item.id.videoId}`,
      platform: 'youtube' as Platform,
      post_url: `https://www.youtube.com/shorts/${item.id.videoId}`,
      thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null,
      creator_username: item.snippet?.channelTitle || null,
      creator_display_name: item.snippet?.channelTitle || null,
      caption: (item.snippet?.title || '').substring(0, 500),
      view_count: parseInt(item.statistics?.viewCount || '0', 10),
      like_count: parseInt(item.statistics?.likeCount || '0', 10),
      comment_count: parseInt(item.statistics?.commentCount || '0', 10),
      share_count: 0,
      hashtags: extractHashtags(item.snippet?.title || ''),
      content_type: 'video',
      duration_seconds: parseDuration(item.contentDetails?.duration),
      is_ad: false,
      published_at: item.snippet?.publishedAt || null,
      _title: item.snippet?.title || '', // Keep for filtering
    }))
    .filter((item) => {
      if (!strictMatch) return true;
      // Check if title contains the keyword (case insensitive)
      const titleLower = item._title.toLowerCase();
      return keywordWords.every(word => titleLower.includes(word));
    })
    .map(({ _title, ...item }) => item) // Remove internal field
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 50);
}

// Extract hashtags from title
function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches ? matches.map(tag => tag.substring(1)) : [];
}

// Parse YouTube duration format (PT1M30S -> seconds)
function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Supabase Edge Function URL for Apify proxy (for TikTok only)
const SUPABASE_URL = 'https://jqjkiyspagztsvrvxmey.supabase.co';
const SEARCH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/search-creatives`;
const TIKTOK_SEARCH_URL = `${SUPABASE_URL}/functions/v1/tiktok-search`;

// TikTok Direct Search (experimental) - Tries direct fetch before Apify
export interface TikTokDirectResult {
  success: boolean;
  mode: 'direct' | 'fallback' | 'oembed';
  data?: any[];
  count?: number;
  message?: string;
  creativeCenterLinks?: Record<string, string>;
  suggestion?: string;
}

async function searchTikTokDirect(keyword: string, region: string = 'US'): Promise<TikTokDirectResult> {
  console.log(`[AdsLab] Attempting direct TikTok search for: ${keyword}`);

  try {
    const response = await fetch(TIKTOK_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword, region }),
    });

    if (!response.ok) {
      console.error(`[AdsLab] TikTok direct search failed: ${response.status}`);
      return {
        success: false,
        mode: 'fallback',
        message: 'Edge function error',
      };
    }

    const result: TikTokDirectResult = await response.json();
    console.log(`[AdsLab] TikTok direct search result:`, result.mode, result.count || 0);
    return result;
  } catch (error) {
    console.error(`[AdsLab] TikTok direct search error:`, error);
    return {
      success: false,
      mode: 'fallback',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Transform TikTok Direct results to unified schema
function transformTikTokDirect(items: any[]): CreativeItem[] {
  return items
    .filter((item) => item.id && item.videoUrl)
    .map((item) => ({
      external_id: `tiktok_${item.id}`,
      platform: 'tiktok' as Platform,
      post_url: item.videoUrl,
      thumbnail_url: item.coverUrl || null,
      creator_username: item.author || null,
      creator_display_name: item.authorNickname || null,
      caption: (item.desc || '').substring(0, 500),
      view_count: item.playCount || 0,
      like_count: item.likeCount || 0,
      comment_count: item.commentCount || 0,
      share_count: item.shareCount || 0,
      hashtags: [],
      content_type: 'video',
      duration_seconds: null,
      is_ad: false,
      published_at: item.createTime ? new Date(item.createTime * 1000).toISOString() : null,
    }))
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 50);
}

// Run search via Supabase Edge Function (for TikTok/YouTube)
async function runApifySearch(
  platform: Platform,
  keyword: string
): Promise<any[]> {
  console.log(`[AdsLab] Searching ${platform} via Apify for: ${keyword}`);

  const response = await fetch(SEARCH_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ platform, keyword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[AdsLab] Error searching ${platform}:`, errorData);
    throw new Error(errorData.error || `Failed to search ${platform}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[AdsLab] Got ${Array.isArray(data) ? data.length : 0} results from ${platform}`);
  return Array.isArray(data) ? data : [];
}

// Transform TikTok results to unified schema
function transformTikTok(items: any[]): CreativeItem[] {
  return items
    .filter((item) => item.id && item.webVideoUrl)
    .map((item) => ({
      external_id: `tiktok_${item.id}`,
      platform: 'tiktok' as Platform,
      post_url: item.webVideoUrl,
      thumbnail_url: item.videoMeta?.coverUrl || null,
      creator_username: item.authorMeta?.name || null,
      creator_display_name: item.authorMeta?.nickName || null,
      caption: (item.text || '').substring(0, 500),
      view_count: item.playCount || 0,
      like_count: item.diggCount || 0,
      comment_count: item.commentCount || 0,
      share_count: item.shareCount || 0,
      hashtags: (item.hashtags || []).map((h: any) => h.name || h),
      content_type: 'video',
      duration_seconds: item.videoMeta?.duration || null,
      is_ad: item.isSponsored || item.isAd || false,
      published_at: item.createTimeISO || null,
    }))
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 50);
}

// Transform Instagram results to unified schema
function transformInstagram(items: any[]): CreativeItem[] {
  return items
    .filter((item) => item.id || item.shortCode)
    .map((item) => ({
      external_id: `instagram_${item.id || item.shortCode}`,
      platform: 'instagram' as Platform,
      post_url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
      thumbnail_url: item.displayUrl || item.thumbnailUrl || null,
      creator_username: item.ownerUsername || null,
      creator_display_name: item.ownerFullName || null,
      caption: (item.caption || '').substring(0, 500),
      view_count: item.videoViewCount || 0,
      like_count: item.likesCount || 0,
      comment_count: item.commentsCount || 0,
      share_count: 0, // Instagram doesn't expose shares
      hashtags: (item.hashtags || []),
      content_type: item.type || (item.isVideo ? 'video' : 'image'),
      duration_seconds: item.videoDuration || null,
      is_ad: item.isSponsored || false,
      published_at: item.timestamp || null,
    }))
    .sort((a, b) => b.like_count - a.like_count)
    .slice(0, 50);
}

// Transform YouTube results to unified schema
function transformYouTube(items: any[]): CreativeItem[] {
  return items
    .filter((item) => item.id || item.videoId)
    .map((item) => ({
      external_id: `youtube_${item.id || item.videoId}`,
      platform: 'youtube' as Platform,
      post_url: item.url || `https://www.youtube.com/shorts/${item.id || item.videoId}`,
      thumbnail_url: item.thumbnailUrl || (item.thumbnails && item.thumbnails[0]?.url) || null,
      creator_username: item.channelName || item.channelHandle || null,
      creator_display_name: item.channelName || null,
      caption: (item.title || item.description || '').substring(0, 500),
      view_count: item.viewCount || item.views || 0,
      like_count: item.likes || item.likeCount || 0,
      comment_count: item.commentCount || item.commentsCount || 0,
      share_count: 0, // YouTube doesn't expose shares
      hashtags: (item.hashtags || []),
      content_type: 'video',
      duration_seconds: item.duration || null,
      is_ad: false,
      published_at: item.date || item.uploadDate || null,
    }))
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 50);
}

// Transform Meta Ads API results to unified schema (with keyword filtering, deduplication, and viral detection)
function transformMetaAdsAPI(items: any[], keyword: string, strictMatch: boolean): CreativeItem[] {
  const keywordLower = keyword.toLowerCase();
  const keywordWords = keywordLower.split(/\s+/);

  const transformed = items
    .filter((item) => item.id)
    .map((item) => {
      // Combine all text fields for filtering
      const allText = [
        ...(item.ad_creative_bodies || []),
        ...(item.ad_creative_link_titles || []),
        item.page_name || ''
      ].join(' ').toLowerCase();

      const caption = (item.ad_creative_bodies?.[0] || item.ad_creative_link_titles?.[0] || '').substring(0, 500);

      // Create unique key: page_name + normalized caption (first 100 chars)
      const normalizedCaption = caption.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 100);
      const dedupeKey = `${(item.page_name || '').toLowerCase()}|${normalizedCaption}`;

      return {
        external_id: `meta_${item.id}`,
        platform: 'meta' as Platform,
        post_url: `https://www.facebook.com/ads/library/?id=${item.id}`,
        thumbnail_url: null,
        creator_username: item.page_name || null,
        creator_display_name: item.page_name || null,
        caption,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        hashtags: [],
        content_type: 'ad',
        duration_seconds: null,
        is_ad: true,
        published_at: item.ad_delivery_start_time || null,
        _allText: allText,
        _dedupeKey: dedupeKey,
      };
    })
    .filter((item) => {
      if (!strictMatch) return true;
      return keywordWords.every(word => item._allText.includes(word));
    });

  const afterKeywordFilter = transformed.length;

  // Step 1: Count repetitions of each creative (for viral detection)
  const creativeCount = new Map<string, number>();
  transformed.forEach(item => {
    const count = (creativeCount.get(item._dedupeKey) || 0) + 1;
    creativeCount.set(item._dedupeKey, count);
  });

  // Step 2: Deduplicate and add repetition_count + isViral
  const seen = new Set<string>();
  const deduplicated = transformed
    .filter((item) => {
      if (seen.has(item._dedupeKey)) return false;
      seen.add(item._dedupeKey);
      return true;
    })
    .map(({ _allText, _dedupeKey, ...item }) => {
      const count = creativeCount.get(_dedupeKey) || 1;
      return {
        ...item,
        repetition_count: count,
        isViral: count >= 3, // Viral threshold: 3+ repetitions
      };
    });

  // Count viral ads for logging
  const viralCount = deduplicated.filter(item => item.isViral).length;
  console.log(`[AdsLab] Meta Ads: ${items.length} raw → ${afterKeywordFilter} con keyword → ${deduplicated.length} únicos (${viralCount} virales)`);

  return deduplicated.slice(0, 100);
}

// Search a single platform
export async function searchPlatform(
  platform: Platform,
  keyword: string,
  onProgress?: (status: PlatformStatus) => void,
  metaFilters?: MetaAdsFilters,
  youtubeFilters?: YouTubeFilters
): Promise<PlatformResults> {
  // Check if platform is enabled
  if (!ENABLED_PLATFORMS.includes(platform)) {
    console.log(`[AdsLab] Platform ${platform} is disabled`);
    return { platform, items: [], count: 0, error: 'Plataforma no disponible' };
  }

  onProgress?.('loading');

  try {
    let items: CreativeItem[] = [];
    const ytFilters = youtubeFilters || DEFAULT_YOUTUBE_FILTERS;

    const mtFilters = metaFilters || DEFAULT_META_FILTERS;

    switch (platform) {
      case 'meta':
        // Use official Meta Ads Library API with filters
        const metaResults = await searchMetaAdsAPI(keyword, mtFilters);
        items = transformMetaAdsAPI(metaResults, keyword, mtFilters.strictMatch);
        break;

      case 'youtube':
        // Use official YouTube Data API v3 with filters
        const youtubeResults = await searchYouTubeAPI(keyword, ytFilters);
        items = transformYouTubeAPI(youtubeResults, keyword, ytFilters.strictMatch);
        break;

      case 'tiktok':
        // Try direct TikTok search first (experimental)
        const directResult = await searchTikTokDirect(keyword, youtubeFilters?.country || 'US');

        if (directResult.success && directResult.data && directResult.data.length > 0) {
          // Direct search worked!
          items = transformTikTokDirect(directResult.data);
          console.log(`[AdsLab] TikTok direct search returned ${items.length} items`);
        } else if (directResult.creativeCenterLinks) {
          // Direct search failed, return Creative Center links as fallback
          console.log(`[AdsLab] TikTok direct search failed, returning fallback links`);
          onProgress?.('done');
          return {
            platform,
            items: [],
            count: 0,
            fallbackLinks: directResult.creativeCenterLinks,
            fallbackMessage: directResult.message || 'Búsqueda directa no disponible. Usa los links externos.',
          };
        } else {
          // Both failed, return empty with error
          throw new Error(directResult.message || 'TikTok search unavailable');
        }
        break;

      case 'instagram':
        // Disabled - requires expensive proxies
        return { platform, items: [], count: 0, error: 'Instagram deshabilitado' };
    }

    onProgress?.('done');
    return { platform, items, count: items.length };
  } catch (error: any) {
    console.error(`Error searching ${platform}:`, error);
    onProgress?.('error');
    return { platform, items: [], count: 0, error: error.message };
  }
}

// Search all platforms in parallel
export async function searchAllPlatforms(
  keyword: string,
  platforms: Platform[] = ENABLED_PLATFORMS,
  onPlatformUpdate?: (platform: Platform, status: PlatformStatus, results?: CreativeItem[]) => void
): Promise<CreativeItem[]> {
  const promises = platforms.map(async (platform) => {
    const result = await searchPlatform(platform, keyword, (status) => {
      onPlatformUpdate?.(platform, status);
    });
    if (result.items.length > 0) {
      onPlatformUpdate?.(platform, 'done', result.items);
    }
    return result;
  });

  const results = await Promise.all(promises);
  return results.flatMap((r) => r.items);
}

// Star a creative item
export async function starCreative(
  item: CreativeItem,
  userId: string,
  searchKeyword?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('creative_starred_items').upsert(
    {
      user_id: userId,
      platform: item.platform,
      external_id: item.external_id,
      post_url: item.post_url,
      thumbnail_url: item.thumbnail_url,
      creator_username: item.creator_username,
      creator_display_name: item.creator_display_name,
      caption: item.caption,
      view_count: item.view_count,
      like_count: item.like_count,
      comment_count: item.comment_count,
      share_count: item.share_count,
      hashtags: item.hashtags,
      content_type: item.content_type,
      duration_seconds: item.duration_seconds,
      is_ad: item.is_ad,
      published_at: item.published_at,
      search_keyword: searchKeyword,
    },
    {
      onConflict: 'user_id,platform,external_id',
    }
  );

  if (error) {
    console.error('Error starring creative:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Unstar a creative item
export async function unstarCreative(
  userId: string,
  platform: Platform,
  externalId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('creative_starred_items')
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('external_id', externalId);

  if (error) {
    console.error('Error unstarring creative:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get all starred items for a user
export async function getStarredItems(userId: string): Promise<StarredItem[]> {
  const { data, error } = await supabase
    .from('creative_starred_items')
    .select('*')
    .eq('user_id', userId)
    .order('starred_at', { ascending: false });

  if (error) {
    console.error('Error fetching starred items:', error);
    return [];
  }

  return data as StarredItem[];
}

// Get starred item IDs for quick lookup
export async function getStarredItemIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('creative_starred_items')
    .select('platform, external_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching starred item IDs:', error);
    return new Set();
  }

  return new Set(data.map((item) => `${item.platform}_${item.external_id}`));
}

// ==========================================
// GOOGLE TRENDS UTILITIES
// ==========================================

// Time range options for Google Trends
export const TRENDS_TIME_RANGES = [
  { value: 'now 1-H', label: 'Última hora' },
  { value: 'now 4-H', label: 'Últimas 4 horas' },
  { value: 'now 1-d', label: 'Último día' },
  { value: 'now 7-d', label: 'Últimos 7 días' },
  { value: 'today 1-m', label: 'Último mes' },
  { value: 'today 3-m', label: 'Últimos 3 meses' },
  { value: 'today 12-m', label: 'Último año' },
  { value: 'today 5-y', label: 'Últimos 5 años' },
];

// Generate Google Trends explore URL
export function getTrendsExploreUrl(
  keyword: string,
  geo: string = '',
  timeRange: string = 'today 12-m'
): string {
  // Google Trends URL format: date parameter needs space (encoded as %20)
  // Example: https://trends.google.com/trends/explore?q=marketing&date=today%2012-m&geo=US&hl=es
  const geoParam = geo ? `&geo=${geo}` : '';

  return `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&date=${encodeURIComponent(timeRange)}${geoParam}&hl=es`;
}

// Generate Google Trends embed widget config
export function getTrendsEmbedConfig(
  keyword: string,
  geo: string = '',
  timeRange: string = 'today 12-m'
): {
  timeSeriesUrl: string;
  geoMapUrl: string;
  relatedQueriesUrl: string;
  relatedTopicsUrl: string;
} {
  const baseConfig = {
    keyword,
    geo,
    time: timeRange,
  };

  const encodedKeyword = encodeURIComponent(keyword);
  const geoParam = geo ? `&geo=${geo}` : '';
  const timeParam = encodeURIComponent(timeRange);

  return {
    timeSeriesUrl: `https://trends.google.com/trends/embed/explore/TIMESERIES?q=${encodedKeyword}${geoParam}&date=${timeParam}&hl=es`,
    geoMapUrl: `https://trends.google.com/trends/embed/explore/GEO_MAP?q=${encodedKeyword}${geoParam}&date=${timeParam}&hl=es`,
    relatedQueriesUrl: `https://trends.google.com/trends/embed/explore/RELATED_QUERIES?q=${encodedKeyword}${geoParam}&date=${timeParam}&hl=es`,
    relatedTopicsUrl: `https://trends.google.com/trends/embed/explore/RELATED_TOPICS?q=${encodedKeyword}${geoParam}&date=${timeParam}&hl=es`,
  };
}

// Generate comparison URL for multiple keywords
export function getTrendsCompareUrl(
  keywords: string[],
  geo: string = '',
  timeRange: string = 'today 12-m'
): string {
  // Multiple keywords separated by comma
  const keywordsParam = keywords.map(k => encodeURIComponent(k)).join(',');
  const geoParam = geo ? `&geo=${geo}` : '';

  return `https://trends.google.com/trends/explore?q=${keywordsParam}&date=${encodeURIComponent(timeRange)}${geoParam}&hl=es`;
}

// Suggested trending categories for marketing research
export const TRENDING_CATEGORIES = [
  { name: 'Marketing Digital', keywords: ['marketing digital', 'social media marketing', 'email marketing', 'content marketing'] },
  { name: 'E-commerce', keywords: ['dropshipping', 'tienda online', 'shopify', 'amazon fba'] },
  { name: 'Fitness & Salud', keywords: ['fitness', 'gym', 'dieta', 'nutrición'] },
  { name: 'Belleza', keywords: ['skincare', 'maquillaje', 'facial', 'cuidado personal'] },
  { name: 'Finanzas', keywords: ['inversiones', 'trading', 'criptomonedas', 'ahorro'] },
  { name: 'Tecnología', keywords: ['inteligencia artificial', 'chatgpt', 'programación', 'apps'] },
  { name: 'Emprendimiento', keywords: ['emprendedor', 'negocio online', 'startup', 'freelance'] },
];

// ==========================================
// TIKTOK CREATIVE CENTER UTILITIES
// ==========================================

// TikTok Creative Center regions/countries
export const TIKTOK_REGIONS: { code: string; name: string }[] = [
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'BR', name: 'Brasil' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'DE', name: 'Alemania' },
  { code: 'FR', name: 'Francia' },
  { code: 'IT', name: 'Italia' },
  { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'MY', name: 'Malasia' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'SG', name: 'Singapur' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'AE', name: 'Emiratos Árabes' },
  { code: 'TR', name: 'Turquía' },
  { code: 'PL', name: 'Polonia' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'SE', name: 'Suecia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Suiza' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'EG', name: 'Egipto' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'IL', name: 'Israel' },
  { code: 'RU', name: 'Rusia' },
  { code: 'UA', name: 'Ucrania' },
];

// TikTok industries for Top Ads filter
export const TIKTOK_INDUSTRIES: { code: string; name: string }[] = [
  { code: '', name: 'Todas las industrias' },
  { code: 'app', name: 'Apps & Gaming' },
  { code: 'ecommerce', name: 'E-commerce' },
  { code: 'education', name: 'Educación' },
  { code: 'entertainment', name: 'Entretenimiento' },
  { code: 'fashion', name: 'Moda & Accesorios' },
  { code: 'finance', name: 'Finanzas' },
  { code: 'food', name: 'Comida & Bebida' },
  { code: 'games', name: 'Videojuegos' },
  { code: 'health', name: 'Salud & Fitness' },
  { code: 'home', name: 'Hogar & Jardín' },
  { code: 'beauty', name: 'Belleza & Cuidado Personal' },
  { code: 'pets', name: 'Mascotas' },
  { code: 'sports', name: 'Deportes' },
  { code: 'tech', name: 'Tecnología & Electrónica' },
  { code: 'travel', name: 'Viajes' },
  { code: 'vehicles', name: 'Vehículos' },
];

// TikTok ad objectives
export const TIKTOK_OBJECTIVES: { code: string; name: string }[] = [
  { code: '', name: 'Todos los objetivos' },
  { code: 'traffic', name: 'Tráfico' },
  { code: 'app_install', name: 'Instalación de App' },
  { code: 'conversions', name: 'Conversiones' },
  { code: 'video_views', name: 'Vistas de Video' },
  { code: 'reach', name: 'Alcance' },
  { code: 'lead_generation', name: 'Generación de Leads' },
];

// TikTok time periods for filters
export const TIKTOK_TIME_PERIODS: { code: string; name: string }[] = [
  { code: '7', name: 'Últimos 7 días' },
  { code: '30', name: 'Últimos 30 días' },
  { code: '180', name: 'Últimos 180 días' },
];

// TikTok likes filter ranges
export const TIKTOK_LIKES_RANGES: { code: string; name: string }[] = [
  { code: '', name: 'Todos' },
  { code: '1000', name: '1K+' },
  { code: '10000', name: '10K+' },
  { code: '100000', name: '100K+' },
  { code: '1000000', name: '1M+' },
];

/**
 * Generate TikTok Creative Center Top Ads URL
 * Shows top performing ads filtered by region, industry, objective, etc.
 */
export function getTikTokTopAdsUrl(
  region: string = 'US',
  industry: string = '',
  objective: string = '',
  period: string = '30',
  keyword: string = ''
): string {
  const params = new URLSearchParams();
  params.set('countryCode', region);
  params.set('period', period);
  if (industry) params.set('industry', industry);
  if (objective) params.set('objective', objective);
  if (keyword) params.set('keyword', keyword);

  return `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?${params.toString()}`;
}

/**
 * Generate TikTok Creative Center Trending Hashtags URL
 */
export function getTikTokTrendingHashtagsUrl(region: string = 'US'): string {
  return `https://ads.tiktok.com/business/creativecenter/trends/hashtag/pc/en?countryCode=${region}`;
}

/**
 * Generate TikTok Creative Center Trending Songs URL
 */
export function getTikTokTrendingSongsUrl(region: string = 'US'): string {
  return `https://ads.tiktok.com/business/creativecenter/trends/music/pc/en?countryCode=${region}`;
}

/**
 * Generate TikTok Creative Center Trending Creators URL
 */
export function getTikTokTrendingCreatorsUrl(region: string = 'US'): string {
  return `https://ads.tiktok.com/business/creativecenter/trends/creator/pc/en?countryCode=${region}`;
}

/**
 * Generate TikTok Creative Center Trending Videos URL
 */
export function getTikTokTrendingVideosUrl(region: string = 'US'): string {
  return `https://ads.tiktok.com/business/creativecenter/trends/video/pc/en?countryCode=${region}`;
}

/**
 * Generate TikTok Creative Center Keyword Insights URL
 */
export function getTikTokKeywordInsightsUrl(keyword: string = '', region: string = 'US'): string {
  // TikTok Keyword Insights uses a hash-based URL for the keyword
  const baseUrl = 'https://ads.tiktok.com/business/creativecenter/keyword-insights/pc/en';
  const params = new URLSearchParams();
  params.set('countryCode', region);

  if (keyword) {
    // Keyword insights requires the keyword in the URL
    params.set('keyword', keyword);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate TikTok Ads Library (Commercial Content Library) URL
 * For transparency - shows all running ads
 */
export function getTikTokAdsLibraryUrl(keyword: string = '', region: string = ''): string {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (region) params.set('region', region);

  return `https://library.tiktok.com/ads?${params.toString()}`;
}

/**
 * Generate TikTok Search URL - Opens TikTok with search results
 * @param keyword - Search term
 * @param type - 'video' | 'user' | 'live' | 'general'
 */
export function getTikTokSearchUrl(keyword: string, type: 'video' | 'user' | 'live' | 'general' = 'video'): string {
  const encodedKeyword = encodeURIComponent(keyword);
  if (type === 'general') {
    return `https://www.tiktok.com/search?q=${encodedKeyword}`;
  }
  return `https://www.tiktok.com/search/${type}?q=${encodedKeyword}`;
}

// TikTok suggested search keywords by category
export const TIKTOK_TRENDING_SUGGESTIONS = [
  { name: 'E-commerce', keywords: ['dropshipping', 'tienda online', 'amazon', 'shopify', 'temu', 'shein'] },
  { name: 'Fitness', keywords: ['workout', 'gym', 'fitness transformation', 'weight loss', 'yoga'] },
  { name: 'Belleza', keywords: ['skincare routine', 'makeup tutorial', 'grwm', 'hair care', 'glow up'] },
  { name: 'Finanzas', keywords: ['investing', 'crypto', 'side hustle', 'passive income', 'trading'] },
  { name: 'Comida', keywords: ['recipe', 'cooking', 'food hack', 'meal prep', 'asmr food'] },
  { name: 'Tech', keywords: ['iphone', 'gadgets', 'tech review', 'ai', 'apps'] },
  { name: 'Lifestyle', keywords: ['morning routine', 'productivity', 'apartment tour', 'day in my life', 'aesthetic'] },
  { name: 'Gaming', keywords: ['gaming setup', 'gameplay', 'fortnite', 'minecraft', 'roblox'] },
];

// ==========================================
// COMPETITOR TRACKER
// ==========================================

export interface CompetitorBrand {
  id: string;
  user_id: string;
  brand_name: string;
  meta_page_id: string | null;
  tiktok_username: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCompetitorInput {
  brand_name: string;
  meta_page_id?: string;
  tiktok_username?: string;
  notes?: string;
}

// ==========================================
// COMPETITOR ADS - Types & Constants
// ==========================================

export type AdCategory = 'ugc' | 'producto' | 'testimonial' | 'lifestyle' | 'promocion' | 'educativo' | 'otro';
export type AdPlatformType = 'meta' | 'tiktok' | 'google' | 'youtube' | 'instagram' | 'other';

export interface CompetitorAd {
  id: string;
  user_id: string;
  competitor_id: string;
  ad_url: string;
  thumbnail_url: string | null;
  description: string | null;
  platform: AdPlatformType;
  category: AdCategory;
  tags: string[];
  notes: string | null;
  saved_at: string;
  updated_at: string;
  competitor?: CompetitorBrand;
}

export interface CreateCompetitorAdInput {
  competitor_id: string;
  ad_url: string;
  thumbnail_url?: string;
  description?: string;
  platform?: AdPlatformType;
  category?: AdCategory;
  tags?: string[];
  notes?: string;
}

export interface UpdateCompetitorAdInput {
  thumbnail_url?: string;
  description?: string;
  platform?: AdPlatformType;
  category?: AdCategory;
  tags?: string[];
  notes?: string;
}

export interface CompetitorAdsStats {
  totalAds: number;
  adsByCompetitor: { competitor_id: string; brand_name: string; count: number }[];
  adsByCategory: { category: AdCategory; count: number }[];
  adsByPlatform: { platform: AdPlatformType; count: number }[];
  adsByMonth: { month: string; count: number }[];
}

export const AD_CATEGORIES: { value: AdCategory; label: string; icon: string; color: string }[] = [
  { value: 'ugc', label: 'UGC', icon: 'person_video', color: 'text-purple-400' },
  { value: 'producto', label: 'Producto', icon: 'shopping_bag', color: 'text-blue-400' },
  { value: 'testimonial', label: 'Testimonial', icon: 'format_quote', color: 'text-green-400' },
  { value: 'lifestyle', label: 'Lifestyle', icon: 'self_improvement', color: 'text-pink-400' },
  { value: 'promocion', label: 'Promoción', icon: 'local_offer', color: 'text-red-400' },
  { value: 'educativo', label: 'Educativo', icon: 'school', color: 'text-yellow-400' },
  { value: 'otro', label: 'Otro', icon: 'category', color: 'text-gray-400' },
];

export const AD_PLATFORMS: { value: AdPlatformType; label: string; icon: string; color: string }[] = [
  { value: 'meta', label: 'Meta', icon: 'campaign', color: 'text-blue-400' },
  { value: 'tiktok', label: 'TikTok', icon: 'music_note', color: 'text-pink-400' },
  { value: 'google', label: 'Google', icon: 'ads_click', color: 'text-green-400' },
  { value: 'youtube', label: 'YouTube', icon: 'smart_display', color: 'text-red-400' },
  { value: 'instagram', label: 'Instagram', icon: 'photo_camera', color: 'text-purple-400' },
  { value: 'other', label: 'Otro', icon: 'language', color: 'text-gray-400' },
];

/**
 * Get all competitors for a user
 */
export async function getCompetitors(userId: string): Promise<CompetitorBrand[]> {
  const { data, error } = await supabase
    .from('competitor_brands')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching competitors:', error);
    return [];
  }

  return data as CompetitorBrand[];
}

/**
 * Add a new competitor
 */
export async function addCompetitor(
  userId: string,
  input: CreateCompetitorInput
): Promise<{ success: boolean; data?: CompetitorBrand; error?: string }> {
  const { data, error } = await supabase
    .from('competitor_brands')
    .insert({
      user_id: userId,
      brand_name: input.brand_name,
      meta_page_id: input.meta_page_id || null,
      tiktok_username: input.tiktok_username || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding competitor:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as CompetitorBrand };
}

/**
 * Update a competitor
 */
export async function updateCompetitor(
  competitorId: string,
  userId: string,
  input: Partial<CreateCompetitorInput>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('competitor_brands')
    .update({
      brand_name: input.brand_name,
      meta_page_id: input.meta_page_id,
      tiktok_username: input.tiktok_username,
      notes: input.notes,
    })
    .eq('id', competitorId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating competitor:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a competitor
 */
export async function deleteCompetitor(
  competitorId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('competitor_brands')
    .delete()
    .eq('id', competitorId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting competitor:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ==========================================
// COMPETITOR AD LIBRARY URLS
// ==========================================

/**
 * Generate Meta Ads Library search URL for a brand
 */
export function getMetaAdsLibraryUrl(brandName: string, country: string = ''): string {
  const params = new URLSearchParams();
  params.set('active_status', 'active');
  params.set('ad_type', 'all');
  params.set('q', brandName);
  if (country) params.set('country', country);

  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/**
 * Generate TikTok Commercial Content Library search URL for a brand
 */
export function getTikTokCommercialLibraryUrl(brandName: string, region: string = ''): string {
  const params = new URLSearchParams();
  params.set('keyword', brandName);
  if (region) params.set('region', region);

  return `https://library.tiktok.com/ads?${params.toString()}`;
}

/**
 * Generate Google Ads Transparency Center search URL for a brand
 */
export function getGoogleAdsTransparencyUrl(brandName: string): string {
  return `https://adstransparency.google.com/?search=${encodeURIComponent(brandName)}`;
}

/**
 * Generate all ad library URLs for a competitor
 */
export function getCompetitorAdLibraryUrls(brandName: string): {
  meta: string;
  tiktok: string;
  google: string;
} {
  return {
    meta: getMetaAdsLibraryUrl(brandName),
    tiktok: getTikTokCommercialLibraryUrl(brandName),
    google: getGoogleAdsTransparencyUrl(brandName),
  };
}

// ==========================================
// COMPETITOR ADS - CRUD Operations
// ==========================================

/**
 * Detect platform from ad URL
 */
export function detectPlatformFromUrl(url: string): AdPlatformType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com') || lowerUrl.includes('meta.com')) {
    return 'meta';
  }
  if (lowerUrl.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('instagram.com')) {
    return 'instagram';
  }
  if (lowerUrl.includes('google.com') || lowerUrl.includes('adstransparency')) {
    return 'google';
  }
  return 'other';
}

/**
 * Get all competitor ads for a user with optional filters
 */
export async function getCompetitorAds(
  userId: string,
  filters?: {
    competitorId?: string;
    category?: AdCategory;
    platform?: AdPlatformType;
  }
): Promise<CompetitorAd[]> {
  let query = supabase
    .from('competitor_ads')
    .select(`
      *,
      competitor:competitor_brands(id, brand_name)
    `)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (filters?.competitorId) {
    query = query.eq('competitor_id', filters.competitorId);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.platform) {
    query = query.eq('platform', filters.platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching competitor ads:', error);
    return [];
  }

  return data as CompetitorAd[];
}

/**
 * Add a new competitor ad
 */
export async function addCompetitorAd(
  userId: string,
  input: CreateCompetitorAdInput
): Promise<{ success: boolean; data?: CompetitorAd; error?: string }> {
  const detectedPlatform = input.platform || detectPlatformFromUrl(input.ad_url);

  const { data, error } = await supabase
    .from('competitor_ads')
    .insert({
      user_id: userId,
      competitor_id: input.competitor_id,
      ad_url: input.ad_url,
      thumbnail_url: input.thumbnail_url || null,
      description: input.description || null,
      platform: detectedPlatform,
      category: input.category || 'otro',
      tags: input.tags || [],
      notes: input.notes || null,
    })
    .select(`
      *,
      competitor:competitor_brands(id, brand_name)
    `)
    .single();

  if (error) {
    console.error('Error adding competitor ad:', error);
    if (error.code === '23505') {
      return { success: false, error: 'Este anuncio ya está guardado' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data: data as CompetitorAd };
}

/**
 * Update a competitor ad
 */
export async function updateCompetitorAd(
  adId: string,
  userId: string,
  input: UpdateCompetitorAdInput
): Promise<{ success: boolean; error?: string }> {
  const updateData: any = {};
  if (input.thumbnail_url !== undefined) updateData.thumbnail_url = input.thumbnail_url;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.platform !== undefined) updateData.platform = input.platform;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { error } = await supabase
    .from('competitor_ads')
    .update(updateData)
    .eq('id', adId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating competitor ad:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a competitor ad
 */
export async function deleteCompetitorAd(
  adId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('competitor_ads')
    .delete()
    .eq('id', adId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting competitor ad:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get statistics for competitor ads dashboard
 */
export async function getCompetitorAdsStats(userId: string): Promise<CompetitorAdsStats> {
  const { data: ads, error } = await supabase
    .from('competitor_ads')
    .select(`
      id, category, platform, saved_at,
      competitor:competitor_brands(id, brand_name)
    `)
    .eq('user_id', userId);

  if (error || !ads) {
    console.error('Error fetching competitor ads stats:', error);
    return {
      totalAds: 0,
      adsByCompetitor: [],
      adsByCategory: [],
      adsByPlatform: [],
      adsByMonth: [],
    };
  }

  const totalAds = ads.length;

  // Ads by competitor
  const competitorMap = new Map<string, { brand_name: string; count: number }>();
  ads.forEach((ad: any) => {
    const comp = ad.competitor;
    if (comp) {
      const existing = competitorMap.get(comp.id) || { brand_name: comp.brand_name, count: 0 };
      existing.count++;
      competitorMap.set(comp.id, existing);
    }
  });
  const adsByCompetitor = Array.from(competitorMap.entries())
    .map(([competitor_id, data]) => ({ competitor_id, ...data }))
    .sort((a, b) => b.count - a.count);

  // Ads by category
  const categoryMap = new Map<AdCategory, number>();
  ads.forEach((ad: any) => {
    categoryMap.set(ad.category, (categoryMap.get(ad.category) || 0) + 1);
  });
  const adsByCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Ads by platform
  const platformMap = new Map<AdPlatformType, number>();
  ads.forEach((ad: any) => {
    platformMap.set(ad.platform, (platformMap.get(ad.platform) || 0) + 1);
  });
  const adsByPlatform = Array.from(platformMap.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // Ads by month (last 6 months)
  const monthMap = new Map<string, number>();
  ads.forEach((ad: any) => {
    const date = new Date(ad.saved_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
  });
  const adsByMonth = Array.from(monthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  return {
    totalAds,
    adsByCompetitor,
    adsByCategory,
    adsByPlatform,
    adsByMonth,
  };
}
