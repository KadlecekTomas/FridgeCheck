import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/supabase-v2'

function localSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Local Supabase public E2E configuration is missing')
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

test('an authenticated outsider cannot read or mutate another household through the public client', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const password = 'FridgeCheck-isolation-123!'
  const owner = localSupabaseClient()
  const outsider = localSupabaseClient()

  const { data: ownerAuth, error: ownerAuthError } = await owner.auth.signUp({
    email: `owner-${suffix}@example.com`,
    password,
  })
  expect(ownerAuthError).toBeNull()
  expect(ownerAuth.session).not.toBeNull()

  const { data: outsiderAuth, error: outsiderAuthError } = await outsider.auth.signUp({
    email: `outsider-${suffix}@example.com`,
    password,
  })
  expect(outsiderAuthError).toBeNull()
  expect(outsiderAuth.session).not.toBeNull()

  const { data: householdId, error: householdError } = await owner.rpc('create_household', {
    household_name: 'Soukromá domácnost',
  })
  expect(householdError).toBeNull()
  expect(householdId).toBeTruthy()

  const { data: ownerStorage, error: storageError } = await owner
    .from('storage_units')
    .select('id, name')
    .eq('household_id', householdId!)
    .single()
  expect(storageError).toBeNull()
  expect(ownerStorage?.name).toBe('Lednice')

  const { data: batchId, error: productWriteError } = await owner.rpc('create_product_with_batch', {
    p_household_id: householdId!,
    p_storage_unit_id: ownerStorage!.id,
    p_name: 'Soukromá vejce',
    p_quantity: 2,
    p_unit: 'pcs',
    p_expiry_type: 'unknown',
  })
  expect(productWriteError).toBeNull()
  expect(batchId).toBeTruthy()

  const { data: ownerProduct, error: productError } = await owner
    .from('products')
    .select('id')
    .eq('household_id', householdId!)
    .single()
  expect(productError).toBeNull()
  expect(ownerProduct?.id).toBeTruthy()

  const foreignReads = await Promise.all([
    outsider.from('households').select('id').eq('id', householdId!),
    outsider.from('household_members').select('household_id').eq('household_id', householdId!),
    outsider.from('storage_units').select('id').eq('household_id', householdId!),
    outsider.from('products').select('id').eq('household_id', householdId!),
    outsider.from('inventory_batches').select('id').eq('household_id', householdId!),
    outsider.from('inventory_events').select('id').eq('household_id', householdId!),
  ])

  for (const result of foreignReads) {
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  }

  const foreignStorageUpdate = await outsider
    .from('storage_units')
    .update({ name: 'Napadená lednice' })
    .eq('id', ownerStorage!.id)
    .select('id')
  expect(foreignStorageUpdate.error).toBeNull()
  expect(foreignStorageUpdate.data).toEqual([])

  const foreignBatchUpdate = await outsider
    .from('inventory_batches')
    .update({ quantity: 999 })
    .eq('id', batchId!)
    .select('id')
  expect(foreignBatchUpdate.error).toBeNull()
  expect(foreignBatchUpdate.data).toEqual([])

  const foreignProductInsert = await outsider.from('products').insert({
    household_id: householdId!,
    name: 'Cizí produkt',
    default_unit: 'pcs',
  })
  expect(foreignProductInsert.error).not.toBeNull()

  const foreignBatchRpc = await outsider.rpc('add_batch_to_product', {
    p_product_id: ownerProduct!.id,
    p_storage_unit_id: ownerStorage!.id,
    p_quantity: 1,
    p_unit: 'pcs',
    p_expiry_type: 'unknown',
  })
  expect(foreignBatchRpc.error).not.toBeNull()
  expect(foreignBatchRpc.data).toBeNull()

  const { data: unchangedStorage, error: unchangedStorageError } = await owner
    .from('storage_units')
    .select('name')
    .eq('id', ownerStorage!.id)
    .single()
  expect(unchangedStorageError).toBeNull()
  expect(unchangedStorage?.name).toBe('Lednice')

  const { data: unchangedBatch, error: unchangedBatchError } = await owner
    .from('inventory_batches')
    .select('quantity')
    .eq('id', batchId!)
    .single()
  expect(unchangedBatchError).toBeNull()
  expect(Number(unchangedBatch?.quantity)).toBe(2)

  await Promise.all([owner.auth.signOut(), outsider.auth.signOut()])
})
