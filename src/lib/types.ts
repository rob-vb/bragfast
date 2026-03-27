import type { FormatKey } from "./templates/canvas-types"

export interface BrandColors {
  background: string
  text: string
  primary: string
}

// Runtime type used by templates; website is required (coerced from BrandRecord with ?? '')
export interface Brand {
  name: string
  logoBase64: string
  website: string
  colors: BrandColors
  font_family?: string
}

// Stored/API record shape; snake_case matches project convention
export interface BrandRecord {
  id: string
  name: string
  logo_url?: string
  website?: string
  colors: BrandColors
  created_at: string
  updated_at: string
}

export type TextAlign = 'left' | 'center' | 'right'
export type EntranceType = 'fade-in' | 'slide-up' | 'bounce' | 'showcase-rise' | 'showcase-reveal' | 'none'
export type ExitType = 'fade-out' | 'slide-down' | 'bounce' | 'none'
export type AnimationPreset = 'showcase'

export interface ObjectModification {
  id: string
  // Text objects
  text?: string
  font_family?: string
  color?: string
  // Image objects
  image_url?: string
  image_frame?: 'browser' | 'mobile' | 'none'
  image_frame_color?: string
  anchor_x?: 'left' | 'center' | 'right'
  anchor_y?: 'top' | 'center' | 'bottom'
  // Video animation
  entrance?: EntranceType
  exit?: ExitType
}

export interface FormatEntry {
  name: FormatKey
  slides: Array<{
    objects?: ObjectModification[]
  }>
}

export type VideoField = true | { duration?: number; preset?: AnimationPreset }

export interface ReleaseRequest {
  brand_id?: string
  // Required when brand_id is absent:
  colors?: {
    background: string
    text: string
    primary: string
  }
  name?: string
  logo_url?: string
  font_family?: string
  template?: TemplateName
  formats: FormatEntry[]
  video?: VideoField
  metadata?: string
  webhook_url?: string
}

export interface ReleaseResult {
  cook_id: string
  output: 'image' | 'video'
  status: 'pending' | 'pending_review' | 'completed' | 'failed' | 'dismissed'
  images: Record<string, { slides: string[]; dimensions: string }> | null
  videos?: Record<string, { url: string; duration: number; dimensions: string }> | null
  credits_used: number
  credits_remaining: number
  created_at: string
  completed_at?: string
  metadata?: string
  webhook_url?: string
  socialCopy?: { twitter: string; linkedin: string } | null
}

export type TemplateName = 'standard-browser' | 'standard-mobile' | 'split-browser' | 'split-mobile' | 'hero' | (string & {})

export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
}

export type CookCreditsInput = {
  video?: VideoField | false;
  formats: FormatEntry[];
};

export function calculateCredits(input: CookCreditsInput): number {
  const totalSlides = input.formats.reduce(
    (sum, f) => sum + f.slides.length,
    0
  );
  if (input.video) {
    return totalSlides * 15;
  }
  return totalSlides;
}

export const VALID_ENTRANCE_TYPES: EntranceType[] = ['fade-in', 'slide-up', 'bounce', 'showcase-rise', 'showcase-reveal', 'none']
export const VALID_ANIMATION_PRESETS: AnimationPreset[] = ['showcase']
