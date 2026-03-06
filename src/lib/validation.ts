export function validateReleaseColors(body: Record<string, unknown>): string | null {
  if (!body.brand_id) {
    const colors = body.colors as Record<string, unknown> | undefined
    if (!colors?.background || !colors?.text || !colors?.primary) {
      return 'colors.background, colors.text, and colors.primary are required when brand_id is not provided'
    }
  }
  return null
}
