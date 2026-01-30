import { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ItemInsert, ItemUpdate } from '@/types/database';
import type { InventoryItem } from '@/types/command';

type Supabase = SupabaseClient<Database>;

/**
 * Fetches all active items from the inventory.
 * @param supabase The Supabase client instance.
 * @returns A promise that resolves to an array of active items.
 */
export async function getActiveItems(supabase: Supabase): Promise<InventoryItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('items')
    .select('id, name, category, storage_method, quantity')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching active items:', error);
    throw new Error('Failed to fetch inventory.');
  }
  return data || [];
}

/**
 * Adds a new item to the database.
 * @param supabase The Supabase client instance.
 * @param item The item data to insert.
 * @returns A promise that resolves when the operation is complete.
 */
export async function addItem(supabase: Supabase, item: Omit<ItemInsert, 'user_id'>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('items').insert(item);
  if (error) {
    console.error('Error adding item:', error);
    throw new Error(`Failed to add item: ${item.name}`);
  }
  return { success: true };
}

/**
 * Updates an existing item in the database.
 * @param supabase The Supabase client instance.
 * @param id The ID of the item to update.
 * @param updates The partial data to update.
 * @returns A promise that resolves when the operation is complete.
 */
export async function updateItem(supabase: Supabase, id: string, updates: ItemUpdate) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('items').update(updates).eq('id', id);
  if (error) {
    console.error(`Error updating item ${id}:`, error);
    throw new Error(`Failed to update item.`);
  }
  return { success: true };
}
