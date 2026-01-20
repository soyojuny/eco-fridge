import { create } from 'zustand';
import type { Item, StorageMethod } from '@/types/database';

interface ItemStore {
  items: Item[];
  filter: StorageMethod | 'all';
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  removeItem: (id: string) => void;
  setFilter: (filter: StorageMethod | 'all') => void;
}

export const useItemStore = create<ItemStore>((set) => ({
  items: [],
  filter: 'all',
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  setFilter: (filter) => set({ filter }),
}));
