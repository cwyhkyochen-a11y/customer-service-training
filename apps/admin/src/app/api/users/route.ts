import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { users } from '@cs-training/database';
import { eq, count, and, like } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';
import { requireAuth, isErrorResponse, success, error, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);
  const role = searchParams.get('role');

  const conditions = role ? [eq(users.role, role as 'admin' | 'client')] : [];

  const [totalResult] = db
    .select({ count: count() })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .all();

  const items = db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(page_size)
    .offset(offset)
    .all();

  return success({ items, total: totalResult.count, page, page_size });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return error('用户名、密码和角色不能为空');
    }
    if (username.length > 10) {
      return error('用户名最多10个字符');
    }
    if (password.length > 20) {
      return error('密码最多20个字符');
    }
    if (!['admin', 'client'].includes(role)) {
      return error('角色只能是 admin 或 client');
    }

    const existing = db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return error('用户名已存在');
    }

    const password_hash = await hashPassword(password);
    const result = db.insert(users).values({ username, password_hash, role }).returning().get();

    return success({
      id: result.id,
      username: result.username,
      role: result.role,
      created_at: result.created_at,
      updated_at: result.updated_at,
    }, '创建成功');
  } catch (e: any) {
    return error(e.message || '创建失败', 500);
  }
}
