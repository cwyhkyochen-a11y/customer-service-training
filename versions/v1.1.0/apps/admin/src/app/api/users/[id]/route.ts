import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { users } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const userId = parseInt(id, 10);

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.username !== undefined) {
      if (body.username.length > 10) return error('用户名最多10个字符');
      const existing = db.select().from(users).where(eq(users.username, body.username)).get();
      if (existing && existing.id !== userId) return error('用户名已存在');
      updates.username = body.username;
    }
    if (body.password !== undefined) {
      if (body.password.length > 20) return error('密码最多20个字符');
      updates.password_hash = await hashPassword(body.password);
    }
    if (body.role !== undefined) {
      if (!['admin', 'client'].includes(body.role)) return error('角色无效');
      updates.role = body.role;
    }

    if (Object.keys(updates).length === 0) return error('没有要更新的字段');

    updates.updated_at = new Date().toISOString();

    const result = db.update(users).set(updates).where(eq(users.id, userId)).returning().get();
    if (!result) return error('用户不存在', 404);

    return success({
      id: result.id,
      username: result.username,
      role: result.role,
      created_at: result.created_at,
      updated_at: result.updated_at,
    }, '更新成功');
  } catch (e: any) {
    return error(e.message || '更新失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const userId = parseInt(id, 10);

  if (auth.user.id === userId) {
    return error('不能删除自己');
  }

  const result = db.delete(users).where(eq(users.id, userId)).returning().get();
  if (!result) return error('用户不存在', 404);

  return success(null, '删除成功');
}
