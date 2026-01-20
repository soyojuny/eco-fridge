import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 특정 아이템 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: item, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: '아이템을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Item GET error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH: 아이템 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await req.json();

    // 수정 가능한 필드만 추출
    const updates: {
      name?: string;
      category?: string | null;
      storage_method?: 'fridge' | 'freezer' | 'pantry';
      status?: 'active' | 'consumed' | 'discarded';
      expiry_date?: string;
      is_estimated?: boolean;
      memo?: string | null;
    } = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.storage_method !== undefined) updates.storage_method = body.storage_method;
    if (body.status !== undefined) updates.status = body.status;
    if (body.expiry_date !== undefined) updates.expiry_date = body.expiry_date;
    if (body.is_estimated !== undefined) updates.is_estimated = body.is_estimated;
    if (body.memo !== undefined) updates.memo = body.memo;

    const { data: item, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Item update error:', error);
      return NextResponse.json({ error: '아이템을 수정할 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Item PATCH error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 아이템 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Item delete error:', error);
      return NextResponse.json({ error: '아이템을 삭제할 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Item DELETE error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
