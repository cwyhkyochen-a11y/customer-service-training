import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { modelConfigs } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

const PROVIDERS: Record<string, string> = {
  kimi: 'https://api.moonshot.cn/v1',
  minimax: 'https://api.minimax.chat/v1',
};

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const modelId = parseInt(id, 10);

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.provider !== undefined) {
      if (!PROVIDERS[body.provider]) return error('provider 只支持 kimi 或 minimax');
      updates.provider = body.provider;
      updates.base_url = PROVIDERS[body.provider];
    }
    if (body.model_name !== undefined) updates.model_name = body.model_name;
    if (body.api_key !== undefined) updates.api_key = body.api_key;

    if (Object.keys(updates).length === 0) return error('没有要更新的字段');
    updates.updated_at = new Date().toISOString();

    const result = db.update(modelConfigs).set(updates).where(eq(modelConfigs.id, modelId)).returning().get();
    if (!result) return error('模型配置不存在', 404);

    return success(result, '更新成功');
  } catch (e: any) {
    return error(e.message || '更新失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const modelId = parseInt(id, 10);

  const result = db.delete(modelConfigs).where(eq(modelConfigs.id, modelId)).returning().get();
  if (!result) return error('模型配置不存在', 404);

  return success(null, '删除成功');
}
