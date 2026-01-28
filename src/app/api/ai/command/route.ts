import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateVoiceCommandPrompt } from '@/lib/prompts/voice-command-parser';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

type ActionType = 'ADD' | 'CONSUME' | 'DISCARD' | 'UPDATE';

interface AddCommand {
  action: 'ADD';
  item: {
    name: string;
    category: string;
    quantity: number;
    storage_method: 'fridge' | 'freezer' | 'pantry';
    expiry_date: string;
  };
}

interface ConsumeCommand {
  action: 'CONSUME';
  target_id: string | null;
  target_name?: string;
  updates: {
    consumed_quantity?: number;
    consume_all?: boolean;
  };
}

interface UpdateCommand {
  action: 'UPDATE';
  target_id: string | null;
  target_name?: string;
  updates: {
    storage_method?: 'fridge' | 'freezer' | 'pantry';
    quantity?: number;
  };
}

interface DiscardCommand {
  action: 'DISCARD';
  target_id: string | null;
  target_name?: string;
  updates: {
    status: 'discarded';
  };
}

type VoiceCommand = AddCommand | ConsumeCommand | UpdateCommand | DiscardCommand;

interface CommandResult {
  action: ActionType;
  success: boolean;
  itemName?: string;
  error?: string;
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
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('id, name, category, storage_method, quantity')
      .eq('status', 'active');

    if (fetchError) {
      console.error('Inventory fetch error:', fetchError);
      return NextResponse.json({ error: '인벤토리를 불러올 수 없습니다.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = generateVoiceCommandPrompt(items || []) + `\n\n# User Command:\n${command}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let commands: VoiceCommand[];
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      commands = JSON.parse(jsonStr);
    } catch {
      console.error('JSON 파싱 실패:', responseText);
      return NextResponse.json({ error: '명령을 이해하지 못했습니다.', raw: responseText }, { status: 400 });
    }

    if (!Array.isArray(commands) || commands.length === 0) {
      return NextResponse.json({ error: '처리할 명령이 없습니다.' }, { status: 400 });
    }

    const results: CommandResult[] = [];

    for (const cmd of commands) {
      try {
        const action = cmd.action;
        const itemName = 'item' in cmd ? cmd.item.name : cmd.target_name || '알 수 없음';

        if (action === 'ADD') {
          const { error } = await supabase.from('items').insert({
            name: cmd.item.name,
            category: cmd.item.category || null,
            storage_method: cmd.item.storage_method || 'fridge',
            status: 'active',
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: cmd.item.expiry_date,
            is_estimated: true,
            quantity: cmd.item.quantity || 1,
          });
          results.push({ action, success: !error, itemName, error: error?.message });
          continue;
        }

        // --- CONSUME, UPDATE, DISCARD ---
        if (!cmd.target_id) {
          results.push({ action, success: false, itemName, error: '해당 품목을 찾을 수 없습니다.' });
          continue;
        }

        const targetItem = items?.find((item) => item.id === cmd.target_id);
        const currentItemName = targetItem?.name || itemName;

        if (!targetItem && action !== 'DISCARD') { // DISCARD는 아이템이 없어도 진행 가능
           results.push({ action, success: false, itemName: currentItemName, error: '인벤토리에서 해당 품목을 찾을 수 없습니다.' });
           continue;
        }

        let updates: Record<string, unknown> = {};
        
        if (action === 'CONSUME') {
          if (cmd.updates.consume_all) {
            updates = { status: 'consumed', quantity: 0 };
          } else if (cmd.updates.consumed_quantity && targetItem) {
            const newQuantity = (targetItem.quantity || 1) - cmd.updates.consumed_quantity;
            updates = { quantity: newQuantity };
            if (newQuantity <= 0) {
              updates.status = 'consumed';
            }
          }
        } else if (action === 'UPDATE') {
          if (cmd.updates.storage_method) updates.storage_method = cmd.updates.storage_method;
          if (cmd.updates.quantity !== undefined) updates.quantity = cmd.updates.quantity;
        } else if (action === 'DISCARD') {
          updates = { status: 'discarded' };
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from('items').update(updates).eq('id', cmd.target_id);
          results.push({ action, success: !error, itemName: currentItemName, error: error?.message });
        } else {
          results.push({ action, success: false, itemName: currentItemName, error: '수행할 업데이트 작업이 없습니다.' });
        }

      } catch (err) {
        results.push({
          action: cmd.action,
          success: false,
          itemName: 'item' in cmd ? cmd.item.name : cmd.target_name,
          error: err instanceof Error ? err.message : '알 수 없는 오류',
        });
      }
    }

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
