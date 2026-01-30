import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseVoiceCommand } from '@/lib/services/ai.service';
import { getActiveItems, addItem, updateItem } from '@/lib/services/item.service';
import {
  VoiceCommand,
  CommandResult,
  AddCommand,
  ConsumeCommand,
  UpdateCommand,
  DiscardCommand,
} from '@/types/command';
import { ItemUpdate } from '@/types/database';

async function handleCommand(cmd: VoiceCommand, supabase: Awaited<ReturnType<typeof createClient>>, items: Awaited<ReturnType<typeof getActiveItems>>): Promise<CommandResult> {
  const action = cmd.action;
  const itemName = 'item' in cmd ? cmd.item.name : cmd.target_name || '알 수 없음';

  try {
    if (action === 'ADD') {
      const newCmd = cmd as AddCommand;
      await addItem(supabase, {
        name: newCmd.item.name,
        category: newCmd.item.category || null,
        storage_method: newCmd.item.storage_method || 'fridge',
        status: 'active',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: newCmd.item.expiry_date,
        is_estimated: true,
        quantity: newCmd.item.quantity || 1,
        image_url: null,
        memo: null,
      });
      return { action, success: true, itemName };
    }

    // --- CONSUME, UPDATE, DISCARD ---
    const targetCmd = cmd as ConsumeCommand | UpdateCommand | DiscardCommand;
    if (!targetCmd.target_id) {
      return { action, success: false, itemName, error: '해당 품목을 찾을 수 없습니다.' };
    }

    const targetItem = items.find((item) => item.id === targetCmd.target_id);
    const currentItemName = targetItem?.name || itemName;
    
    if (!targetItem && action !== 'DISCARD') {
      return { action, success: false, itemName: currentItemName, error: '인벤토리에서 해당 품목을 찾을 수 없습니다.' };
    }

    let updates: ItemUpdate = {};
    if (action === 'CONSUME') {
      const consumeCmd = cmd as ConsumeCommand;
      if (consumeCmd.updates.consume_all) {
        updates = { status: 'consumed', quantity: 0 };
      } else if (consumeCmd.updates.consumed_quantity && targetItem) {
        const newQuantity = (targetItem.quantity || 1) - consumeCmd.updates.consumed_quantity;
        updates = { quantity: newQuantity };
        if (newQuantity <= 0) {
          updates.status = 'consumed';
        }
      }
    } else if (action === 'UPDATE') {
      updates = (cmd as UpdateCommand).updates;
    } else if (action === 'DISCARD') {
      updates = { status: 'discarded' };
    }

    if (Object.keys(updates).length > 0) {
      await updateItem(supabase, targetCmd.target_id, updates);
      return { action, success: true, itemName: currentItemName };
    } else {
      return { action, success: false, itemName: currentItemName, error: '수행할 업데이트 작업이 없습니다.' };
    }
  } catch (err) {
    return {
      action,
      success: false,
      itemName,
      error: err instanceof Error ? err.message : '알 수 없는 오류',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: '음성 명령이 필요합니다.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const supabase = await createClient();
    const items = await getActiveItems(supabase);
    const commands = await parseVoiceCommand(command, items);

    if (!Array.isArray(commands) || commands.length === 0) {
      return NextResponse.json({ error: '처리할 명령이 없습니다.' }, { status: 400 });
    }

    const results: CommandResult[] = await Promise.all(
      commands.map((cmd) => handleCommand(cmd, supabase, items))
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Voice command error:', error);
    return NextResponse.json(
      {
        error: '음성 명령 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
