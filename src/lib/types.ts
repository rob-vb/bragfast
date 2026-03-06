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
  font?: string
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

export type DeviceType = 'browser' | 'mobile'
export type TextAlign = 'left' | 'center' | 'right'

export interface Slide {
  title: string
  description?: string
  imageBase64?: string
  device: DeviceType
  align?: TextAlign
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
  font?: string
  template?: 'classic' | 'split' | 'hero'
  slides: Array<{
    title: string
    description?: string
    image_url?: string
    device?: 'browser' | 'mobile'
    align?: 'left' | 'center' | 'right'
  }>
  formats?: Array<'landscape' | 'square' | 'portrait'>
  transparent?: boolean
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
  transparent: boolean
  metadata?: string
  webhook_url?: string
}

export interface TemplateProps {
  slide: Slide
  brand: Brand
  width: number
  height: number
  transparent?: boolean
}

export type TemplateName = 'classic' | 'split' | 'hero'

export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
}
