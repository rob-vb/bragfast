# Brand Management Design

**Date:** 2026-03-05
**Status:** Approved

## Overview

Allow API callers to register their own brand (name, logo, colors) and reference it by `brand_id` when creating releases. Images are rendered with the caller's brand instead of the placeholder.

## Data Model

```ts
interface BrandRecord {
  id: string           // "brand_abc123"
  name: string         // display name e.g. "Acme Corp"
  logo_url: string     // fetched + base64'd at render time
  website?: string     // optional, used in templates
  colors: {
    background: string // hex
    text: string       // hex
    primary: string    // hex
  }
  created_at: string
  updated_at: string
}
```

Logo is stored as a URL and fetched at render time using the existing `fetchImageAsBase64()` — same pattern as slide `image_url`.

## Storage

File-based: `/.brands/:id/brand.json`
Mirrors the existing `/.output/:id/` pattern for releases.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/brands` | Create brand, returns `brand_id` |
| GET | `/api/v1/brands/:id` | Fetch brand by ID |
| PATCH | `/api/v1/brands/:id` | Update any fields |
| DELETE | `/api/v1/brands/:id` | Delete brand |

**Create request body:**
```json
{
  "name": "Acme Corp",
  "logo_url": "https://acme.com/logo.png",
  "website": "https://acme.com",
  "colors": {
    "background": "#FFFFFF",
    "text": "#1A1A1A",
    "primary": "#FF6B35"
  }
}
```

## File Structure

**New files:**
- `/.brands/:id/brand.json` — brand storage
- `src/app/api/v1/brands/route.ts` — POST /brands
- `src/app/api/v1/brands/[id]/route.ts` — GET, PATCH, DELETE /brands/:id
- `src/lib/brands.ts` — getBrand, createBrand, updateBrand, deleteBrand

**Modified files:**
- `src/lib/types.ts` — add `BrandRecord` type
- `src/lib/pipeline/render.ts` — replace `getPlaceholderBrand()` with `getBrand(brand_id)`, falling back to placeholder if missing/not found

## Decisions

- **Auth:** deferred — no ownership scoping for now
- **Logo format:** URL only (no base64 upload, no file upload)
- **Storage:** file-based for now, designed for easy DB migration
- **Fallback:** if `brand_id` is absent or brand not found, fall back to placeholder brand (preserves existing behavior)
