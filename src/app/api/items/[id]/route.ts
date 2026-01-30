import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateItem } from '@/lib/services/item.service';
import type { Database, ItemUpdate } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// GET: 특정 아이템 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase: SupabaseClient<Database> = await createClient();
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
    const supabase: SupabaseClient<Database> = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await req.json();

    // 수정 가능한 필드만 추출
    const updates: ItemUpdate = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.storage_method !== undefined) updates.storage_method = body.storage_method;
    if (body.status !== undefined) updates.status = body.status;
    if (body.expiry_date !== undefined) updates.expiry_date = body.expiry_date;
    if (body.is_estimated !== undefined) updates.is_estimated = body.is_estimated;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.memo !== undefined) updates.memo = body.memo;

    await updateItem(supabase, id, updates);

    // 업데이트된 아이템을 조회
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
    const supabase: SupabaseClient<Database> = await createClient();
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
