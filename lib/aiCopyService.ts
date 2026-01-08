// AI Copy Generator Service
// Uses OpenAI GPT-4o-mini via Supabase Edge Function

const SUPABASE_URL = 'https://jqjkiyspagztsvrvxmey.supabase.co';
const GENERATE_COPY_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-ad-copy`;

// Types
export type AdPlatform = 'tiktok' | 'meta' | 'youtube';
export type CopyStyle = 'viral' | 'profesional' | 'casual' | 'educativo';
export type CopyLanguage = 'es' | 'en';

export interface GenerateCopyRequest {
  description: string;
  platform: AdPlatform;
  style: CopyStyle;
  language: CopyLanguage;
}

export interface GenerateCopyResponse {
  hooks: string[];      // 3 hooks de apertura
  copies: string[];     // 3 variaciones de copy
  cta: string;          // Call to action
  hashtags: string[];   // Hashtags sugeridos
}

// Platform options
export const AD_PLATFORMS: { value: AdPlatform; label: string; icon: string; color: string }[] = [
  { value: 'tiktok', label: 'TikTok', icon: 'music_note', color: 'pink' },
  { value: 'meta', label: 'Meta (FB/IG)', icon: 'campaign', color: 'blue' },
  { value: 'youtube', label: 'YouTube', icon: 'smart_display', color: 'red' },
];

// Style options
export const COPY_STYLES: { value: CopyStyle; label: string; description: string }[] = [
  { value: 'viral', label: 'Viral', description: 'Controversial, sorprendente, FOMO' },
  { value: 'profesional', label: 'Profesional', description: 'Serio, datos, credibilidad' },
  { value: 'casual', label: 'Casual', description: 'Amigable, relatable, conversacional' },
  { value: 'educativo', label: 'Educativo', description: 'Tips, listas, aprendizaje' },
];

// Language options
export const COPY_LANGUAGES: { value: CopyLanguage; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

/**
 * Generate ad copy using OpenAI via Edge Function
 */
export async function generateAdCopy(
  request: GenerateCopyRequest
): Promise<{ success: boolean; data?: GenerateCopyResponse; error?: string }> {
  try {
    console.log('[AI Copy] Generating copy for:', request);

    const response = await fetch(GENERATE_COPY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Copy] Error:', errorData);
      return {
        success: false,
        error: errorData.error || `Error: ${response.status}`,
      };
    }

    const data: GenerateCopyResponse = await response.json();
    console.log('[AI Copy] Generated:', data);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[AI Copy] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
