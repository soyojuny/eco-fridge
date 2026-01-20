import type { StorageMethod } from '@/types/database';

// 카테고리별 기본 유통기한 (일 단위)
export const CATEGORY_EXPIRY_DEFAULTS: Record<string, Record<StorageMethod, number | null>> = {
  '유제품': { fridge: 7, freezer: 30, pantry: null },
  '육류': { fridge: 3, freezer: 90, pantry: null },
  '해산물': { fridge: 2, freezer: 90, pantry: null },
  '채소': { fridge: 7, freezer: 30, pantry: 3 },
  '과일': { fridge: 7, freezer: 30, pantry: 5 },
  '가공식품': { fridge: 30, freezer: 180, pantry: 90 },
  '음료': { fridge: 14, freezer: null, pantry: 30 },
  '조미료': { fridge: 90, freezer: null, pantry: 180 },
  '빵/베이커리': { fridge: 7, freezer: 30, pantry: 3 },
  '달걀': { fridge: 21, freezer: 120, pantry: null },
  '두부/콩류': { fridge: 5, freezer: 60, pantry: null },
  '김치/발효식품': { fridge: 30, freezer: 90, pantry: null },
  '간편식/냉동식품': { fridge: 3, freezer: 180, pantry: null },
  '과자/스낵': { fridge: null, freezer: null, pantry: 60 },
  '화장품': { fridge: null, freezer: null, pantry: 365 },
  '기타': { fridge: 7, freezer: 30, pantry: 14 },
};

export const CATEGORIES = Object.keys(CATEGORY_EXPIRY_DEFAULTS);

// 보관 방법 변경 시 유통기한 조정 비율
export const STORAGE_ADJUSTMENT_RATIO: Record<string, Record<string, number>> = {
  'fridge_to_freezer': { multiplier: 3 },
  'pantry_to_fridge': { multiplier: 2 },
  'pantry_to_freezer': { multiplier: 6 },
  'freezer_to_fridge': { multiplier: 0.3 },
  'freezer_to_pantry': { multiplier: 0.1 },
  'fridge_to_pantry': { multiplier: 0.5 },
};

export function getDefaultExpiryDays(category: string, storageMethod: StorageMethod): number {
  const categoryDefaults = CATEGORY_EXPIRY_DEFAULTS[category] || CATEGORY_EXPIRY_DEFAULTS['기타'];
  return categoryDefaults[storageMethod] || 7;
}

export function calculateNewExpiryDate(
  currentExpiryDate: Date,
  fromStorage: StorageMethod,
  toStorage: StorageMethod
): Date {
  if (fromStorage === toStorage) return currentExpiryDate;

  const key = `${fromStorage}_to_${toStorage}`;
  const adjustment = STORAGE_ADJUSTMENT_RATIO[key];

  if (!adjustment) return currentExpiryDate;

  const today = new Date();
  const remainingDays = Math.max(0, Math.ceil((currentExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const newRemainingDays = Math.round(remainingDays * adjustment.multiplier);

  const newDate = new Date(today);
  newDate.setDate(newDate.getDate() + newRemainingDays);

  return newDate;
}

export function getStorageMethodLabel(method: StorageMethod): string {
  const labels: Record<StorageMethod, string> = {
    fridge: '냉장',
    freezer: '냉동',
    pantry: '실온',
  };
  return labels[method];
}
