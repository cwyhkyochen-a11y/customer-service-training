import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { practiceRecords } from '@cs-training/database';
import { eq, and } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const courseId = parseInt(id, 10);
  const userId = auth.user.id;

  try {
    const body = await request.json();
    const { record_id } = body;

    if (!record_id) return error('record_id 不能为空');

    const record = db
      .select()
      .from(practiceRecords)
      .where(
        and(
          eq(practiceRecords.id, record_id),
          eq(practiceRecords.user_id, userId),
          eq(practiceRecords.status, 'in_progress')
        )
      )
      .get();

    if (!record) return error('练习记录不存在或已结束', 404);

    db.update(practiceRecords)
      .set({
        status: 'quit',
        updated_at: new Date().toISOString(),
      })
      .where(eq(practiceRecords.id, record_id))
      .run();

    return success(null, '已退出教学');
  } catch (e: any) {
    return error(e.message || '退出失败', 500);
  }
}
