'use client';

import { useMemo } from 'react';
import { ListTodo, Snowflake, Thermometer, Home, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItemCard } from './ItemCard';
import type { Item, StorageMethod } from '@/types/database';

type FilterType = StorageMethod | 'all';

interface ItemListProps {
  items: Item[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onEditItem: (item: Item) => void;
  onConsumeItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

const filterOptions: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '전체', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'fridge', label: '냉장', icon: <Thermometer className="w-4 h-4" /> },
  { value: 'freezer', label: '냉동', icon: <Snowflake className="w-4 h-4" /> },
  { value: 'pantry', label: '실온', icon: <Home className="w-4 h-4" /> },
];

export function ItemList({
  items,
  filter,
  onFilterChange,
  onEditItem,
  onConsumeItem,
  onDeleteItem,
}: ItemListProps) {
  const filteredItems = useMemo(() => {
    const activeItems = items.filter((item) => item.status === 'active');

    if (filter === 'all') {
      return activeItems;
    }

    return activeItems.filter((item) => item.storage_method === filter);
  }, [items, filter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  }, [filteredItems]);

  const stats = useMemo(() => {
    const activeItems = items.filter((item) => item.status === 'active');
    return {
      total: activeItems.length,
      fridge: activeItems.filter((item) => item.storage_method === 'fridge').length,
      freezer: activeItems.filter((item) => item.storage_method === 'freezer').length,
      pantry: activeItems.filter((item) => item.storage_method === 'pantry').length,
      expiringSoon: activeItems.filter((item) => {
        const days = Math.ceil(
          (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return days <= 3 && days >= 0;
      }).length,
    };
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(option.value)}
            className={`shrink-0 ${filter === option.value ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {option.icon}
            <span className="ml-1">{option.label}</span>
            <span className="ml-1 text-xs opacity-70">
              ({option.value === 'all' ? stats.total : stats[option.value]})
            </span>
          </Button>
        ))}
      </div>

      {/* Expiring Soon Alert */}
      {stats.expiringSoon > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
          ⚠️ {stats.expiringSoon}개 품목이 3일 이내에 만료됩니다.
        </div>
      )}

      {/* Item List */}
      {sortedItems.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <ListTodo className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>등록된 식품이 없습니다</p>
          <p className="text-sm mt-1">스캔 탭에서 식품을 추가하세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={onEditItem}
              onConsume={onConsumeItem}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
