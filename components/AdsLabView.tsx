import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { springConfig, buttonTap } from '../lib/animations';
import {
  Platform,
  PlatformStatus,
  CreativeItem,
  searchPlatform,
  starCreative,
  unstarCreative,
  getStarredItems,
  getStarredItemIds,
  ENABLED_PLATFORMS,
  MetaAdsFilters,
  META_ADS_COUNTRIES,
  META_ADS_LANGUAGES,
  DEFAULT_META_FILTERS,
  YouTubeFilters,
  DEFAULT_YOUTUBE_FILTERS,
  // Google Trends
  TRENDS_REGIONS,
  TRENDS_TIME_RANGES,
  TRENDING_CATEGORIES,
  getTrendsExploreUrl,
  getTrendsCompareUrl,
  // TikTok Creative Center
  TIKTOK_REGIONS,
  TIKTOK_INDUSTRIES,
  TIKTOK_OBJECTIVES,
  TIKTOK_TIME_PERIODS,
  TIKTOK_TRENDING_SUGGESTIONS,
  getTikTokTopAdsUrl,
  getTikTokTrendingHashtagsUrl,
  getTikTokTrendingSongsUrl,
  getTikTokTrendingCreatorsUrl,
  getTikTokTrendingVideosUrl,
  getTikTokKeywordInsightsUrl,
  getTikTokAdsLibraryUrl,
  getTikTokSearchUrl,
  // Competitor Tracker
  CompetitorBrand,
  getCompetitors,
  addCompetitor,
  deleteCompetitor,
  getMetaAdsLibraryUrl,
  getTikTokCommercialLibraryUrl,
  getGoogleAdsTransparencyUrl,
  // Competitor Ads
  CompetitorAd,
  CompetitorAdsStats,
  AdCategory,
  AdPlatformType,
  AD_CATEGORIES,
  AD_PLATFORMS,
  getCompetitorAds,
  addCompetitorAd,
  deleteCompetitorAd,
  getCompetitorAdsStats,
  detectPlatformFromUrl,
} from '../lib/adsLabService';
import {
  AdPlatform,
  CopyStyle,
  CopyLanguage,
  GenerateCopyResponse,
  AD_PLATFORMS as AI_AD_PLATFORMS,
  COPY_STYLES,
  COPY_LANGUAGES,
  generateAdCopy,
  copyToClipboard,
} from '../lib/aiCopyService';

interface AdsLabViewProps {
  currentUser: any;
}

