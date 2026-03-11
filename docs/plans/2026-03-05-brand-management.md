# Brand Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CRUD API for brands (name, logo URL, colors) and wire `brand_id` into the release render pipeline.

**Architecture:** File-based storage at `/.brands/:id/brand.json`. New `src/lib/brands.ts` handles all read/write. Routes at `/api/v1/brands` and `/api/v1/brands/[id]`. `renderReleaseAsync` resolves `brand_id` to a `Brand`, falling back to placeholder if absent/missing.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Vitest, Node `fs/promises`

---

### Task 1: Add `BrandRecord` type

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add type to `types.ts`**

Add after the existing `Brand` interface (around line 12):

```ts
export interface BrandRecord {
  id: string
  name: string
  logo_url: string
  website?: string
  colors: BrandColors
  created_at: string
  updated_at: string
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add BrandRecord type"
```

---

### Task 2: Create `src/lib/brands.ts` with file-based CRUD

**Files:**
- Create: `src/lib/brands.ts`
- Create: `src/lib/__tests__/brands.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/__tests__/brands.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createBrand, getBrand, updateBrand, deleteBrand } from '../brands'

const validInput = {
  name: 'Acme',
  logo_url: 'https://acme.com/logo.png',
  colors: { background: '#FFF', text: '#000', primary: '#F00' },
}

describe('brands', () => {
  it('creates a brand and returns it with an id', async () => {
    const brand = await createBrand(validInput)
    expect(brand.id).toMatch(/^brand_/)
    expect(brand.name).toBe('Acme')
    expect(brand.logo_url).toBe('https://acme.com/logo.png')
    expect(brand.created_at).toBeDefined()
    expect(brand.updated_at).toBeDefined()
  })

  it('gets a brand by id', async () => {
    const created = await createBrand(validInput)
    const fetched = await getBrand(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched?.id).toBe(created.id)
  })

  it('returns null for unknown id', async () => {
    const result = await getBrand('brand_doesnotexist')
    expect(result).toBeNull()
  })

  it('updates a brand', async () => {
    const brand = await createBrand(validInput)
    const updated = await updateBrand(brand.id, { name: 'Updated' })
    expect(updated?.name).toBe('Updated')
    expect(updated?.logo_url).toBe(validInput.logo_url)
  })

  it('returns null when updating unknown id', async () => {
    const result = await updateBrand('brand_doesnotexist', { name: 'X' })
    expect(result).toBeNull()
  })

  it('deletes a brand', async () => {
    const brand = await createBrand(validInput)
    const deleted = await deleteBrand(brand.id)
    expect(deleted).toBe(true)
    expect(await getBrand(brand.id)).toBeNull()
  })

  it('returns false when deleting unknown id', async () => {
    const result = await deleteBrand('brand_doesnotexist')
    expect(result).toBe(false)
  })
})
```

**Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/__tests__/brands.test.ts
```
Expected: FAIL — "Cannot find module '../brands'"

**Step 3: Implement `src/lib/brands.ts`**

```ts
import { writeFile, mkdir, readFile, rm } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { BrandRecord, BrandColors } from './types'

const BRANDS_DIR = path.join(process.cwd(), '.brands')

export interface CreateBrandInput {
  name: string
  logo_url: string
  website?: string
  colors: BrandColors
}

export type UpdateBrandInput = Partial<Omit<CreateBrandInput, 'colors'> & { colors: Partial<BrandColors> }>

async function brandPath(id: string): Promise<string> {
  return path.join(BRANDS_DIR, id, 'brand.json')
}

export async function createBrand(input: CreateBrandInput): Promise<BrandRecord> {
  const id = `brand_${crypto.randomUUID().slice(0, 10)}`
  const now = new Date().toISOString()
  const brand: BrandRecord = {
    id,
    name: input.name,
    logo_url: input.logo_url,
    website: input.website,
    colors: input.colors,
    created_at: now,
    updated_at: now,
  }
  const dir = path.join(BRANDS_DIR, id)
  await mkdir(dir, { recursive: true })
  await writeFile(await brandPath(id), JSON.stringify(brand, null, 2))
  return brand
}

export async function getBrand(id: string): Promise<BrandRecord | null> {
  try {
    const data = await readFile(await brandPath(id), 'utf-8')
    return JSON.parse(data) as BrandRecord
  } catch {
    return null
  }
}

export async function updateBrand(id: string, input: UpdateBrandInput): Promise<BrandRecord | null> {
  const existing = await getBrand(id)
  if (!existing) return null
  const updated: BrandRecord = {
    ...existing,
    ...input,
    colors: input.colors ? { ...existing.colors, ...input.colors } : existing.colors,
    updated_at: new Date().toISOString(),
  }
  await writeFile(await brandPath(id), JSON.stringify(updated, null, 2))
  return updated
}

export async function deleteBrand(id: string): Promise<boolean> {
  const existing = await getBrand(id)
  if (!existing) return false
  await rm(path.join(BRANDS_DIR, id), { recursive: true, force: true })
  return true
}
```

**Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/__tests__/brands.test.ts
```
Expected: all 7 tests PASS

**Step 5: Commit**

```bash
git add src/lib/brands.ts src/lib/__tests__/brands.test.ts
git commit -m "feat: add file-based brand CRUD"
```

---

### Task 3: POST /api/v1/brands route

**Files:**
- Create: `src/app/api/v1/brands/route.ts`

**Step 1: Create the route**

