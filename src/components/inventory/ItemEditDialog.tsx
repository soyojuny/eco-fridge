'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES, getStorageMethodLabel, calculateNewExpiryDate } from '@/lib/expiry-defaults';
import type { Item, StorageMethod } from '@/types/database';

interface ItemEditDialogProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Item>) => void;
}

export function ItemEditDialog({ item, open, onClose, onSave }: ItemEditDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [storageMethod, setStorageMethod] = useState<StorageMethod>('fridge');
  const [expiryDate, setExpiryDate] = useState('');
  const [memo, setMemo] = useState('');
  const [showStorageHint, setShowStorageHint] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category || '');
      setStorageMethod(item.storage_method);
      setExpiryDate(item.expiry_date);
      setMemo(item.memo || '');
      setShowStorageHint(false);
      setSuggestedDate(null);
    }
  }, [item]);

  const handleStorageMethodChange = (newMethod: StorageMethod) => {
    if (item && newMethod !== storageMethod) {
      const currentExpiryDate = new Date(expiryDate);
      const newDate = calculateNewExpiryDate(currentExpiryDate, storageMethod, newMethod);
      const formattedDate = format(newDate, 'yyyy-MM-dd');

      if (formattedDate !== expiryDate) {
        setSuggestedDate(formattedDate);
        setShowStorageHint(true);
      }
    }
    setStorageMethod(newMethod);
  };

  const acceptSuggestedDate = () => {
    if (suggestedDate) {
      setExpiryDate(suggestedDate);
      setShowStorageHint(false);
      setSuggestedDate(null);
    }
  };

  const dismissSuggestedDate = () => {
    setShowStorageHint(false);
    setSuggestedDate(null);
  };

  const handleSave = () => {
    if (!item || !name.trim()) return;

    onSave(item.id, {
      name: name.trim(),
      category: category || null,
      storage_method: storageMethod,
      expiry_date: expiryDate,
      memo: memo.trim() || null,
    });

    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>품목 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">품목명</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="품목명을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">카테고리</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">보관 방법</label>
            <Select value={storageMethod} onValueChange={handleStorageMethodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fridge">{getStorageMethodLabel('fridge')}</SelectItem>
                <SelectItem value="freezer">{getStorageMethodLabel('freezer')}</SelectItem>
                <SelectItem value="pantry">{getStorageMethodLabel('pantry')}</SelectItem>
              </SelectContent>
            </Select>

            {showStorageHint && suggestedDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-700 mb-2">
                  보관 방법 변경에 따라 유통기한을 조정하시겠습니까?
                </p>
                <p className="text-blue-600 font-medium mb-2">
                  제안: {format(new Date(suggestedDate), 'yyyy년 M월 d일', { locale: ko })}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={dismissSuggestedDate}
                  >
                    유지
                  </Button>
                  <Button
                    size="sm"
                    onClick={acceptSuggestedDate}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    변경
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">유통기한</label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">메모</label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모를 입력하세요 (선택)"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
