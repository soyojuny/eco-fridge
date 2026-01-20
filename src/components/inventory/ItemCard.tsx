'use client';

import { useState, useRef } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Trash2, Edit2, Check, MoreVertical, Snowflake, Thermometer, Home } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Item, StorageMethod } from '@/types/database';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onConsume: (id: string) => void;
  onDelete: (id: string) => void;
}

const storageIcons: Record<StorageMethod, React.ReactNode> = {
  fridge: <Thermometer className="w-4 h-4" />,
  freezer: <Snowflake className="w-4 h-4" />,
  pantry: <Home className="w-4 h-4" />,
};

const storageLabels: Record<StorageMethod, string> = {
  fridge: '냉장',
  freezer: '냉동',
  pantry: '실온',
};

export function ItemCard({ item, onEdit, onConsume, onDelete }: ItemCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const expiryDate = new Date(item.expiry_date);
  const daysUntilExpiry = differenceInDays(expiryDate, new Date());
  const isExpired = isPast(expiryDate);

  const getExpiryColor = () => {
    if (isExpired) return 'text-red-600 bg-red-50';
    if (daysUntilExpiry <= 3) return 'text-orange-600 bg-orange-50';
    if (daysUntilExpiry <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getExpiryText = () => {
    if (isExpired) return `${Math.abs(daysUntilExpiry)}일 지남`;
    if (daysUntilExpiry === 0) return '오늘 만료';
    return `${daysUntilExpiry}일 남음`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.touches[0].clientX;
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 120));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 80) {
      // 스와이프 액션 트리거
      setSwipeOffset(120);
    } else {
      setSwipeOffset(0);
    }
    setTouchStart(null);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe Actions Background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ width: `${swipeOffset}px` }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-1/2 rounded-none bg-green-500 text-white hover:bg-green-600"
          onClick={() => {
            onConsume(item.id);
            setSwipeOffset(0);
          }}
        >
          <Check className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-1/2 rounded-none bg-red-500 text-white hover:bg-red-600"
          onClick={() => {
            onDelete(item.id);
            setSwipeOffset(0);
          }}
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Card Content */}
      <Card
        ref={cardRef}
        className="p-4 transition-transform touch-pan-y"
        style={{ transform: `translateX(-${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{item.name}</h3>
              {item.is_estimated && (
                <span className="text-xs text-orange-500 shrink-0">(추정)</span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                {storageIcons[item.storage_method]}
                {storageLabels[item.storage_method]}
              </span>
              {item.category && (
                <span className="bg-gray-100 px-2 py-0.5 rounded truncate">
                  {item.category}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-right ${getExpiryColor()} px-2 py-1 rounded`}>
              <p className="text-xs">
                {format(expiryDate, 'M/d', { locale: ko })}
              </p>
              <p className="text-xs font-medium">
                {getExpiryText()}
              </p>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto">
                <SheetHeader>
                  <SheetTitle>{item.name}</SheetTitle>
                </SheetHeader>
                <div className="grid gap-2 py-4">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => onEdit(item)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    수정하기
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-green-600"
                    onClick={() => onConsume(item.id)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    소비 완료
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start text-red-600"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    버리기
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {item.memo && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-1">{item.memo}</p>
        )}
      </Card>
    </div>
  );
}
