'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Check, X, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { CATEGORIES, getDefaultExpiryDays, getStorageMethodLabel } from '@/lib/expiry-defaults';
import type { StorageMethod } from '@/types/database';

interface ParsedItem {
  name: string;
  category: string;
  quantity: number;
  expiry_date: string | null;
  storage_method: StorageMethod;
  is_estimated: boolean;
}

interface ItemConfirmDialogProps {
  open: boolean;
  items: ParsedItem[];
  onConfirm: (items: ParsedItem[]) => void;
  onCancel: () => void;
}

export function ItemConfirmDialog({ open, items: initialItems, onConfirm, onCancel }: ItemConfirmDialogProps) {
  const [items, setItems] = useState<ParsedItem[]>(initialItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, updates: Partial<ParsedItem>) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;

      const updated = { ...item, ...updates };

      // 카테고리나 보관방법이 변경되고 날짜가 추정치인 경우, 유통기한 재계산
      if ((updates.category || updates.storage_method) && item.is_estimated) {
        const category = updates.category || item.category;
        const storageMethod = updates.storage_method || item.storage_method;
        const days = getDefaultExpiryDays(category, storageMethod);
        updated.expiry_date = format(addDays(new Date(), days), 'yyyy-MM-dd');
      }

      return updated;
    }));
    setEditingIndex(null);
  };

  const handleConfirm = () => {
    if (items.length > 0) {
      onConfirm(items);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>인식된 품목 확인</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              등록할 품목이 없습니다.
            </p>
          ) : (
            items.map((item, index) => (
              <Card key={index} className="p-3">
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <Input
                      value={item.name}
                      onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                      placeholder="품목명"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={item.category}
                        onValueChange={(value) => handleUpdateItem(index, { category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        placeholder="수량"
                      />
                    </div>
                    <Select
                      value={item.storage_method}
                      onValueChange={(value) => handleUpdateItem(index, { storage_method: value as StorageMethod })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="보관방법" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fridge">냉장</SelectItem>
                        <SelectItem value="freezer">냉동</SelectItem>
                        <SelectItem value="pantry">실온</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={item.expiry_date || ''}
                      onChange={(e) => handleUpdateItem(index, {
                        expiry_date: e.target.value,
                        is_estimated: false
                      })}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingIndex(null)}
                        className="flex-1"
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setEditingIndex(null)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        확인
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex gap-2 text-sm text-gray-500 mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {getStorageMethodLabel(item.storage_method)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        유통기한: {item.expiry_date ? format(new Date(item.expiry_date), 'yyyy년 M월 d일', { locale: ko }) : '미정'}
                        {item.is_estimated && <span className="text-orange-500 ml-1">(추정)</span>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingIndex(index)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={items.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            {items.length}개 등록
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
