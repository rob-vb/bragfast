export interface BrandColors {
  background: string
  text: string
  primary: string
}

export interface Brand {
  name: string
  logoBase64: string
  website: string
  colors: BrandColors
}

export type DeviceType = 'browser' | 'mobile'

export interface Slide {
  title: string
  description?: string
  imageBase64?: string
  device: DeviceType
}

export interface ReleaseRequest {
  brand_id: string
  template?: 'classic' | 'split' | 'hero'
  slides: Array<{
    title: string
    description?: string
    image_url?: string
    device?: 'browser' | 'mobile'
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
