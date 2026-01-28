import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { format, addDays } from 'date-fns';
import { getDefaultExpiryDays, CATEGORIES } from '@/lib/expiry-defaults';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

const RECEIPT_PROMPT = `당신은 영수증 이미지를 분석하는 AI입니다. 이미지에서 식품 품목을 추출해주세요.

다음 형식의 JSON 배열로 응답해주세요:
{
  "items": [
    {
      "name": "품목명",
      "category": "카테고리",
      "expiry_date": "YYYY-MM-DD 또는 null",
      "storage_method": "fridge 또는 freezer 또는 pantry"
    }
  ]
}

카테고리는 다음 중 하나로 분류해주세요:
${CATEGORIES.join(', ')}

보관방법 규칙:
- 육류, 해산물, 유제품 → fridge
- 냉동식품, 아이스크림 → freezer
- 과자, 라면, 통조림, 조미료 → pantry
- 채소, 과일 → fridge (기본)

유통기한이 영수증에 없으면 expiry_date는 null로 설정하세요.
식품이 아닌 항목(비닐봉투, 할인 등)은 제외하세요.
JSON만 응답하고 다른 텍스트는 포함하지 마세요.`;

const PRODUCT_PROMPT = `당신은 제품 이미지를 분석하는 AI입니다. 이미지에서 제품 정보를 추출해주세요.

다음 형식의 JSON으로 응답해주세요:
{
  "items": [
    {
      "name": "제품명",
      "category": "카테고리",
      "expiry_date": "YYYY-MM-DD 또는 null",
      "storage_method": "fridge 또는 freezer 또는 pantry"
    }
  ]
}

카테고리는 다음 중 하나로 분류해주세요:
${CATEGORIES.join(', ')}

유통기한/소비기한 표시를 찾아서 YYYY-MM-DD 형식으로 변환하세요.
- "24.12.25" → "2024-12-25"
- "2024년 12월 25일" → "2024-12-25"
- "12/25/24" → "2024-12-25"

유통기한이 보이지 않으면 expiry_date는 null로 설정하세요.
JSON만 응답하고 다른 텍스트는 포함하지 마세요.`;

export async function POST(req: NextRequest) {
  try {
    const { image, mode } = await req.json();

    if (!image) {
      return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Base64 이미지에서 데이터 부분만 추출
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const prompt = mode === 'receipt' ? RECEIPT_PROMPT : PRODUCT_PROMPT;

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
    let parsedData;
    try {
      // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error('JSON 파싱 실패:', text);
      return NextResponse.json({ error: '응답을 파싱할 수 없습니다.', raw: text }, { status: 500 });
    }

    // 유통기한 추정 처리
    const today = new Date();
    const items = (parsedData.items || []).map((item: {
      name: string;
      category: string;
      expiry_date: string | null;
      storage_method: 'fridge' | 'freezer' | 'pantry';
    }) => {
      const category = item.category || '기타';
      const storageMethod = item.storage_method || 'fridge';

      if (!item.expiry_date) {
        // 유통기한 추정
        const days = getDefaultExpiryDays(category, storageMethod);
        return {
          ...item,
          category,
          storage_method: storageMethod,
          expiry_date: format(addDays(today, days), 'yyyy-MM-dd'),
          is_estimated: true,
        };
      }

      return {
        ...item,
        category,
        storage_method: storageMethod,
        is_estimated: false,
      };
    });

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
