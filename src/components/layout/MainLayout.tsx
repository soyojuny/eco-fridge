'use client';

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, ListTodo, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { Scanner } from '@/components/scanner/Scanner';
import { ItemConfirmDialog } from '@/components/scanner/ItemConfirmDialog';
import { ItemList } from '@/components/inventory/ItemList';
import { ItemEditDialog } from '@/components/inventory/ItemEditDialog';
import { Settings as SettingsPanel } from '@/components/settings/Settings';
import { useItems } from '@/hooks/useItems';
import { useItemStore } from '@/store/useItemStore';
import type { Item, StorageMethod } from '@/types/database';

interface ParsedItem {
  name: string;
  category: string;
  expiry_date: string | null;
  storage_method: StorageMethod;
  is_estimated: boolean;
}

export function MainLayout() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const { items, isLoading, createItems, updateItem, deleteItem } = useItems();
  const { filter, setFilter } = useItemStore();

  const handleItemsParsed = useCallback((items: ParsedItem[]) => {
    setParsedItems(items);
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmItems = useCallback(async (confirmedItems: ParsedItem[]) => {
    try {
      await createItems(confirmedItems);
      setShowConfirmDialog(false);
      setParsedItems([]);
      setActiveTab('inventory');
      toast.success(`${confirmedItems.length}개 품목이 등록되었습니다.`);
    } catch {
      toast.error('품목 등록에 실패했습니다.');
    }
  }, [createItems]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmDialog(false);
    setParsedItems([]);
  }, []);

  const handleEditItem = useCallback((item: Item) => {
    setEditingItem(item);
  }, []);

  const handleSaveItem = useCallback(async (id: string, updates: Partial<Item>) => {
    try {
      await updateItem({ id, updates });
      toast.success('품목이 수정되었습니다.');
    } catch {
      toast.error('품목 수정에 실패했습니다.');
    }
  }, [updateItem]);

  const handleConsumeItem = useCallback(async (id: string) => {
    try {
      await updateItem({ id, updates: { status: 'consumed' } });
      toast.success('소비 완료 처리되었습니다.');
    } catch {
      toast.error('처리에 실패했습니다.');
    }
  }, [updateItem]);

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteItem(id);
      toast.success('품목이 삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  }, [deleteItem]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-600 text-white p-4 shadow-md">
        <h1 className="text-xl font-bold text-center">Eco Fridge</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsContent value="inventory" className="p-4 m-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            ) : (
              <ItemList
                items={items}
                filter={filter}
                onFilterChange={setFilter}
                onEditItem={handleEditItem}
                onConsumeItem={handleConsumeItem}
                onDeleteItem={handleDeleteItem}
              />
            )}
          </TabsContent>

          <TabsContent value="scan" className="p-4 m-0">
            <Scanner onItemsParsed={handleItemsParsed} />
          </TabsContent>

          <TabsContent value="settings" className="p-4 m-0">
            <SettingsPanel />
          </TabsContent>

          {/* Bottom Navigation */}
          <TabsList className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t grid grid-cols-3 rounded-none">
            <TabsTrigger
              value="inventory"
              className="flex flex-col items-center justify-center gap-1 data-[state=active]:text-green-600"
            >
              <ListTodo className="w-5 h-5" />
              <span className="text-xs">목록</span>
            </TabsTrigger>
            <TabsTrigger
              value="scan"
              className="flex flex-col items-center justify-center gap-1 data-[state=active]:text-green-600"
            >
              <Camera className="w-5 h-5" />
              <span className="text-xs">스캔</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex flex-col items-center justify-center gap-1 data-[state=active]:text-green-600"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">설정</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>

      {/* Dialogs */}
      <ItemConfirmDialog
        open={showConfirmDialog}
        items={parsedItems}
        onConfirm={handleConfirmItems}
        onCancel={handleCancelConfirm}
      />

      <ItemEditDialog
        item={editingItem}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
      />
    </div>
  );
}
