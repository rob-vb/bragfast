import { FORMAT_DIMENSIONS } from './types'
import { isDefaultVideoTemplate } from './video/defaults'

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
        }
      }
    }
  }

  return null
}

export function validateVideoFormats(
  formats: { name: string; scenes: unknown[] }[]
): string | null {
  if (!Array.isArray(formats) || formats.length === 0) {
    return "formats must be a non-empty array";
  }
  const validNames = ["landscape", "square", "portrait"];
  const seen = new Set<string>();
  for (const format of formats) {
    if (!validNames.includes(format.name)) {
      return `Invalid format name: ${format.name}`;
    }
    if (seen.has(format.name)) {
      return `Duplicate format: ${format.name}`;
    }
    seen.add(format.name);
    if (!Array.isArray(format.scenes) || format.scenes.length === 0) {
      return `${format.name}: scenes must be a non-empty array`;
    }
  }
  return null;
}

export function validateVideoTemplate(template: string | undefined): string | null {
  if (!template) return null;
  if (isDefaultVideoTemplate(template)) return null;
  if (template.startsWith("vtmpl_")) return null;
  return `Invalid video template. Must be a default name (e.g. "product-update") or a template ID (vtmpl_...)`;
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
