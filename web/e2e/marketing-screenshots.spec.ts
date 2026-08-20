import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const screenshotDir = join(process.cwd(), 'marketing-screenshots')

function dateFromToday(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

test.use({ viewport: { width: 1440, height: 1000 } })

test('capture polished real-product marketing screens', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) throw new Error('Missing local Supabase browser credentials')

  await mkdir(screenshotDir, { recursive: true })

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `marketing-${suffix}@example.com`
  const password = 'FridgeCheck-marketing-123!'
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) throw signUpError

  const { data: householdId, error: householdError } = await supabase.rpc('create_household', {
    household_name: 'Naše domácnost',
  })
  if (householdError || !householdId) throw householdError ?? new Error('Household was not created')

  const { data: storageUnits, error: storageError } = await supabase
    .from('storage_units')
    .select('id,name')
    .eq('household_id', householdId)
  if (storageError) throw storageError

  const fridgeId = storageUnits?.find((item) => item.name === 'Lednice')?.id
  if (!fridgeId) throw new Error('Default fridge is missing')

  const { data: extraStorage, error: extraStorageError } = await supabase
    .from('storage_units')
    .insert([
      { household_id: householdId, name: 'Mrazák', type: 'freezer' },
      { household_id: householdId, name: 'Spíž', type: 'pantry' },
    ])
    .select('id,name')
  if (extraStorageError) throw extraStorageError

  const freezerId = extraStorage?.find((item) => item.name === 'Mrazák')?.id
  const pantryId = extraStorage?.find((item) => item.name === 'Spíž')?.id
  if (!freezerId || !pantryId) throw new Error('Demo storage units were not created')

  async function addProduct({
    name,
    quantity,
    unit,
    storageId,
    expiryDays,
    expiryType = 'unknown',
    packageQuantity,
  }: {
    name: string
    quantity: number
    unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs'
    storageId: string
    expiryDays?: number
    expiryType?: 'use_by' | 'best_before' | 'unknown'
    packageQuantity?: number
  }) {
    const { data: batchId, error } = await supabase.rpc('create_or_add_product_batch', {
      p_household_id: householdId,
      p_storage_unit_id: storageId,
      p_name: name,
      p_quantity: quantity,
      p_unit: unit,
      p_expiry_type: expiryDays === undefined ? 'unknown' : expiryType,
      ...(expiryDays === undefined ? {} : { p_expiry_date: dateFromToday(expiryDays) }),
      ...(packageQuantity ? { p_package_quantity: packageQuantity, p_package_unit: unit } : {}),
    })
    if (error || !batchId) throw error ?? new Error(`Could not add ${name}`)

    const { data: batch, error: batchError } = await supabase
      .from('inventory_batches')
      .select('product_id')
      .eq('id', batchId)
      .single()
    if (batchError || !batch) throw batchError ?? new Error(`Could not resolve ${name}`)
    return batch.product_id
  }

  const yogurtId = await addProduct({
    name: 'Řecký jogurt', quantity: 2, unit: 'pcs', storageId: fridgeId,
    expiryDays: 1, expiryType: 'use_by',
  })
  await addProduct({
    name: 'Kuřecí prsa', quantity: 600, unit: 'g', storageId: fridgeId,
    expiryDays: 2, expiryType: 'use_by',
  })
  await addProduct({
    name: 'Mléko 1,5 %', quantity: 2, unit: 'l', storageId: fridgeId,
    expiryDays: 3, expiryType: 'use_by',
  })
  const eggsId = await addProduct({
    name: 'Vejce', quantity: 6, unit: 'pcs', storageId: fridgeId,
    expiryDays: 6, expiryType: 'best_before',
  })
  const pastaId = await addProduct({
    name: 'Těstoviny', quantity: 500, unit: 'g', storageId: pantryId,
    expiryDays: 90, expiryType: 'best_before', packageQuantity: 500,
  })
  await addProduct({ name: 'Rýže basmati', quantity: 1, unit: 'kg', storageId: pantryId })
  await addProduct({ name: 'Rajčata', quantity: 4, unit: 'pcs', storageId: fridgeId })
  await addProduct({ name: 'Mražený špenát', quantity: 450, unit: 'g', storageId: freezerId })

  const { error: targetError } = await supabase.from('stock_targets').insert([
    {
      household_id: householdId,
      product_id: eggsId,
      minimum_quantity: 10,
      target_quantity: 20,
      unit: 'pcs',
    },
    {
      household_id: householdId,
      product_id: pastaId,
      minimum_quantity: 750,
      target_quantity: 1500,
      unit: 'g',
    },
  ])
  if (targetError) throw targetError

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Authenticated user missing')

  const { error: shoppingError } = await supabase.from('shopping_list_items').insert([
    {
      household_id: householdId,
      created_by: userData.user.id,
      name: 'Chléb',
      quantity: 1,
      unit: 'pcs',
      source: 'manual',
    },
    {
      household_id: householdId,
      created_by: userData.user.id,
      name: 'Jablka',
      quantity: 6,
      unit: 'pcs',
      source: 'manual',
    },
  ])
  if (shoppingError) throw shoppingError

  const { data: yogurtBatch, error: yogurtBatchError } = await supabase
    .from('inventory_batches')
    .select('id')
    .eq('household_id', householdId)
    .eq('product_id', yogurtId)
    .single()
  if (yogurtBatchError || !yogurtBatch) throw yogurtBatchError ?? new Error('Yogurt batch missing')

  const { error: correctionError } = await supabase.rpc('correct_inventory_batch', {
    p_batch_id: yogurtBatch.id,
    p_new_quantity: 3,
  })
  if (correctionError) throw correctionError

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Heslo').fill(password)
  await page.getByRole('button', { name: 'Přihlásit se' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Co dnes potřebuje pozornost' })).toBeVisible()
  await page.screenshot({ path: join(screenshotDir, '01-dashboard.png'), fullPage: true })

  await page.getByRole('link', { name: 'Zásoby', exact: true }).click()
  await expect(page).toHaveURL(/\/inventory$/)
  await expect(page.getByRole('heading', { name: 'Zásoby' })).toBeVisible()
  await page.screenshot({ path: join(screenshotDir, '02-inventory.png'), fullPage: true })

  await page.getByRole('link', { name: 'Přidat jídlo' }).click()
  await expect(page).toHaveURL(/\/inventory\/new$/)
  await expect(page.getByRole('heading', { name: 'Přidat jídlo' })).toBeVisible()
  await page.screenshot({ path: join(screenshotDir, '03-add-food.png'), fullPage: true })

  await page.getByRole('link', { name: 'Nákup', exact: true }).click()
  await expect(page).toHaveURL(/\/shopping$/)
  await expect(page.getByRole('heading', { name: 'Nákup' })).toBeVisible()
  await page.screenshot({ path: join(screenshotDir, '04-shopping.png'), fullPage: true })

  await page.getByRole('link', { name: 'Více', exact: true }).click()
  await page.getByRole('link', { name: /Historie změn/ }).click()
  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByRole('heading', { name: 'Historie změn' })).toBeVisible()
  await page.screenshot({ path: join(screenshotDir, '05-history.png'), fullPage: true })
})
