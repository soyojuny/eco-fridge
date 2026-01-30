export interface ParsedItem {
  name: string;
  category: string;
  storage_method: 'fridge' | 'freezer' | 'pantry';
  quantity: number;
  expiry_date: string;
  is_estimated: boolean;
  confidence_reason: string;
}

export interface ParsedResponse {
  items: ParsedItem[];
}
