'use client';

import { Bell, Database, ChevronRight, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
}

function SettingItem({ icon, title, description, onClick }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-500">{icon}</span>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}

export function Settings() {
  return (
    <div className="flex flex-col gap-4">
      {/* Settings Menu */}
      <Card className="overflow-hidden divide-y">
        <SettingItem
          icon={<Bell className="w-5 h-5" />}
          title="알림 설정"
          description="유통기한 알림 관리"
          onClick={() => toast.info('알림 설정 기능은 준비 중입니다.')}
        />
        <SettingItem
          icon={<Database className="w-5 h-5" />}
          title="데이터 관리"
          description="데이터 내보내기/가져오기"
          onClick={() => toast.info('데이터 관리 기능은 준비 중입니다.')}
        />
        <SettingItem
          icon={<HelpCircle className="w-5 h-5" />}
          title="도움말"
          description="앱 사용법 안내"
          onClick={() => toast.info('도움말 기능은 준비 중입니다.')}
        />
      </Card>

      {/* App Info */}
      <div className="text-center text-sm text-gray-400 mt-4">
        <p>Eco Fridge v1.0.0</p>
        <p>© 2024 Eco Fridge</p>
      </div>
    </div>
  );
}
