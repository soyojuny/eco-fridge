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

interface ModifyCommand {
  action: 'CONSUME' | 'DISCARD' | 'UPDATE';
  target_id: string | null;
  target_name?: string;
  updates: {
    storage_method?: 'fridge' | 'freezer' | 'pantry';
    quantity?: number;
    status?: 'consumed' | 'discarded';
  };
}

type VoiceCommand = AddCommand | ModifyCommand;

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

    // 현재 인벤토리 조회 (active 상태인 아이템만)
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('id, name, category, storage_method, quantity')
      .eq('status', 'active');

    if (fetchError) {
      console.error('Inventory fetch error:', fetchError);
      return NextResponse.json({ error: '인벤토리를 불러올 수 없습니다.' }, { status: 500 });
    }

    // Gemini API 호출
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = generateVoiceCommandPrompt(items || []) + `\n\n# User Command:\n${command}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // JSON 파싱
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

    // 명령 처리
    const results: CommandResult[] = [];

    for (const cmd of commands) {
      try {
        if (cmd.action === 'ADD') {
          const addCmd = cmd as AddCommand;
          const { error: insertError } = await supabase
            .from('items')
            .insert({
              name: addCmd.item.name,
              category: addCmd.item.category || null,
              storage_method: addCmd.item.storage_method || 'fridge',
              status: 'active',
              purchase_date: new Date().toISOString().split('T')[0],
              expiry_date: addCmd.item.expiry_date,
              is_estimated: true,
              quantity: addCmd.item.quantity || 1,
            });

          if (insertError) {
            results.push({ action: 'ADD', success: false, itemName: addCmd.item.name, error: insertError.message });
          } else {
            results.push({ action: 'ADD', success: true, itemName: addCmd.item.name });
          }
        } else {
          const modifyCmd = cmd as ModifyCommand;

          if (!modifyCmd.target_id) {
            results.push({
              action: modifyCmd.action,
              success: false,
              itemName: modifyCmd.target_name,
              error: '해당 품목을 찾을 수 없습니다.',
            });
            continue;
          }

          const updates: Record<string, unknown> = {};

          if (modifyCmd.action === 'CONSUME') {
            updates.status = 'consumed';
          } else if (modifyCmd.action === 'DISCARD') {
            updates.status = 'discarded';
          } else if (modifyCmd.action === 'UPDATE') {
            if (modifyCmd.updates.storage_method) {
              updates.storage_method = modifyCmd.updates.storage_method;
            }
            if (modifyCmd.updates.quantity !== undefined) {
              updates.quantity = modifyCmd.updates.quantity;
            }
          }

          const { error: updateError } = await supabase
            .from('items')
            .update(updates)
            .eq('id', modifyCmd.target_id);

          // 품목 이름 조회
          const targetItem = items?.find((item) => item.id === modifyCmd.target_id);
          const itemName = targetItem?.name || modifyCmd.target_name || '알 수 없음';

          if (updateError) {
            results.push({ action: modifyCmd.action, success: false, itemName, error: updateError.message });
          } else {
            results.push({ action: modifyCmd.action, success: true, itemName });
          }
        }
      } catch (err) {
        results.push({
          action: cmd.action,
          success: false,
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
