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
  image_frame_color?: string
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
  slides: Array<{
    objects?: ObjectModification[]
  }>
  formats?: Array<'landscape' | 'square' | 'portrait'>
  metadata?: string
  webhook_url?: string
}

export interface ReleaseResult {
  release_id: string
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
