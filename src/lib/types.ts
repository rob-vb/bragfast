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

export interface Slide {
  title: string
  description?: string
  imageBase64?: string
}

export interface ReleaseRequest {
  brand_id: string
  template?: 'classic' | 'split' | 'hero'
  slides: Array<{
    title: string
    description?: string
    image_url?: string
  }>
  formats?: Array<'landscape' | 'square' | 'portrait'>
}

export interface TemplateProps {
  slide: Slide
  brand: Brand
  width: number
  height: number
}

export type TemplateName = 'classic' | 'split' | 'hero'

export const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
}
