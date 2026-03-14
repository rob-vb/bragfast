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
}

export interface FormatEntry {
  name: FormatKey
  slides: Array<{
    objects?: ObjectModification[]
  }>
}

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
  metadata?: string
  webhook_url?: string
}

export interface ReleaseResult {
  cook_id: string
  status: 'pending' | 'completed' | 'failed'
  images: Record<string, { slides: string[]; dimensions: string }> | null
  credits_used: number
  credits_remaining: number
  created_at: string
  completed_at?: string
  metadata?: string
  webhook_url?: string
}

export type TemplateName = 'standard-browser' | 'standard-mobile' | 'split-browser' | 'split-mobile' | 'hero' | (string & {})

export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1920 },
}

export type CookOutput = "image" | "video";

export type CookCreditsInput =
  | { output?: "image"; formats: FormatEntry[] }
  | { output: "video"; formats: { name: string; scenes: unknown[] }[] };

export function calculateCredits(input: CookCreditsInput): number {
  if (input.output === "video") {
    return input.formats.length * 5;
  }
  return (input as { formats: FormatEntry[] }).formats.reduce(
    (sum, f) => sum + f.slides.length,
    0
  );
}
