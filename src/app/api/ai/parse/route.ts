import { NextRequest, NextResponse } from 'next/server';
import { parseImage } from '@/lib/services/ai.service';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const parsedData = await parseImage(image);

    // The service now returns the parsed data directly.
    // Any cleanup or default value setting should be handled by the client
    // or has been defined in the AI prompt.
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
