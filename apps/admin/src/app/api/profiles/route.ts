import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { users } from '@cs-training/database';
import { eq, count } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, parsePagination } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const { page, page_size, offset } = parsePagination(searchParams);

  const [totalResult] = db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, 'client'))
    .all();

  const items = db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.role, 'client'))
    .limit(page_size)
    .offset(offset)
    .all();

  return success({ items, total: totalResult.count, page, page_size });
}
