import { writeFile, mkdir, readFile, rm } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { BrandRecord, BrandColors } from './types'

export let BRANDS_DIR = path.join(process.cwd(), '.brands')

export function setBrandsDir(dir: string) {
  BRANDS_DIR = dir
}

export interface CreateBrandInput {
  name: string
  logo_url?: string
  website?: string
  colors: BrandColors
}

export type UpdateBrandInput = Partial<Omit<CreateBrandInput, 'colors'> & { colors: Partial<BrandColors> }>

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
  await writeFile(path.join(dir, 'brand.json'), JSON.stringify(brand, null, 2))
  return brand
}

export async function getBrand(id: string): Promise<BrandRecord | null> {
  try {
    const data = await readFile(path.join(BRANDS_DIR, id, 'brand.json'), 'utf-8')
    return JSON.parse(data) as BrandRecord
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
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
  await writeFile(path.join(BRANDS_DIR, id, 'brand.json'), JSON.stringify(updated, null, 2))
  return updated
}

export async function deleteBrand(id: string): Promise<boolean> {
  try {
    await rm(path.join(BRANDS_DIR, id), { recursive: true, force: false })
    return true
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw err
  }
}