```ts
import { createBrand } from '@/lib/brands'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.logo_url || typeof body.logo_url !== 'string') {
    return Response.json({ error: 'logo_url is required' }, { status: 400 })
  }
  if (!body.colors || typeof body.colors !== 'object') {
    return Response.json({ error: 'colors is required' }, { status: 400 })
  }
  const colors = body.colors as Record<string, unknown>
  if (!colors.background || !colors.text || !colors.primary) {
    return Response.json(
      { error: 'colors must include background, text, and primary' },
      { status: 400 }
    )
  }

  try {
    const brand = await createBrand({
      name: body.name,
      logo_url: body.logo_url,
      website: typeof body.website === 'string' ? body.website : undefined,
      colors: {
        background: colors.background as string,
        text: colors.text as string,
        primary: colors.primary as string,
      },
    })
    return Response.json(brand, { status: 201 })
  } catch (err) {
    console.error('Failed to create brand:', err)
    return Response.json({ error: 'Failed to create brand' }, { status: 500 })
  }
}
```

**Step 2: Manual smoke test (dev server must be running)**

```bash
curl -s -X POST http://localhost:3000/api/v1/brands \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","logo_url":"https://acme.com/logo.png","colors":{"background":"#FFF","text":"#000","primary":"#F00"}}' | jq
```
Expected: `201` with `id`, `name`, `created_at`

**Step 3: Commit**

```bash
git add src/app/api/v1/brands/route.ts
git commit -m "feat: add POST /api/v1/brands"
```

---

### Task 4: GET, PATCH, DELETE /api/v1/brands/[id] route

**Files:**
- Create: `src/app/api/v1/brands/[id]/route.ts`

**Step 1: Create the route**

```ts
import { getBrand, updateBrand, deleteBrand } from '@/lib/brands'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await getBrand(id)
  if (!brand) return Response.json({ error: 'Brand not found' }, { status: 404 })
  return Response.json(brand)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input: Record<string, unknown> = {}
  if (body.name !== undefined) input.name = body.name
  if (body.logo_url !== undefined) input.logo_url = body.logo_url
  if (body.website !== undefined) input.website = body.website
  if (body.colors !== undefined) input.colors = body.colors

  const updated = await updateBrand(id, input as Parameters<typeof updateBrand>[1])
  if (!updated) return Response.json({ error: 'Brand not found' }, { status: 404 })
  return Response.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deleted = await deleteBrand(id)
  if (!deleted) return Response.json({ error: 'Brand not found' }, { status: 404 })
  return new Response(null, { status: 204 })
}
```

**Step 2: Manual smoke test**

```bash
# Use the brand_id returned from Task 3 smoke test
BRAND_ID="brand_REPLACE_ME"

# GET
curl -s http://localhost:3000/api/v1/brands/$BRAND_ID | jq

# PATCH
curl -s -X PATCH http://localhost:3000/api/v1/brands/$BRAND_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Updated"}' | jq

# DELETE
curl -s -X DELETE http://localhost:3000/api/v1/brands/$BRAND_ID -o /dev/null -w "%{http_code}"
# Expected: 204
```

**Step 3: Commit**

```bash
git add src/app/api/v1/brands/[id]/route.ts
git commit -m "feat: add GET/PATCH/DELETE /api/v1/brands/[id]"
```

---

### Task 5: Wire `brand_id` into render pipeline

**Files:**
- Modify: `src/lib/pipeline/render.ts:50` (the `renderReleaseAsync` function)

**Step 1: Update `renderReleaseAsync` to resolve brand**

Replace this line in `renderReleaseAsync`:
```ts
const brand = getPlaceholderBrand()
```

With:
```ts
import { getBrand } from '../brands'
// ...
const brandRecord = request.brand_id ? await getBrand(request.brand_id) : null
const brand = brandRecord
  ? {
      name: brandRecord.name,
      logoBase64: await fetchImageAsBase64(brandRecord.logo_url),
      website: brandRecord.website ?? '',
      colors: brandRecord.colors,
    }
  : getPlaceholderBrand()
```

Note: add the `getBrand` import at the top of the file alongside existing imports.

**Step 2: Run existing pipeline tests**

```bash
npx vitest run src/lib/__tests__/pipeline.test.ts
```
Expected: both tests still PASS (they pass `brand_id: 'br_test'` which won't resolve, so fallback to placeholder is exercised)

**Step 3: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

**Step 4: Commit**

```bash
git add src/lib/pipeline/render.ts
git commit -m "feat: resolve brand_id in render pipeline, fall back to placeholder"
```

---

### Task 6: End-to-end smoke test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Create a brand**

```bash
curl -s -X POST http://localhost:3000/api/v1/brands \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Brand",
    "logo_url": "https://placehold.co/200x80/FF6B35/white?text=LOGO",
    "website": "https://mybrand.com",
    "colors": {
      "background": "#1A1A2E",
      "text": "#EAEAEA",
      "primary": "#E94560"
    }
  }' | jq
```

Note the `id` returned (e.g. `brand_abc123`).

**Step 3: Create a release using the brand**

```bash
curl -s -X POST http://localhost:3000/api/v1/releases \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "brand_REPLACE_WITH_ID",
    "slides": [{"title": "My Custom Brand Release", "description": "Looks great"}],
    "formats": ["landscape"]
  }' | jq
```

**Step 4: Poll until completed and open image**

```bash
RELEASE_ID="rel_REPLACE_ME"
curl -s http://localhost:3000/api/v1/releases/$RELEASE_ID | jq '.status,.images'
# Then open the slide URL in browser to visually verify the brand colors/logo
```
