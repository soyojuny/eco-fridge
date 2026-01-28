'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useItemStore } from '@/store/useItemStore';
import type { Item } from '@/types/database';
import { useEffect } from 'react';

interface ParsedItem {
  name: string;
  category: string;
  quantity: number;
  expiry_date: string | null;
  storage_method: 'fridge' | 'freezer' | 'pantry';
  is_estimated: boolean;
}

// 아이템 목록 조회
async function fetchItems(): Promise<Item[]> {
  const response = await fetch('/api/items');
  if (!response.ok) {
    throw new Error('아이템을 불러올 수 없습니다.');
  }
  const data = await response.json();
  return data.items;
}

// 아이템 추가
async function createItems(items: ParsedItem[]): Promise<Item[]> {
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!response.ok) {
    throw new Error('아이템을 추가할 수 없습니다.');
  }
  const data = await response.json();
  return data.items;
}

// 아이템 수정
async function updateItem({ id, updates }: { id: string; updates: Partial<Item> }): Promise<Item> {
  const response = await fetch(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('아이템을 수정할 수 없습니다.');
  }
  const data = await response.json();
  return data.item;
}

// 아이템 삭제
async function deleteItem(id: string): Promise<void> {
  const response = await fetch(`/api/items/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('아이템을 삭제할 수 없습니다.');
  }
}

export function useItems() {
  const queryClient = useQueryClient();
  const { setItems } = useItemStore();

  const query = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  // Zustand 스토어에 동기화
  useEffect(() => {
    if (query.data) {
      setItems(query.data);
    }
  }, [query.data, setItems]);

  const createMutation = useMutation({
    mutationFn: createItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createItems: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
