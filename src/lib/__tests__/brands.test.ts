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
