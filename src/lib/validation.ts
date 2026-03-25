import { FORMAT_DIMENSIONS, VALID_ENTRANCE_TYPES } from './types'
import type { VideoField } from './types'

const VALID_FORMATS = Object.keys(FORMAT_DIMENSIONS)
const VALID_ANCHOR_X = ['left', 'center', 'right']
const VALID_ANCHOR_Y = ['top', 'center', 'bottom']
const VALID_IMAGE_FRAMES = ['browser', 'mobile', 'none']
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

export function validateFormats(formats: unknown): string | null {
  if (!formats || !Array.isArray(formats) || formats.length === 0) {
    return 'formats is required and must contain at least 1 entry'
  }

  const seen = new Set<string>()
  for (const entry of formats) {
    if (!entry.name || !VALID_FORMATS.includes(entry.name)) {
      return `Invalid format: ${entry.name}. Must be landscape, square, or portrait`
    }
    if (seen.has(entry.name)) {
      return `Duplicate format: ${entry.name}`
    }
    seen.add(entry.name)

    if (!entry.slides || !Array.isArray(entry.slides) || entry.slides.length === 0) {
      return `Format "${entry.name}" must have at least 1 slide`
    }
    if (entry.slides.length > 5) {
      return `Format "${entry.name}" allows maximum 5 slides`
    }

    for (const slide of entry.slides) {
      if (slide.objects) {
        if (!Array.isArray(slide.objects)) {
          return 'slides[].objects must be an array'
        }
        for (const mod of slide.objects) {
          if (!mod.id || typeof mod.id !== 'string') {
            return 'Each object requires a string id'
          }
          if (mod.image_frame && !VALID_IMAGE_FRAMES.includes(mod.image_frame)) {
            return 'image_frame must be "browser", "mobile", or "none"'
          }
          if (mod.anchor_x && !VALID_ANCHOR_X.includes(mod.anchor_x)) {
            return 'anchor_x must be "left", "center", or "right"'
          }
          if (mod.anchor_y && !VALID_ANCHOR_Y.includes(mod.anchor_y)) {
            return 'anchor_y must be "top", "center", or "bottom"'
          }
          if (mod.entrance && !VALID_ENTRANCE_TYPES.includes(mod.entrance)) {
            return `entrance must be one of: ${VALID_ENTRANCE_TYPES.join(', ')}`
          }
        }
      }
    }
  }

  return null
}

export function validateVideoField(video: unknown, slideCount: number): string | null {
  if (video === undefined || video === false) return null
  if (video === true) {
    // Default 5s per slide, check total cap
    if (slideCount * 5 > 60) {
      return `Total video duration exceeds 60s (${slideCount} slides × 5s = ${slideCount * 5}s)`
    }
    return null
  }
  if (typeof video === 'object' && video !== null) {
    const v = video as Record<string, unknown>
    if (v.duration !== undefined) {
      if (typeof v.duration !== 'number' || v.duration < 3 || v.duration > 30) {
        return 'video.duration must be between 3 and 30 seconds'
      }
      if (slideCount * v.duration > 60) {
        return `Total video duration exceeds 60s (${slideCount} slides × ${v.duration}s = ${slideCount * v.duration}s)`
      }
    }
    return null
  }
  return 'video must be true or { duration: number }'
}

export function validateReleaseColors(body: Record<string, unknown>): string | null {
  const colors = body.colors as Record<string, unknown> | undefined
  if (colors) {
    for (const key of ['background', 'text', 'primary'] as const) {
      if (colors[key] !== undefined && typeof colors[key] === 'string' && !isValidHexColor(colors[key] as string)) {
        return `colors.${key} must be a valid hex color (e.g. "#1a1a2e")`
      }
    }
  }
  return null
}