type ViewMode = 'table' | 'cards';
type PlatformFilter = 'all' | Platform;
type ContentMode = 'search' | 'starred' | 'trends' | 'tiktok' | 'competitors' | 'ai';

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  meta: { label: 'Meta Ads', icon: 'campaign', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  tiktok: { label: 'TikTok', icon: 'music_note', color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  youtube: { label: 'YouTube', icon: 'smart_display', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  instagram: { label: 'Instagram', icon: 'photo_camera', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Moved outside component to prevent re-render flickering
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
      <span className="material-icons-round text-5xl text-primary">science</span>
    </div>
    <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2 justify-center">
      Ads Lab
      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium">BETA</span>
    </h3>
    <p className="text-muted-dark max-w-md mb-6">
      Busca creativos de Meta Ads y YouTube Shorts. Ingresa una palabra clave y presiona "Buscar" para comenzar.
    </p>
    <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-dark">
      <span className="px-3 py-1 bg-white/5 rounded-full">marketing</span>
      <span className="px-3 py-1 bg-white/5 rounded-full">fitness</span>
      <span className="px-3 py-1 bg-white/5 rounded-full">ecommerce</span>
      <span className="px-3 py-1 bg-white/5 rounded-full">emprendedor</span>
    </div>
  </div>
);

const AdsLabView: React.FC<AdsLabViewProps> = ({ currentUser }) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CreativeItem[]>([]);
  const [platformProgress, setPlatformProgress] = useState<Record<Platform, PlatformStatus>>({
    tiktok: 'idle',
    instagram: 'idle',
    youtube: 'idle',
    meta: 'idle',
  });
  const [platformCounts, setPlatformCounts] = useState<Record<Platform, number>>({
    tiktok: 0,
    instagram: 0,
    youtube: 0,
    meta: 0,
  });

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [contentMode, setContentMode] = useState<ContentMode>('search');
  const [sortBy, setSortBy] = useState<'view_count' | 'like_count' | 'published_at'>('view_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Starred state
  const [starredItems, setStarredItems] = useState<CreativeItem[]>([]);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [loadingStars, setLoadingStars] = useState<Set<string>>(new Set());

  // Meta Ads filters
  const [metaFilters, setMetaFilters] = useState<MetaAdsFilters>(DEFAULT_META_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // YouTube filters
  const [youtubeFilters, setYoutubeFilters] = useState<YouTubeFilters>(DEFAULT_YOUTUBE_FILTERS);

  // Viral ads filter (Meta only)
  const [showOnlyViral, setShowOnlyViral] = useState(false);

  // Google Trends state
  const [trendsKeyword, setTrendsKeyword] = useState('');
  const [trendsRegion, setTrendsRegion] = useState('');
  const [trendsTimeRange, setTrendsTimeRange] = useState('today 12-m');
  const [compareKeywords, setCompareKeywords] = useState<string[]>([]);
  const [newCompareKeyword, setNewCompareKeyword] = useState('');

  // TikTok Creative Center state
  const [tiktokRegion, setTiktokRegion] = useState('US');
  const [tiktokIndustry, setTiktokIndustry] = useState('');
  const [tiktokObjective, setTiktokObjective] = useState('');
  const [tiktokPeriod, setTiktokPeriod] = useState('30');
  const [tiktokKeyword, setTiktokKeyword] = useState('');
  const [tiktokSearchQuery, setTiktokSearchQuery] = useState('');
  const [tiktokSearchType, setTiktokSearchType] = useState<'video' | 'user' | 'live' | 'general'>('video');
  const [tiktokTopAdsKeyword, setTiktokTopAdsKeyword] = useState('');

  // TikTok Direct Search fallback state
  const [tiktokFallbackLinks, setTiktokFallbackLinks] = useState<Record<string, string> | null>(null);
  const [tiktokFallbackMessage, setTiktokFallbackMessage] = useState<string | null>(null);

  // Competitor Tracker state
  const [competitors, setCompetitors] = useState<CompetitorBrand[]>([]);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [newCompetitorNotes, setNewCompetitorNotes] = useState('');
  const [newCompetitorTikTok, setNewCompetitorTikTok] = useState('');
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [showAddCompetitorForm, setShowAddCompetitorForm] = useState(false);

  // Competitor Ads state
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [competitorAdsStats, setCompetitorAdsStats] = useState<CompetitorAdsStats | null>(null);
  const [competitorView, setCompetitorView] = useState<'list' | 'ads' | 'analytics'>('list');
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [showAddAdForm, setShowAddAdForm] = useState(false);

  // Add ad form state
  const [newAdCompetitorId, setNewAdCompetitorId] = useState('');
  const [newAdUrl, setNewAdUrl] = useState('');
  const [newAdThumbnail, setNewAdThumbnail] = useState('');
  const [newAdDescription, setNewAdDescription] = useState('');
  const [newAdCategory, setNewAdCategory] = useState<AdCategory>('otro');
  const [newAdNotes, setNewAdNotes] = useState('');
  const [isAddingAd, setIsAddingAd] = useState(false);

  // Ads gallery filters
  const [adsFilterCompetitor, setAdsFilterCompetitor] = useState<string>('all');
  const [adsFilterCategory, setAdsFilterCategory] = useState<AdCategory | 'all'>('all');

  // AI Copy Generator state
  const [aiDescription, setAiDescription] = useState('');
  const [aiPlatform, setAiPlatform] = useState<AdPlatform>('tiktok');
  const [aiStyle, setAiStyle] = useState<CopyStyle>('viral');
  const [aiLanguage, setAiLanguage] = useState<CopyLanguage>('es');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<GenerateCopyResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Load starred items and competitors on mount
  useEffect(() => {
    if (currentUser?.id) {
      loadStarredItems();
      loadCompetitors();
    }
  }, [currentUser?.id]);

  const loadStarredItems = async () => {
    if (!currentUser?.id) return;
    const items = await getStarredItems(currentUser.id);
    setStarredItems(items as CreativeItem[]);
    const ids = await getStarredItemIds(currentUser.id);
    setStarredIds(ids);
  };

  const loadCompetitors = async () => {
    if (!currentUser?.id) return;
    const items = await getCompetitors(currentUser.id);
    setCompetitors(items);
  };

  const handleAddCompetitor = async () => {
    if (!currentUser?.id || !newCompetitorName.trim()) return;
    setIsAddingCompetitor(true);
    const result = await addCompetitor(currentUser.id, {
      brand_name: newCompetitorName.trim(),
      notes: newCompetitorNotes.trim() || undefined,
      tiktok_username: newCompetitorTikTok.trim().replace('@', '') || undefined,
    });
    if (result.success && result.data) {
      setCompetitors([result.data, ...competitors]);
      setNewCompetitorName('');
      setNewCompetitorNotes('');
      setNewCompetitorTikTok('');
      setShowAddCompetitorForm(false);
    }
    setIsAddingCompetitor(false);
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    if (!currentUser?.id) return;
    const result = await deleteCompetitor(competitorId, currentUser.id);
    if (result.success) {
      setCompetitors(competitors.filter(c => c.id !== competitorId));
    }
  };

  // Competitor Ads handlers
  const loadCompetitorAds = async () => {
    if (!currentUser?.id) return;
    setIsLoadingAds(true);

    const filters: { competitorId?: string; category?: AdCategory } = {};
    if (adsFilterCompetitor !== 'all') filters.competitorId = adsFilterCompetitor;
    if (adsFilterCategory !== 'all') filters.category = adsFilterCategory;

    const ads = await getCompetitorAds(currentUser.id, Object.keys(filters).length ? filters : undefined);
    setCompetitorAds(ads);

    const stats = await getCompetitorAdsStats(currentUser.id);
    setCompetitorAdsStats(stats);

    setIsLoadingAds(false);
  };

  const handleAddCompetitorAd = async () => {
    if (!currentUser?.id || !newAdCompetitorId || !newAdUrl.trim()) return;
    setIsAddingAd(true);

    const result = await addCompetitorAd(currentUser.id, {
      competitor_id: newAdCompetitorId,
      ad_url: newAdUrl.trim(),
      thumbnail_url: newAdThumbnail.trim() || undefined,
      description: newAdDescription.trim() || undefined,
      category: newAdCategory,
      notes: newAdNotes.trim() || undefined,
    });

    if (result.success && result.data) {
      setCompetitorAds([result.data, ...competitorAds]);
      // Reset form
      setNewAdUrl('');
      setNewAdThumbnail('');
      setNewAdDescription('');
      setNewAdCategory('otro');
      setNewAdNotes('');
      setShowAddAdForm(false);
      // Reload stats
      loadCompetitorAds();
    }

    setIsAddingAd(false);
  };

  const handleDeleteCompetitorAd = async (adId: string) => {
    if (!currentUser?.id) return;
    const result = await deleteCompetitorAd(adId, currentUser.id);
    if (result.success) {
      setCompetitorAds(competitorAds.filter(ad => ad.id !== adId));
      loadCompetitorAds(); // Reload stats
    }
  };

  // Load competitor ads when view changes to ads or analytics
  useEffect(() => {
    if (contentMode === 'competitors' && (competitorView === 'ads' || competitorView === 'analytics')) {
      loadCompetitorAds();
    }
  }, [contentMode, competitorView, adsFilterCompetitor, adsFilterCategory]);

  const handleGenerateCopy = async () => {
    if (!aiDescription.trim()) return;
    setIsGenerating(true);
    setAiError(null);
    setAiResult(null);

    const result = await generateAdCopy({
      description: aiDescription.trim(),
      platform: aiPlatform,
      style: aiStyle,
      language: aiLanguage,
    });

    if (result.success && result.data) {
      setAiResult(result.data);
    } else {
      setAiError(result.error || 'Error al generar copy');
    }
    setIsGenerating(false);
  };

  const handleCopyText = async (text: string, itemId: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchResults([]);
    setTiktokFallbackLinks(null);
    setTiktokFallbackMessage(null);
    setPlatformProgress({
      tiktok: 'loading',
      instagram: 'loading',
      youtube: 'loading',
      meta: 'loading',
    });
    setPlatformCounts({
      tiktok: 0,
      instagram: 0,
      youtube: 0,
      meta: 0,
    });

    // Only search enabled platforms
    const platforms = ENABLED_PLATFORMS;

    // Search each platform in parallel
    const promises = platforms.map(async (platform) => {
      try {
        const result = await searchPlatform(
          platform,
          searchQuery.trim(),
          (status) => {
            setPlatformProgress((prev) => ({ ...prev, [platform]: status }));
          },
          platform === 'meta' ? metaFilters : undefined,
          platform === 'youtube' ? youtubeFilters : undefined
        );

        if (result.items.length > 0) {
          setSearchResults((prev) => [...prev, ...result.items]);
          setPlatformCounts((prev) => ({ ...prev, [platform]: result.items.length }));
        }

        // Handle TikTok fallback links
        if (platform === 'tiktok' && result.fallbackLinks) {
          setTiktokFallbackLinks(result.fallbackLinks);
          setTiktokFallbackMessage(result.fallbackMessage || null);
        }

        return result;
      } catch (error) {
        console.error(`Error searching ${platform}:`, error);
        setPlatformProgress((prev) => ({ ...prev, [platform]: 'error' }));
        return { platform, items: [], count: 0 };
      }
    });

    await Promise.all(promises);
    setIsSearching(false);
  };

  // Handle star toggle
  const handleStarToggle = async (item: CreativeItem) => {
    if (!currentUser?.id) return;

    const itemKey = `${item.platform}_${item.external_id}`;
    setLoadingStars((prev) => new Set(prev).add(itemKey));

    const isCurrentlyStarred = starredIds.has(itemKey);

    if (isCurrentlyStarred) {
      const result = await unstarCreative(currentUser.id, item.platform, item.external_id);
      if (result.success) {
        setStarredIds((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
        setStarredItems((prev) => prev.filter((i) => `${i.platform}_${i.external_id}` !== itemKey));
      }
    } else {
      const result = await starCreative(item, currentUser.id, searchQuery);
      if (result.success) {
        setStarredIds((prev) => new Set(prev).add(itemKey));
        setStarredItems((prev) => [item, ...prev]);
      }
    }

    setLoadingStars((prev) => {
      const next = new Set(prev);
      next.delete(itemKey);
      return next;
    });
  };

  // Get items to display based on mode
  const displayItems = useMemo(() => {
    const items = contentMode === 'starred' ? starredItems : searchResults;
    let filtered = [...items];

    // Platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter((item) => item.platform === platformFilter);
    }

    // Viral filter (Meta Ads only)
    if (showOnlyViral) {
      filtered = filtered.filter((item) => item.isViral === true);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy] ?? 0;
      let bVal = b[sortBy] ?? 0;

      if (sortBy === 'published_at') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      }

      return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    return filtered;
  }, [contentMode, starredItems, searchResults, platformFilter, sortBy, sortOrder, showOnlyViral]);

  // Stats
  const stats = useMemo(() => {
    const items = contentMode === 'starred' ? starredItems : searchResults;
    return {
      total: items.length,
      meta: items.filter((i) => i.platform === 'meta').length,
      tiktok: items.filter((i) => i.platform === 'tiktok').length,
      youtube: items.filter((i) => i.platform === 'youtube').length,
      instagram: items.filter((i) => i.platform === 'instagram').length,
    };
  }, [contentMode, starredItems, searchResults]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Platform progress indicator (only show enabled platforms)
  const ProgressIndicator = () => (
    <div className="flex items-center gap-4 p-4 glass rounded-xl">
      {ENABLED_PLATFORMS.map((platform) => {
        const status = platformProgress[platform];
        const count = platformCounts[platform];
        const config = PLATFORM_CONFIG[platform];

        return (
          <div key={platform} className="flex items-center gap-2">
            {status === 'loading' && (
              <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin text-primary" />
            )}
            {status === 'done' && (
              <span className="material-icons-round text-lg text-green-400">check_circle</span>
            )}
            {status === 'error' && (
              <span className="material-icons-round text-lg text-red-400">error</span>
            )}
            {status === 'idle' && <span className="material-icons-round text-lg text-muted-dark">pending</span>}
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label} {count > 0 && `(${count})`}
            </span>
          </div>
        );
      })}
    </div>
  );

  // Platform badge component
  const PlatformBadge = ({ platform }: { platform: string }) => {
    const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.meta;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
      >
        <span className="material-icons-round text-sm">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Star button component
  const StarButton = ({ item }: { item: CreativeItem }) => {
    const itemKey = `${item.platform}_${item.external_id}`;
    const isStarred = starredIds.has(itemKey);
    const isLoading = loadingStars.has(itemKey);

    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleStarToggle(item);
        }}
        disabled={isLoading}
        className={`p-1.5 rounded-lg transition-colors ${
          isStarred
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white'
        }`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
        ) : (
          <span className="material-icons-round text-lg">{isStarred ? 'star' : 'star_outline'}</span>
        )}
      </motion.button>
    );
  };

  // Card view item
  const CardItem: React.FC<{ item: CreativeItem }> = ({ item }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl overflow-hidden group"
    >
      {/* Thumbnail */}
      <a
        href={item.post_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-video bg-white/5 relative overflow-hidden cursor-pointer"
      >
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.caption || 'Creative'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : item.platform === 'meta' ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600/20 to-blue-400/10">
            <span className="material-icons-round text-5xl text-blue-400 mb-2">campaign</span>
            <span className="text-xs text-blue-300/80 font-medium">Ver en Ads Library</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-icons-round text-4xl text-muted-dark">image</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <PlatformBadge platform={item.platform} />
          {item.isViral && (
            <span className="px-2 py-0.5 bg-orange-500/30 text-orange-300 rounded-full text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
              <span className="material-icons-round text-xs">local_fire_department</span>
              {item.repetition_count}x
            </span>
          )}
        </div>
        {item.is_ad && (
          <span className="absolute top-2 right-10 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
            Ad
          </span>
        )}
        <div className="absolute top-2 right-2">
          <StarButton item={item} />
        </div>
      </a>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-white truncate">
            {item.creator_username || item.creator_display_name || 'Unknown'}
          </span>
        </div>
        <p className="text-sm text-muted-dark line-clamp-2 mb-3">{item.caption || 'Sin descripción'}</p>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-xs text-muted-dark">
          {item.view_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-icons-round text-sm">visibility</span>
              {formatNumber(item.view_count)}
            </span>
          )}
          {item.like_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-icons-round text-sm">favorite</span>
              {formatNumber(item.like_count)}
            </span>
          )}
          {item.comment_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-icons-round text-sm">chat_bubble</span>
              {formatNumber(item.comment_count)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Beta Banner */}
      <div className="glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10">
        <div className="flex items-start gap-3">
          <span className="material-icons-round text-amber-400 text-xl mt-0.5">construction</span>
          <div>
            <p className="text-amber-400 font-semibold flex items-center gap-2">
              Fase Beta
              <span className="px-2 py-0.5 bg-amber-500/20 rounded-full text-xs">En construcción</span>
            </p>
            <p className="text-muted-dark text-sm mt-1">
              Esta sección está en fase de desarrollo y todavía no está lista para su uso completo.
              Muy pronto estará disponible con todas las funcionalidades.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="material-icons-round text-3xl text-primary">science</span>
            Ads Lab
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium">BETA</span>
          </h1>
          <p className="text-muted-dark mt-1">Investigación de creativos y tendencias publicitarias</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Content mode toggle */}
          <div className="flex items-center bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setContentMode('search')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                contentMode === 'search' ? 'bg-primary/20 text-primary' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">search</span>
              Búsqueda
            </button>
            <button
              onClick={() => setContentMode('trends')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                contentMode === 'trends' ? 'bg-primary/20 text-primary' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">trending_up</span>
              Trends
            </button>
            <button
              onClick={() => setContentMode('tiktok')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                contentMode === 'tiktok' ? 'bg-pink-500/20 text-pink-400' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">music_note</span>
              TikTok
            </button>
            <button
              onClick={() => setContentMode('ai')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                contentMode === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">auto_awesome</span>
              AI Generator
            </button>
            <button
              onClick={() => setContentMode('competitors')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                contentMode === 'competitors' ? 'bg-orange-500/20 text-orange-400' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">groups</span>
              Competidores
            </button>
            <button
              onClick={() => setContentMode('starred')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                contentMode === 'starred' ? 'bg-primary/20 text-primary' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">star</span>
              Guardados ({starredItems.length})
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-primary/20 text-primary' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">table_rows</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-primary/20 text-primary' : 'text-muted-dark hover:text-white'
              }`}
            >
              <span className="material-icons-round text-lg">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {contentMode === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-muted-dark">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por palabra clave, hashtag, categoría..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                disabled={isSearching}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                showFilters ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-dark hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-icons-round">tune</span>
              Filtros
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={buttonTap}
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <span className="material-icons-round">search</span>
                  Buscar
                </>
              )}
            </motion.button>
          </div>

          {/* Meta Ads Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass rounded-xl p-4 space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                  <span className="material-icons-round text-lg">campaign</span>
                  <span className="font-medium">Filtros de Meta Ads</span>
                </div>

                {/* Countries */}
                <div>
                  <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                    Países (selecciona uno o más)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {META_ADS_COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => {
                          setMetaFilters((prev) => ({
                            ...prev,
                            countries: prev.countries.includes(country.code)
                              ? prev.countries.filter((c) => c !== country.code)
                              : [...prev.countries, country.code],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          metaFilters.countries.includes(country.code)
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        {country.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ad Status, Media Type & Language */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                      Estado del anuncio
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'ACTIVE', label: 'Activos' },
                        { value: 'INACTIVE', label: 'Inactivos' },
                        { value: 'ALL', label: 'Todos' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            setMetaFilters((prev) => ({
                              ...prev,
                              adStatus: option.value as MetaAdsFilters['adStatus'],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            metaFilters.adStatus === option.value
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                      Tipo de medio
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'ALL', label: 'Todos' },
                        { value: 'IMAGE', label: 'Imagen' },
                        { value: 'VIDEO', label: 'Video' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            setMetaFilters((prev) => ({
                              ...prev,
                              mediaType: option.value as MetaAdsFilters['mediaType'],
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            metaFilters.mediaType === option.value
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                      Idioma
                    </label>
                    <select
                      value={metaFilters.language}
                      onChange={(e) =>
                        setMetaFilters((prev) => ({ ...prev, language: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      {META_ADS_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Meta Strict Match Toggle */}
                <div className="mt-3 flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-round text-orange-400 text-lg">filter_alt</span>
                    <div>
                      <p className="text-sm text-white font-medium">Solo con keyword exacto</p>
                      <p className="text-xs text-muted-dark">Muestra solo anuncios que contengan la palabra buscada</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setMetaFilters((prev) => ({ ...prev, strictMatch: !prev.strictMatch }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      metaFilters.strictMatch ? 'bg-green-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        metaFilters.strictMatch ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Viral Ads Toggle */}
                <div className="mt-2 flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <span className="material-icons-round text-orange-400 text-lg">local_fire_department</span>
                    <div>
                      <p className="text-sm text-white font-medium">Solo anuncios virales</p>
                      <p className="text-xs text-muted-dark">Muestra ads que se repiten 3+ veces (probablemente funcionan)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOnlyViral(!showOnlyViral)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      showOnlyViral ? 'bg-orange-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        showOnlyViral ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Meta Summary */}
                <div className="text-xs text-muted-dark pt-2 border-t border-white/10 mt-3">
                  <span className="text-blue-400 font-medium">Meta:</span> {metaFilters.countries.length} país(es) |
                  {metaFilters.adStatus === 'ACTIVE' ? ' Activos' : metaFilters.adStatus === 'INACTIVE' ? ' Inactivos' : ' Todos'} |
                  {metaFilters.mediaType === 'ALL' ? ' Todo tipo' : ` ${metaFilters.mediaType}`} |
                  {' '}{META_ADS_LANGUAGES.find(l => l.code === metaFilters.language)?.name || 'Todos'} |
                  {metaFilters.strictMatch ? ' Solo exactos' : ' Todos'}
                </div>

                {/* YouTube Filters */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
                    <span className="material-icons-round text-lg">smart_display</span>
                    <span className="font-medium">Filtros de YouTube</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Country */}
                    <div>
                      <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                        País
                      </label>
                      <select
                        value={youtubeFilters.country}
                        onChange={(e) => setYoutubeFilters((prev) => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      >
                        {META_ADS_COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code} className="bg-gray-900">
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Order By */}
                    <div>
                      <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                        Ordenar por
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'relevance', label: 'Relevancia' },
                          { value: 'viewCount', label: 'Vistas' },
                          { value: 'date', label: 'Fecha' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() =>
                              setYoutubeFilters((prev) => ({
                                ...prev,
                                orderBy: option.value as YouTubeFilters['orderBy'],
                              }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              youtubeFilters.orderBy === option.value
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white border border-transparent'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Strict Match Toggle */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-muted-dark uppercase tracking-wider mb-1">Keyword exacto</p>
                        <p className="text-xs text-muted-dark">Solo títulos con la palabra</p>
                      </div>
                      <button
                        onClick={() =>
                          setYoutubeFilters((prev) => ({ ...prev, strictMatch: !prev.strictMatch }))
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          youtubeFilters.strictMatch ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            youtubeFilters.strictMatch ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* YouTube Summary */}
                  <div className="text-xs text-muted-dark pt-2 mt-3 border-t border-white/5">
                    <span className="text-red-400 font-medium">YouTube:</span> {META_ADS_COUNTRIES.find(c => c.code === youtubeFilters.country)?.name} |
                    {youtubeFilters.orderBy === 'relevance' ? ' Por relevancia' : youtubeFilters.orderBy === 'viewCount' ? ' Por vistas' : ' Por fecha'} |
                    {youtubeFilters.strictMatch ? ' Solo exactos' : ' Todos'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Google Trends Section */}
      {contentMode === 'trends' && (
        <div className="space-y-6">
          {/* Search and Open Trends */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                <span className="material-icons-round text-2xl text-white">trending_up</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Google Trends</h3>
                <p className="text-sm text-muted-dark">Analiza tendencias de búsqueda en tiempo real</p>
              </div>
            </div>

            {/* Single keyword search */}
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  value={trendsKeyword}
                  onChange={(e) => setTrendsKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && trendsKeyword.trim()) {
                      window.open(getTrendsExploreUrl(trendsKeyword, trendsRegion, trendsTimeRange), '_blank');
                    }
                  }}
                  placeholder="Escribe un keyword y presiona Enter..."
                  className="flex-1 min-w-[250px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                />
                <select
                  value={trendsRegion}
                  onChange={(e) => setTrendsRegion(e.target.value)}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {TRENDS_REGIONS.map((region) => (
                    <option key={region.code} value={region.code} className="bg-gray-900">
                      {region.name}
                    </option>
                  ))}
                </select>
                <select
                  value={trendsTimeRange}
                  onChange={(e) => setTrendsTimeRange(e.target.value)}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {TRENDS_TIME_RANGES.map((range) => (
                    <option key={range.value} value={range.value} className="bg-gray-900">
                      {range.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (trendsKeyword.trim()) {
                      window.open(getTrendsExploreUrl(trendsKeyword, trendsRegion, trendsTimeRange), '_blank');
                    }
                  }}
                  disabled={!trendsKeyword.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  <span className="material-icons-round">open_in_new</span>
                  Ver Tendencia
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-muted-dark mr-2">Sugerencias:</span>
                {['marketing digital', 'fitness', 'skincare', 'dropshipping', 'inteligencia artificial', 'emprendimiento'].map((kw) => (
                  <button
                    key={kw}
                    onClick={() => {
                      setTrendsKeyword(kw);
                      window.open(getTrendsExploreUrl(kw, trendsRegion, trendsTimeRange), '_blank');
                    }}
                    className="px-3 py-1 bg-white/5 hover:bg-primary/20 text-muted-dark hover:text-primary rounded-lg text-sm transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compare Keywords */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-purple-400">compare_arrows</span>
              Comparar keywords
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {compareKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm"
                >
                  {kw}
                  <button
                    onClick={() => setCompareKeywords(compareKeywords.filter((_, i) => i !== idx))}
                    className="hover:text-red-400 transition-colors"
                  >
                    <span className="material-icons-round text-sm">close</span>
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={newCompareKeyword}
                onChange={(e) => setNewCompareKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCompareKeyword.trim() && compareKeywords.length < 5) {
                    setCompareKeywords([...compareKeywords, newCompareKeyword.trim()]);
                    setNewCompareKeyword('');
                  }
                }}
                placeholder="Agregar keyword (máx 5)"
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={compareKeywords.length >= 5}
              />
              <button
                onClick={() => {
                  if (newCompareKeyword.trim() && compareKeywords.length < 5) {
                    setCompareKeywords([...compareKeywords, newCompareKeyword.trim()]);
                    setNewCompareKeyword('');
                  }
                }}
                disabled={!newCompareKeyword.trim() || compareKeywords.length >= 5}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-round">add</span>
              </button>
              <button
                onClick={() => {
                  if (compareKeywords.length >= 2) {
                    window.open(getTrendsCompareUrl(compareKeywords, trendsRegion, trendsTimeRange), '_blank');
                  }
                }}
                disabled={compareKeywords.length < 2}
                className="px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-round">open_in_new</span>
                Comparar ({compareKeywords.length}/5)
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-primary">category</span>
              Explorar por categoría
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TRENDING_CATEGORIES.map((category) => (
                <div
                  key={category.name}
                  className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <h4 className="text-sm font-semibold text-white mb-3">{category.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {category.keywords.map((keyword) => (
                      <button
                        key={keyword}
                        onClick={() => {
                          setTrendsKeyword(keyword);
                          window.open(getTrendsExploreUrl(keyword, trendsRegion, trendsTimeRange), '_blank');
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-primary/20 text-muted-dark hover:text-primary rounded-lg text-xs transition-colors"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TikTok Trending Alerts */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <span className="material-icons-round text-2xl text-white">local_fire_department</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">TikTok Trending</h3>
                <p className="text-sm text-muted-dark">Tendencias en tiempo real de TikTok Creative Center</p>
              </div>
            </div>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <a
                href={getTikTokTrendingHashtagsUrl(tiktokRegion)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-purple-400 mb-2 block group-hover:scale-110 transition-transform">tag</span>
                <span className="text-sm font-medium text-white">Trending Hashtags</span>
                <p className="text-xs text-muted-dark mt-1">Los hashtags más usados</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400">
                  <span className="material-icons-round text-sm">open_in_new</span>
                  Ver en TikTok
                </span>
              </a>
              <a
                href={getTikTokTrendingVideosUrl(tiktokRegion)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-pink-400 mb-2 block group-hover:scale-110 transition-transform">play_circle</span>
                <span className="text-sm font-medium text-white">Trending Videos</span>
                <p className="text-xs text-muted-dark mt-1">Videos virales del momento</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-pink-400">
                  <span className="material-icons-round text-sm">open_in_new</span>
                  Ver en TikTok
                </span>
              </a>
              <a
                href={getTikTokTrendingSongsUrl(tiktokRegion)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-cyan-400 mb-2 block group-hover:scale-110 transition-transform">music_note</span>
                <span className="text-sm font-medium text-white">Trending Songs</span>
                <p className="text-xs text-muted-dark mt-1">Audio trending para videos</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400">
                  <span className="material-icons-round text-sm">open_in_new</span>
                  Ver en TikTok
                </span>
              </a>
              <a
                href={getTikTokTrendingCreatorsUrl(tiktokRegion)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-orange-400 mb-2 block group-hover:scale-110 transition-transform">person_star</span>
                <span className="text-sm font-medium text-white">Top Creators</span>
                <p className="text-xs text-muted-dark mt-1">Creadores en tendencia</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-orange-400">
                  <span className="material-icons-round text-sm">open_in_new</span>
                  Ver en TikTok
                </span>
              </a>
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <span className="material-icons-round text-muted-dark">public</span>
              <span className="text-sm text-muted-dark">Región:</span>
              <select
                value={tiktokRegion}
                onChange={(e) => setTiktokRegion(e.target.value)}
                className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              >
                {TIKTOK_REGIONS.map((region) => (
                  <option key={region.code} value={region.code} className="bg-gray-900">
                    {region.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-dark ml-auto">Las tendencias cambian según la región</span>
            </div>

            {/* Trend Indicators Legend */}
            <div className="mt-4 p-3 bg-white/5 rounded-xl">
              <h5 className="text-xs font-medium text-white mb-2 uppercase tracking-wider">Indicadores de tendencia</h5>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="material-icons-round text-orange-500 text-base">local_fire_department</span>
                  <span className="text-muted-dark">Breakout (500%+)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-icons-round text-green-500 text-base">trending_up</span>
                  <span className="text-muted-dark">En ascenso</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-icons-round text-blue-400 text-base">trending_flat</span>
                  <span className="text-muted-dark">Estable</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-icons-round text-red-400 text-base">trending_down</span>
                  <span className="text-muted-dark">En descenso</span>
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-yellow-400">lightbulb</span>
              Tips para investigar tendencias
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-blue-400 mt-0.5">schedule</span>
                <div>
                  <p className="font-medium text-white">Compara rangos de tiempo</p>
                  <p className="text-muted-dark">Últimos 7 días vs último año para ver si es tendencia real</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-green-400 mt-0.5">compare</span>
                <div>
                  <p className="font-medium text-white">Compara competidores</p>
                  <p className="text-muted-dark">Ej: "nike" vs "adidas" vs "puma"</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-purple-400 mt-0.5">arrow_upward</span>
                <div>
                  <p className="font-medium text-white">Busca "Rising" queries</p>
                  <p className="text-muted-dark">Keywords con "Breakout" son oportunidades de oro</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-orange-400 mt-0.5">public</span>
                <div>
                  <p className="font-medium text-white">Filtra por región</p>
                  <p className="text-muted-dark">Las tendencias varían mucho entre países</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TikTok Creative Center Section */}
      {contentMode === 'tiktok' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <span className="material-icons-round text-2xl text-white">music_note</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">TikTok Creative Center</h3>
                <p className="text-sm text-muted-dark">Explora los mejores anuncios y tendencias de TikTok</p>
              </div>
            </div>

            {/* Region Selector */}
            <div className="mb-6">
              <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                Región
              </label>
              <select
                value={tiktokRegion}
                onChange={(e) => setTiktokRegion(e.target.value)}
                className="w-full md:w-64 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              >
                {TIKTOK_REGIONS.map((region) => (
                  <option key={region.code} value={region.code} className="bg-gray-900">
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => window.open(getTikTokTrendingVideosUrl(tiktokRegion), '_blank')}
                className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/10 hover:from-pink-500/20 hover:to-rose-500/20 border border-pink-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-pink-400 mb-2 block group-hover:scale-110 transition-transform">play_circle</span>
                <span className="text-sm font-medium text-white">Videos Trending</span>
                <p className="text-xs text-muted-dark mt-1">Top videos virales</p>
              </button>

              <button
                onClick={() => window.open(getTikTokTrendingHashtagsUrl(tiktokRegion), '_blank')}
                className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-purple-400 mb-2 block group-hover:scale-110 transition-transform">tag</span>
                <span className="text-sm font-medium text-white">Hashtags</span>
                <p className="text-xs text-muted-dark mt-1">Tendencias del momento</p>
              </button>

              <button
                onClick={() => window.open(getTikTokTrendingSongsUrl(tiktokRegion), '_blank')}
                className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-cyan-400 mb-2 block group-hover:scale-110 transition-transform">music_note</span>
                <span className="text-sm font-medium text-white">Canciones</span>
                <p className="text-xs text-muted-dark mt-1">Audio trending</p>
              </button>

              <button
                onClick={() => window.open(getTikTokTrendingCreatorsUrl(tiktokRegion), '_blank')}
                className="p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 hover:from-orange-500/20 hover:to-yellow-500/20 border border-orange-500/20 rounded-xl transition-all group"
              >
                <span className="material-icons-round text-2xl text-orange-400 mb-2 block group-hover:scale-110 transition-transform">person_star</span>
                <span className="text-sm font-medium text-white">Creadores</span>
                <p className="text-xs text-muted-dark mt-1">Top creators</p>
              </button>
            </div>
          </div>

          {/* TikTok Video Search */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-pink-400">play_circle</span>
              Buscar Videos Virales
            </h3>

            <div className="flex gap-3 flex-wrap mb-4">
              <input
                type="text"
                value={tiktokSearchQuery}
                onChange={(e) => setTiktokSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tiktokSearchQuery.trim()) {
                    window.open(getTikTokSearchUrl(tiktokSearchQuery, tiktokSearchType), '_blank');
                  }
                }}
                placeholder="Buscar videos, hashtags, tendencias..."
                className="flex-1 min-w-[280px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-lg"
              />
              <div className="flex items-center bg-white/5 rounded-xl p-1">
                {[
                  { value: 'video', label: 'Videos', icon: 'play_circle' },
                  { value: 'user', label: 'Usuarios', icon: 'person' },
                  { value: 'live', label: 'Lives', icon: 'sensors' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setTiktokSearchType(type.value as typeof tiktokSearchType)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                      tiktokSearchType === type.value
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'text-muted-dark hover:text-white'
                    }`}
                  >
                    <span className="material-icons-round text-base">{type.icon}</span>
                    <span className="hidden sm:inline">{type.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (tiktokSearchQuery.trim()) {
                    window.open(getTikTokSearchUrl(tiktokSearchQuery, tiktokSearchType), '_blank');
                  }
                }}
                disabled={!tiktokSearchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <span className="material-icons-round">search</span>
                Buscar
              </button>
            </div>

            {/* Quick search suggestions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-dark mr-2">Trending:</span>
              {['viral', 'fyp', 'trending', 'challenge', 'hack', 'tutorial', 'asmr', 'satisfying'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setTiktokSearchQuery(tag);
                    window.open(getTikTokSearchUrl(tag, 'video'), '_blank');
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-pink-500/20 text-muted-dark hover:text-pink-400 rounded-lg text-sm transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Top Ads Explorer */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-pink-400">campaign</span>
              Top Ads - Mejores Anuncios
            </h3>

            {/* Keyword Search */}
            <div className="mb-4">
              <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                Buscar por Keyword
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={tiktokTopAdsKeyword}
                  onChange={(e) => setTiktokTopAdsKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      window.open(getTikTokTopAdsUrl(tiktokRegion, tiktokIndustry, tiktokObjective, tiktokPeriod, tiktokTopAdsKeyword), '_blank');
                    }
                  }}
                  placeholder="fitness, skincare, dropshipping, etc..."
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                />
                <button
                  onClick={() => window.open(getTikTokTopAdsUrl(tiktokRegion, tiktokIndustry, tiktokObjective, tiktokPeriod, tiktokTopAdsKeyword), '_blank')}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                >
                  <span className="material-icons-round">search</span>
                  Buscar Ads
                </button>
              </div>
            </div>

            {/* Quick keyword suggestions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-muted-dark mr-2">Populares:</span>
              {['fitness', 'skincare', 'ecommerce', 'app', 'fashion', 'food', 'gaming'].map((kw) => (
                <button
                  key={kw}
                  onClick={() => {
                    setTiktokTopAdsKeyword(kw);
                    window.open(getTikTokTopAdsUrl(tiktokRegion, tiktokIndustry, tiktokObjective, tiktokPeriod, kw), '_blank');
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-pink-500/20 text-muted-dark hover:text-pink-400 rounded-lg text-sm transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-amber-400/80 mb-4 flex items-center gap-1">
              <span className="material-icons-round text-sm">info</span>
              El keyword no se pre-llena automáticamente. Deberás escribirlo en TikTok Creative Center.
            </p>

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-white/10">
              {/* Industry */}
              <div>
                <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                  Industria
                </label>
                <select
                  value={tiktokIndustry}
                  onChange={(e) => setTiktokIndustry(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  {TIKTOK_INDUSTRIES.map((ind) => (
                    <option key={ind.code} value={ind.code} className="bg-gray-900">
                      {ind.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Objective */}
              <div>
                <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                  Objetivo
                </label>
                <select
                  value={tiktokObjective}
                  onChange={(e) => setTiktokObjective(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  {TIKTOK_OBJECTIVES.map((obj) => (
                    <option key={obj.code} value={obj.code} className="bg-gray-900">
                      {obj.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Period */}
              <div>
                <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                  Período
                </label>
                <select
                  value={tiktokPeriod}
                  onChange={(e) => setTiktokPeriod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                >
                  {TIKTOK_TIME_PERIODS.map((period) => (
                    <option key={period.code} value={period.code} className="bg-gray-900">
                      {period.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-muted-dark">
              Busca anuncios por keyword o explora los mejores ads filtrados por industria, objetivo y período.
            </p>
          </div>

          {/* Keyword Insights */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-cyan-400">search_insights</span>
              Keyword Insights
            </h3>

            <div className="flex gap-3 flex-wrap mb-4">
              <input
                type="text"
                value={tiktokKeyword}
                onChange={(e) => setTiktokKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tiktokKeyword.trim()) {
                    window.open(getTikTokKeywordInsightsUrl(tiktokKeyword, tiktokRegion), '_blank');
                  }
                }}
                placeholder="Escribe un keyword para analizar..."
                className="flex-1 min-w-[250px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <button
                onClick={() => {
                  if (tiktokKeyword.trim()) {
                    window.open(getTikTokKeywordInsightsUrl(tiktokKeyword, tiktokRegion), '_blank');
                  }
                }}
                disabled={!tiktokKeyword.trim()}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-icons-round">open_in_new</span>
                Analizar
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-muted-dark mr-2">Sugerencias:</span>
              {['fitness', 'skincare', 'dropshipping', 'cooking', 'travel', 'fashion'].map((kw) => (
                <button
                  key={kw}
                  onClick={() => {
                    setTiktokKeyword(kw);
                    window.open(getTikTokKeywordInsightsUrl(kw, tiktokRegion), '_blank');
                  }}
                  className="px-3 py-1 bg-white/5 hover:bg-pink-500/20 text-muted-dark hover:text-pink-400 rounded-lg text-sm transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-amber-400/80 flex items-center gap-1">
              <span className="material-icons-round text-sm">info</span>
              El keyword no se pre-llena automáticamente. Deberás escribirlo en TikTok Creative Center.
            </p>
          </div>

          {/* TikTok Ads Library */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-purple-400">library_books</span>
              TikTok Ads Library
            </h3>
            <p className="text-sm text-muted-dark mb-4">
              Biblioteca de transparencia comercial - Ve todos los anuncios activos en TikTok.
            </p>
            <button
              onClick={() => window.open(getTikTokAdsLibraryUrl('', tiktokRegion), '_blank')}
              className="px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-xl font-medium flex items-center gap-2 transition-all"
            >
              <span className="material-icons-round">open_in_new</span>
              Abrir Ads Library
            </button>
          </div>

          {/* Categories Grid */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-pink-400">category</span>
              Explorar por Categoría
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIKTOK_TRENDING_SUGGESTIONS.map((category) => (
                <div
                  key={category.name}
                  className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <h4 className="text-sm font-semibold text-white mb-3">{category.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {category.keywords.map((keyword) => (
                      <button
                        key={keyword}
                        onClick={() => {
                          setTiktokKeyword(keyword);
                          window.open(getTikTokKeywordInsightsUrl(keyword, tiktokRegion), '_blank');
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-pink-500/20 text-muted-dark hover:text-pink-400 rounded-lg text-xs transition-colors"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-yellow-400">lightbulb</span>
              Tips para TikTok Ads
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-pink-400 mt-0.5">timer</span>
                <div>
                  <p className="font-medium text-white">Hook en 3 segundos</p>
                  <p className="text-muted-dark">Los mejores ads captan atención inmediatamente</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-cyan-400 mt-0.5">music_note</span>
                <div>
                  <p className="font-medium text-white">Usa audio trending</p>
                  <p className="text-muted-dark">El algoritmo favorece audios populares</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-purple-400 mt-0.5">smartphone</span>
                <div>
                  <p className="font-medium text-white">Formato vertical 9:16</p>
                  <p className="text-muted-dark">Optimizado para pantalla completa</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-green-400 mt-0.5">verified</span>
                <div>
                  <p className="font-medium text-white">Contenido nativo</p>
                  <p className="text-muted-dark">Ads que parecen orgánicos funcionan mejor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Copy Generator Section */}
      {contentMode === 'ai' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <span className="material-icons-round text-2xl text-white">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">AI Copy Generator</h3>
                <p className="text-sm text-muted-dark">Genera hooks y copies para tus anuncios con IA</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                  Describe tu producto o servicio *
                </label>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Ej: Crema facial anti-edad con retinol y ácido hialurónico para mujeres de 35-50 años que quieren reducir arrugas..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px] resize-none"
                  rows={3}
                />
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Platform */}
                <div>
                  <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                    Plataforma
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AI_AD_PLATFORMS.map((platform) => (
                      <button
                        key={platform.value}
                        onClick={() => setAiPlatform(platform.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                          aiPlatform === platform.value
                            ? `bg-${platform.color}-500/20 text-${platform.color}-400 border border-${platform.color}-500/30`
                            : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="material-icons-round text-base">{platform.icon}</span>
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                    Estilo
                  </label>
                  <select
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value as CopyStyle)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {COPY_STYLES.map((style) => (
                      <option key={style.value} value={style.value} className="bg-gray-900">
                        {style.label} - {style.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                    Idioma
                  </label>
                  <div className="flex gap-2">
                    {COPY_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setAiLanguage(lang.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          aiLanguage === lang.value
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateCopy}
                disabled={!aiDescription.trim() || isGenerating}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    Generando con IA...
                  </>
                ) : (
                  <>
                    <span className="material-icons-round">auto_awesome</span>
                    Generar Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {aiError && (
            <div className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-3">
                <span className="material-icons-round text-red-400">error</span>
                <p className="text-red-400">{aiError}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {aiResult && (
            <div className="space-y-4">
              {/* Hooks */}
              <div className="glass rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-pink-400">format_quote</span>
                  Hooks (Frases de Apertura)
                </h4>
                <div className="space-y-3">
                  {aiResult.hooks.map((hook, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 p-4 bg-white/5 rounded-xl group"
                    >
                      <p className="text-white flex-1">{hook}</p>
                      <button
                        onClick={() => handleCopyText(hook, `hook-${index}`)}
                        className={`p-2 rounded-lg transition-colors ${
                          copiedItem === `hook-${index}`
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="material-icons-round text-lg">
                          {copiedItem === `hook-${index}` ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Copies */}
              <div className="glass rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-blue-400">description</span>
                  Copies Completos
                </h4>
                <div className="space-y-4">
                  {aiResult.copies.map((copy, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white/5 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-xs text-muted-dark">Copy #{index + 1}</span>
                        <button
                          onClick={() => handleCopyText(copy, `copy-${index}`)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            copiedItem === `copy-${index}`
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="material-icons-round text-sm">
                            {copiedItem === `copy-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                      <p className="text-white whitespace-pre-wrap">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA & Hashtags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CTA */}
                <div className="glass rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="material-icons-round text-green-400">ads_click</span>
                    Call to Action
                  </h4>
                  <div className="flex items-center justify-between gap-3 p-4 bg-white/5 rounded-xl">
                    <p className="text-white font-medium">{aiResult.cta}</p>
                    <button
                      onClick={() => handleCopyText(aiResult.cta, 'cta')}
                      className={`p-2 rounded-lg transition-colors ${
                        copiedItem === 'cta'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-icons-round text-lg">
                        {copiedItem === 'cta' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Hashtags */}
                <div className="glass rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="material-icons-round text-purple-400">tag</span>
                    Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.hashtags.map((hashtag, index) => (
                      <button
                        key={index}
                        onClick={() => handleCopyText(`#${hashtag}`, `hashtag-${index}`)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          copiedItem === `hashtag-${index}`
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                        }`}
                      >
                        #{hashtag}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCopyText(aiResult.hashtags.map(h => `#${h}`).join(' '), 'all-hashtags')}
                    className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      copiedItem === 'all-hashtags'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-icons-round text-sm">
                      {copiedItem === 'all-hashtags' ? 'check' : 'content_copy'}
                    </span>
                    Copiar todos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          {!aiResult && !isGenerating && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-icons-round text-yellow-400">lightbulb</span>
                Tips para mejores resultados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="material-icons-round text-purple-400 mt-0.5">psychology</span>
                  <div>
                    <p className="font-medium text-white">Sé específico</p>
                    <p className="text-muted-dark">Incluye tu público objetivo, beneficios clave y diferenciadores</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="material-icons-round text-pink-400 mt-0.5">groups</span>
                  <div>
                    <p className="font-medium text-white">Define tu audiencia</p>
                    <p className="text-muted-dark">Menciona edad, intereses, problemas que resuelves</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="material-icons-round text-green-400 mt-0.5">verified</span>
                  <div>
                    <p className="font-medium text-white">Incluye prueba social</p>
                    <p className="text-muted-dark">Testimonios, números, resultados comprobables</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="material-icons-round text-blue-400 mt-0.5">trending_up</span>
                  <div>
                    <p className="font-medium text-white">Prueba diferentes estilos</p>
                    <p className="text-muted-dark">Genera varias versiones y testea cuál funciona mejor</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Competitor Tracker Section */}
      {contentMode === 'competitors' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <span className="material-icons-round text-2xl text-white">groups</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Competitor Tracker</h3>
                  <p className="text-sm text-muted-dark">Rastrea los anuncios de tus competidores en todas las plataformas</p>
                </div>
              </div>
              {competitorView === 'list' && (
                <button
                  onClick={() => setShowAddCompetitorForm(!showAddCompetitorForm)}
                  className="px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-xl font-medium flex items-center gap-2 transition-all"
                >
                  <span className="material-icons-round">{showAddCompetitorForm ? 'close' : 'add'}</span>
                  {showAddCompetitorForm ? 'Cancelar' : 'Agregar Competidor'}
                </button>
              )}
            </div>

            {/* Sub-navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setCompetitorView('list')}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  competitorView === 'list'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-white/5 text-muted-dark hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-icons-round text-lg">groups</span>
                Lista
              </button>
              <button
                onClick={() => setCompetitorView('ads')}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  competitorView === 'ads'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-muted-dark hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-icons-round text-lg">collections</span>
                Anuncios Guardados
                {competitorAds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-purple-500/30 rounded-full text-xs">
                    {competitorAds.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCompetitorView('analytics')}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  competitorView === 'analytics'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-muted-dark hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="material-icons-round text-lg">analytics</span>
                Analytics
              </button>
            </div>

            {/* Add Competitor Form - Only on list view */}
            {competitorView === 'list' && (
            <>
            <AnimatePresence>
              {showAddCompetitorForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                          Nombre de la marca *
                        </label>
                        <input
                          type="text"
                          value={newCompetitorName}
                          onChange={(e) => setNewCompetitorName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
                          placeholder="Ej: Nike, Apple, Samsung..."
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                          TikTok Username (opcional)
                        </label>
                        <input
                          type="text"
                          value={newCompetitorTikTok}
                          onChange={(e) => setNewCompetitorTikTok(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
                          placeholder="@username (sin el @)"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                          Notas (opcional)
                        </label>
                        <input
                          type="text"
                          value={newCompetitorNotes}
                          onChange={(e) => setNewCompetitorNotes(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
                          placeholder="Ej: Competidor directo..."
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddCompetitor}
                      disabled={!newCompetitorName.trim() || isAddingCompetitor}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingCompetitor ? (
                        <>
                          <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <span className="material-icons-round">add</span>
                          Agregar Competidor
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info */}
            <div className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-xl text-sm">
              <span className="material-icons-round text-orange-400 mt-0.5">info</span>
              <p className="text-muted-dark">
                Agrega los nombres de tus competidores para acceder rápidamente a sus anuncios en Meta Ads Library, TikTok Ads Library y Google Ads Transparency Center.
              </p>
            </div>
            </>
            )}
          </div>

          {/* LIST VIEW - Competitors List */}
          {competitorView === 'list' && (
          <>
          {competitors.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <span className="material-icons-round text-4xl text-muted-dark mb-4 block">groups</span>
              <p className="text-white mb-2">No tienes competidores guardados</p>
              <p className="text-sm text-muted-dark">
                Agrega competidores para rastrear sus anuncios fácilmente
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitors.map((competitor) => (
                <motion.div
                  key={competitor.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass rounded-2xl p-5 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                        <span className="material-icons-round text-orange-400">storefront</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{competitor.brand_name}</h4>
                        {competitor.notes && (
                          <p className="text-xs text-muted-dark">{competitor.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                      className="p-1.5 rounded-lg text-muted-dark hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-icons-round text-lg">delete</span>
                    </button>
                  </div>

                  {/* Ad Library Buttons */}
                  <div className="space-y-2">
                    <a
                      href={getMetaAdsLibraryUrl(competitor.brand_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl font-medium flex items-center gap-2 transition-all text-sm"
                    >
                      <span className="material-icons-round text-lg">campaign</span>
                      Meta Ads Library
                      <span className="material-icons-round text-sm ml-auto">open_in_new</span>
                    </a>
                    <a
                      href={getTikTokCommercialLibraryUrl(competitor.brand_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-xl font-medium flex items-center gap-2 transition-all text-sm"
                    >
                      <span className="material-icons-round text-lg">music_note</span>
                      TikTok Ads Library
                      <span className="material-icons-round text-sm ml-auto">open_in_new</span>
                    </a>
                    {competitor.tiktok_username && (
                      <a
                        href={`https://www.tiktok.com/@${competitor.tiktok_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl font-medium flex items-center gap-2 transition-all text-sm"
                      >
                        <span className="material-icons-round text-lg">person</span>
                        @{competitor.tiktok_username}
                        <span className="text-xs text-muted-dark ml-1">perfil</span>
                        <span className="material-icons-round text-sm ml-auto">open_in_new</span>
                      </a>
                    )}
                    <a
                      href={getGoogleAdsTransparencyUrl(competitor.brand_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-medium flex items-center gap-2 transition-all text-sm"
                    >
                      <span className="material-icons-round text-lg">ads_click</span>
                      Google Ads Transparency
                      <span className="material-icons-round text-sm ml-auto">open_in_new</span>
                    </a>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-muted-dark mt-3 text-right">
                    Agregado: {new Date(competitor.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Tips */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="material-icons-round text-yellow-400">lightbulb</span>
              Tips para analizar competidores
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-blue-400 mt-0.5">calendar_today</span>
                <div>
                  <p className="font-medium text-white">Revisa la frecuencia</p>
                  <p className="text-muted-dark">¿Con qué frecuencia lanzan nuevos ads?</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-pink-400 mt-0.5">format_quote</span>
                <div>
                  <p className="font-medium text-white">Analiza los hooks</p>
                  <p className="text-muted-dark">¿Qué frases usan para captar atención?</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-green-400 mt-0.5">style</span>
                <div>
                  <p className="font-medium text-white">Estudia el formato</p>
                  <p className="text-muted-dark">¿Videos, carruseles, imágenes? ¿UGC?</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <span className="material-icons-round text-purple-400 mt-0.5">psychology</span>
                <div>
                  <p className="font-medium text-white">Identifica patrones</p>
                  <p className="text-muted-dark">¿Qué tipos de ads repiten más?</p>
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {/* ADS VIEW - Saved Competitor Ads */}
          {competitorView === 'ads' && (
            <div className="space-y-4">
              {/* Filters and Add Button */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setShowAddAdForm(!showAddAdForm)}
                  className="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-xl font-medium flex items-center gap-2 transition-all"
                >
                  <span className="material-icons-round">{showAddAdForm ? 'close' : 'add'}</span>
                  {showAddAdForm ? 'Cancelar' : 'Guardar Anuncio'}
                </button>

                <select
                  value={adsFilterCompetitor}
                  onChange={(e) => setAdsFilterCompetitor(e.target.value)}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="all">Todos los competidores</option>
                  {competitors.map((c) => (
                    <option key={c.id} value={c.id}>{c.brand_name}</option>
                  ))}
                </select>

                <select
                  value={adsFilterCategory}
                  onChange={(e) => setAdsFilterCategory(e.target.value as AdCategory | 'all')}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="all">Todas las categorías</option>
                  {AD_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Add Ad Form */}
              <AnimatePresence>
                {showAddAdForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="glass rounded-xl p-5">
                      <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-purple-400">bookmark_add</span>
                        Guardar Nuevo Anuncio
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                            Competidor *
                          </label>
                          <select
                            value={newAdCompetitorId}
                            onChange={(e) => setNewAdCompetitorId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          >
                            <option value="">Selecciona un competidor</option>
                            {competitors.map((c) => (
                              <option key={c.id} value={c.id}>{c.brand_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                            URL del anuncio *
                          </label>
                          <input
                            type="url"
                            value={newAdUrl}
                            onChange={(e) => setNewAdUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                            URL del thumbnail (opcional)
                          </label>
                          <input
                            type="url"
                            value={newAdThumbnail}
                            onChange={(e) => setNewAdThumbnail(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                            Categoría
                          </label>
                          <select
                            value={newAdCategory}
                            onChange={(e) => setNewAdCategory(e.target.value as AdCategory)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          >
                            {AD_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                            Descripción (opcional)
                          </label>
                          <input
                            type="text"
                            value={newAdDescription}
                            onChange={(e) => setNewAdDescription(e.target.value)}
                            placeholder="¿De qué trata el anuncio?"
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-muted-dark uppercase tracking-wider mb-2 block">
                            Notas (opcional)
                          </label>
                          <input
                            type="text"
                            value={newAdNotes}
                            onChange={(e) => setNewAdNotes(e.target.value)}
                            placeholder="¿Por qué guardas este anuncio? ¿Qué te llamó la atención?"
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddCompetitorAd}
                        disabled={!newAdCompetitorId || !newAdUrl.trim() || isAddingAd}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAddingAd ? (
                          <>
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <span className="material-icons-round">bookmark_add</span>
                            Guardar Anuncio
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ads Gallery */}
              {isLoadingAds ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="w-10 h-10 border-2 border-t-transparent border-purple-400 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-dark">Cargando anuncios...</p>
                </div>
              ) : competitorAds.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <span className="material-icons-round text-4xl text-muted-dark mb-4 block">collections</span>
                  <p className="text-white mb-2">No tienes anuncios guardados</p>
                  <p className="text-sm text-muted-dark">
                    Guarda anuncios de tus competidores para analizarlos después
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {competitorAds.map((ad) => (
                    <motion.div
                      key={ad.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass rounded-2xl overflow-hidden group"
                    >
                      {/* Thumbnail */}
                      <a
                        href={ad.ad_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video bg-white/5 relative"
                      >
                        {ad.thumbnail_url ? (
                          <img src={ad.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-icons-round text-4xl text-muted-dark">image</span>
                          </div>
                        )}
                        {/* Category Badge */}
                        <div className="absolute top-2 left-2">
                          {(() => {
                            const cat = AD_CATEGORIES.find(c => c.value === ad.category);
                            return cat ? (
                              <span className={`px-2 py-1 rounded-lg bg-black/50 text-xs font-medium ${cat.color} flex items-center gap-1`}>
                                <span className="material-icons-round text-sm">{cat.icon}</span>
                                {cat.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCompetitorAd(ad.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-icons-round text-red-400 text-sm">delete</span>
                        </button>
                        {/* Platform Badge */}
                        <div className="absolute bottom-2 right-2">
                          {(() => {
                            const plat = AD_PLATFORMS.find(p => p.value === ad.platform);
                            return plat ? (
                              <span className={`px-2 py-1 rounded-lg bg-black/50 text-xs font-medium ${plat.color} flex items-center gap-1`}>
                                <span className="material-icons-round text-sm">{plat.icon}</span>
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </a>

                      {/* Content */}
                      <div className="p-4">
                        <p className="text-xs text-orange-400 font-medium mb-1">
                          {ad.competitor?.brand_name || 'Competidor'}
                        </p>
                        <p className="text-sm text-white line-clamp-2 mb-2">
                          {ad.description || 'Sin descripción'}
                        </p>
                        {ad.notes && (
                          <p className="text-xs text-muted-dark italic line-clamp-2 mb-2">
                            "{ad.notes}"
                          </p>
                        )}
                        <p className="text-xs text-muted-dark">
                          {new Date(ad.saved_at).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS VIEW */}
          {competitorView === 'analytics' && (
            <div className="space-y-6">
              {isLoadingAds ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <div className="w-10 h-10 border-2 border-t-transparent border-green-400 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-dark">Cargando estadísticas...</p>
                </div>
              ) : !competitorAdsStats || competitorAdsStats.totalAds === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <span className="material-icons-round text-4xl text-muted-dark mb-4 block">analytics</span>
                  <p className="text-white mb-2">No hay datos para mostrar</p>
                  <p className="text-sm text-muted-dark">
                    Guarda algunos anuncios de competidores para ver estadísticas
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <span className="material-icons-round text-purple-400">collections</span>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{competitorAdsStats.totalAds}</p>
                          <p className="text-xs text-muted-dark">Total anuncios</p>
                        </div>
                      </div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <span className="material-icons-round text-orange-400">groups</span>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{competitorAdsStats.adsByCompetitor.length}</p>
                          <p className="text-xs text-muted-dark">Competidores</p>
                        </div>
                      </div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <span className="material-icons-round text-blue-400">category</span>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{competitorAdsStats.adsByCategory.length}</p>
                          <p className="text-xs text-muted-dark">Categorías</p>
                        </div>
                      </div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <span className="material-icons-round text-green-400">devices</span>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{competitorAdsStats.adsByPlatform.length}</p>
                          <p className="text-xs text-muted-dark">Plataformas</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By Category */}
                    <div className="glass rounded-2xl p-6">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-blue-400">category</span>
                        Por Categoría
                      </h4>
                      <div className="space-y-3">
                        {competitorAdsStats.adsByCategory.map((item) => {
                          const cat = AD_CATEGORIES.find(c => c.value === item.category);
                          const percentage = Math.round((item.count / competitorAdsStats.totalAds) * 100);
                          return (
                            <div key={item.category} className="flex items-center gap-3">
                              <span className={`material-icons-round ${cat?.color || 'text-gray-400'}`}>
                                {cat?.icon || 'category'}
                              </span>
                              <span className="text-white text-sm flex-1">{cat?.label || item.category}</span>
                              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-muted-dark text-sm w-12 text-right">{item.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* By Competitor */}
                    <div className="glass rounded-2xl p-6">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-orange-400">groups</span>
                        Por Competidor
                      </h4>
                      <div className="space-y-3">
                        {competitorAdsStats.adsByCompetitor.slice(0, 5).map((item) => {
                          const percentage = Math.round((item.count / competitorAdsStats.totalAds) * 100);
                          return (
                            <div key={item.competitor_id} className="flex items-center gap-3">
                              <span className="material-icons-round text-orange-400">storefront</span>
                              <span className="text-white text-sm flex-1 truncate">{item.brand_name}</span>
                              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-muted-dark text-sm w-12 text-right">{item.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  {competitorAdsStats.adsByMonth.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-green-400">timeline</span>
                        Anuncios por Mes
                      </h4>
                      <div className="flex items-end gap-2 h-32">
                        {competitorAdsStats.adsByMonth.map((item) => {
                          const maxCount = Math.max(...competitorAdsStats.adsByMonth.map(m => m.count));
                          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                          return (
                            <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                              <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                                <div
                                  className="w-full max-w-[40px] bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg transition-all"
                                  style={{ height: `${Math.max(height, 5)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-dark">{item.month.slice(5)}</span>
                              <span className="text-xs text-white font-medium">{item.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress indicator when searching */}
      {isSearching && <ProgressIndicator />}

      {/* Stats cards */}
      {(searchResults.length > 0 || starredItems.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-icons-round text-primary">analytics</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-muted-dark">Total creativos</p>
              </div>
            </div>
          </div>
          {ENABLED_PLATFORMS.map((key) => {
            const config = PLATFORM_CONFIG[key];
            return (
              <div key={key} className="glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                    <span className={`material-icons-round ${config.color}`}>{config.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats[key as keyof typeof stats]}</p>
                    <p className="text-xs text-muted-dark">{config.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {(searchResults.length > 0 || contentMode === 'starred') && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Platform filter (only show enabled platforms) */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', ...ENABLED_PLATFORMS] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p as PlatformFilter)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  platformFilter === p
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/5 text-muted-dark hover:bg-white/10 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Todos' : PLATFORM_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {contentMode === 'search' && searchResults.length === 0 && !isSearching ? (
        <>
          <EmptyState />
          {/* TikTok Fallback Links */}
          {tiktokFallbackLinks && (
            <div className="mt-6 glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-purple-400">info</span>
                <h4 className="text-white font-medium">TikTok - Búsqueda Directa No Disponible</h4>
              </div>
              {tiktokFallbackMessage && (
                <p className="text-muted-dark text-sm mb-4">{tiktokFallbackMessage}</p>
              )}
              <p className="text-muted-dark text-sm mb-4">
                Usa los siguientes links externos para explorar contenido en TikTok Creative Center:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(tiktokFallbackLinks).map(([key, url]) => {
                  const labels: Record<string, { label: string; icon: string }> = {
                    trending_hashtags: { label: 'Trending Hashtags', icon: 'tag' },
                    trending_videos: { label: 'Videos Populares', icon: 'play_circle' },
                    top_ads: { label: 'Top Ads', icon: 'campaign' },
                    keyword_insights: { label: 'Keyword Insights', icon: 'insights' },
                  };
                  const config = labels[key] || { label: key, icon: 'link' };
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all"
                    >
                      <span className="material-icons-round text-purple-400">{config.icon}</span>
                      <span className="text-white text-sm font-medium">{config.label}</span>
                      <span className="material-icons-round text-muted-dark ml-auto text-sm">open_in_new</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : displayItems.length === 0 && contentMode === 'starred' ? (
        <div className="glass rounded-xl p-8 text-center">
          <span className="material-icons-round text-4xl text-muted-dark mb-4">star_outline</span>
          <p className="text-white mb-2">No tienes creativos guardados</p>
          <p className="text-sm text-muted-dark">
            Busca creativos y haz clic en la estrella para guardarlos aquí
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {displayItems.map((item) => (
              <CardItem key={`${item.platform}_${item.external_id}`} item={item} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Table view */
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-dark uppercase tracking-wider">
                    Plataforma
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-dark uppercase tracking-wider">
                    Creador
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-dark uppercase tracking-wider">
                    Caption
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-muted-dark uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => toggleSort('view_count')}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Views
                      {sortBy === 'view_count' && (
                        <span className="material-icons-round text-sm">
                          {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      )}
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-muted-dark uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => toggleSort('like_count')}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Likes
                      {sortBy === 'like_count' && (
                        <span className="material-icons-round text-sm">
                          {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                      )}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-dark uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayItems.map((item) => (
                  <tr key={`${item.platform}_${item.external_id}`} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <PlatformBadge platform={item.platform} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.thumbnail_url && (
                          <img
                            src={item.thumbnail_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate max-w-[200px]">
                              {item.creator_username || item.creator_display_name || 'Unknown'}
                            </p>
                            {item.isViral && (
                              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium flex items-center gap-0.5">
                                <span className="material-icons-round text-xs">local_fire_department</span>
                                {item.repetition_count}x
                              </span>
                            )}
                          </div>
                          {item.is_ad && <span className="text-xs text-yellow-400">Anuncio</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-muted-dark truncate max-w-[300px]">{item.caption || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white font-medium">
                        {item.view_count > 0 ? formatNumber(item.view_count) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white font-medium">
                        {item.like_count > 0 ? formatNumber(item.like_count) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <StarButton item={item} />
                        <a
                          href={item.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-icons-round text-lg">open_in_new</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer info */}
      {displayItems.length > 0 && (
        <p className="text-center text-xs text-muted-dark">
          Mostrando {displayItems.length} de {stats.total} creativos
        </p>
      )}
    </div>
  );
};

export default AdsLabView;
