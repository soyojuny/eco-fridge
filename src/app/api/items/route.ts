import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 모든 아이템 조회
export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Items fetch error:', error);
      return NextResponse.json({ error: '아이템을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Items GET error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 새 아이템 추가
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const insertData = items.map((item) => ({
      name: item.name,
      category: item.category || null,
      storage_method: item.storage_method || 'fridge',
      status: 'active',
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      expiry_date: item.expiry_date,
      is_estimated: item.is_estimated || false,
      quantity: item.quantity || 1,
      image_url: item.image_url || null,
      memo: item.memo || null,
    }));

    const { data, error } = await supabase
      .from('items')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Item insert error:', error);
      return NextResponse.json({ error: '아이템을 추가할 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ items: data });
  } catch (error) {
    console.error('Items POST error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
