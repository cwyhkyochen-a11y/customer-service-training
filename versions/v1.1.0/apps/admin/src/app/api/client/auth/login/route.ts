import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { users } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { verifyPassword, signToken } from '@/lib/auth';
import { success, error } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return error('用户名和密码不能为空');
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      return error('用户名或密码错误');
    }

    if (user.role !== 'client') {
      return error('此账号不是客服账号');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return error('用户名或密码错误');
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return success({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (e: any) {
    return error(e.message || '登录失败', 500);
  }
}
