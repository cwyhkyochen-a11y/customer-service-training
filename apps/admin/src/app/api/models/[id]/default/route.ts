import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { modelConfigs } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const modelId = parseInt(id, 10);

  const existing = db.select().from(modelConfigs).where(eq(modelConfigs.id, modelId)).get();
  if (!existing) return error('模型配置不存在', 404);

  // Unset all defaults first
  db.update(modelConfigs)
    .set({ is_default: false, updated_at: new Date().toISOString() })
    .run();

  // Set this one as default
  const result = db
    .update(modelConfigs)
    .set({ is_default: true, updated_at: new Date().toISOString() })
    .where(eq(modelConfigs.id, modelId))
    .returning()
    .get();

  return success(result, '已设为默认');
}
