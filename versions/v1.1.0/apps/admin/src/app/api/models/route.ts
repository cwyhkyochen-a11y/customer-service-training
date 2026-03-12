import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { modelConfigs } from '@cs-training/database';
import { count } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error, parsePagination } from '@/lib/api-utils';

const PROVIDERS: Record<string, string> = {
  kimi: 'https://api.moonshot.cn/v1',
  minimax: 'https://api.minimax.chat/v1',
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db.select({ count: count() }).from(modelConfigs).all();
  const items = db.select().from(modelConfigs).limit(page_size).offset(offset).all();

  return success({ items, total: totalResult.count, page, page_size });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { provider, model_name, api_key } = body;

    if (!provider || !model_name || !api_key) {
      return error('provider、model_name、api_key 不能为空');
    }

    const base_url = PROVIDERS[provider];
    if (!base_url) {
      return error('provider 只支持 kimi 或 minimax');
    }

    const result = db
      .insert(modelConfigs)
      .values({ provider, model_name, api_key, base_url })
      .returning()
      .get();

    return success(result, '创建成功');
  } catch (e: any) {
    return error(e.message || '创建失败', 500);
  }
}
