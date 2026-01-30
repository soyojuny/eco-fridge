export type StorageMethod = 'fridge' | 'freezer' | 'pantry';
export type ItemStatus = 'active' | 'consumed' | 'discarded';

export interface Item {
  id: string;
  user_id?: string;
  created_at: string;
  name: string;
  category: string | null;
  storage_method: StorageMethod;
  status: ItemStatus;
  purchase_date: string;
  expiry_date: string;
  is_estimated: boolean;
  quantity: number;
  image_url: string | null;
  memo: string | null;
}

export type ItemInsert = Omit<Item, 'id' | 'created_at'>;
export type ItemUpdate = Partial<Omit<Item, 'id' | 'user_id' | 'created_at'>>;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      items: {
        Row: Item;
        Insert: ItemInsert;
        Update: ItemUpdate;
        Relationships: [];
      };
    };
  };
};
