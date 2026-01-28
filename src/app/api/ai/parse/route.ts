import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { generateFoodScannerPrompt } from '@/lib/prompts/food-scanner';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

interface ParsedItem {
  name: string;
  category: string;
  storage_method: 'fridge' | 'freezer' | 'pantry';
  quantity: number;
  expiry_date: string;
  is_estimated: boolean;
  confidence_reason: string;
}

interface ParsedResponse {
  items: ParsedItem[];
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Base64 이미지에서 데이터 부분만 추출
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    // AI가 자동으로 이미지 타입(영수증/제품)을 감지
    const prompt = generateFoodScannerPrompt();

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // JSON 파싱 시도
    let parsedData: ParsedResponse;
    try {
      // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error('JSON 파싱 실패:', text);
      return NextResponse.json({ error: '응답을 파싱할 수 없습니다.', raw: text }, { status: 500 });
    }

    // AI가 이미 유통기한 추정을 처리했으므로, 서버에서 추가 처리 불필요
    // 기본값만 보장
    const items = (parsedData.items || []).map((item) => ({
      name: item.name,
      category: item.category || '기타',
      storage_method: item.storage_method || 'fridge',
      quantity: item.quantity || 1,
      expiry_date: item.expiry_date,
      is_estimated: item.is_estimated ?? false,
      confidence_reason: item.confidence_reason || 'No reason provided',
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('AI 파싱 오류:', error);
    return NextResponse.json(
      {
        error: '이미지 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
