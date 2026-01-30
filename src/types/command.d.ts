import { Item } from './database';

export type ActionType = 'ADD' | 'CONSUME' | 'DISCARD' | 'UPDATE';

export interface AddCommand {
  action: 'ADD';
  item: {
    name: string;
    category: string;
    quantity: number;
    storage_method: 'fridge' | 'freezer' | 'pantry';
    expiry_date: string;
  };
}

export interface ConsumeCommand {
  action: 'CONSUME';
  target_id: string | null;
  target_name?: string;
  updates: {
    consumed_quantity?: number;
    consume_all?: boolean;
  };
}

export interface UpdateCommand {
  action: 'UPDATE';
  target_id: string | null;
  target_name?: string;
  updates: {
    storage_method?: 'fridge' | 'freezer' | 'pantry';
    quantity?: number;
  };
}

export interface DiscardCommand {
  action: 'DISCARD';
  target_id: string | null;
  target_name?: string;
  updates: {
    status: 'discarded';
  };
}

export type VoiceCommand = AddCommand | ConsumeCommand | UpdateCommand | DiscardCommand;

export interface CommandResult {
  action: ActionType;
  success: boolean;
  itemName?: string;
  error?: string;
}

// Partial Item for inventory context
export type InventoryItem = Pick<Item, 'id' | 'name' | 'category' | 'storage_method' | 'quantity'>;
