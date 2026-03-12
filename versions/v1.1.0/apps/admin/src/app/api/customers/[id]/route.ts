import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { virtualCustomers, practiceRecords, userCustomerResults } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const customerId = parseInt(id, 10);

  const result = db.select().from(virtualCustomers).where(eq(virtualCustomers.id, customerId)).get();
  if (!result) return error('虚拟顾客不存在', 404);

  return success({ ...result, node_path: JSON.parse(result.node_path) });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const customerId = parseInt(id, 10);

  try {
    const body = await request.json();
    const updates: Record<string, any> = {};

    for (const key of ['name', 'age', 'gender', 'demand', 'question', 'scene_type', 'virtual_product', 'virtual_order', 'mood', 'persona_prompt']) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.node_path !== undefined) updates.node_path = JSON.stringify(body.node_path);

    if (Object.keys(updates).length === 0) return error('没有要更新的字段');
    updates.updated_at = new Date().toISOString();

    const result = db
      .update(virtualCustomers)
      .set(updates)
      .where(eq(virtualCustomers.id, customerId))
      .returning()
      .get();
    if (!result) return error('虚拟顾客不存在', 404);

    return success({ ...result, node_path: JSON.parse(result.node_path) }, '更新成功');
  } catch (e: any) {
    return error(e.message || '更新失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const customerId = parseInt(id, 10);

  try {
    // Delete related records first
    db.delete(userCustomerResults).where(eq(userCustomerResults.customer_id, customerId)).run();
    db.delete(practiceRecords).where(eq(practiceRecords.customer_id, customerId)).run();
    const result = db.delete(virtualCustomers).where(eq(virtualCustomers.id, customerId)).returning().get();
    if (!result) return error('虚拟顾客不存在', 404);
    return success(null, '删除成功');
  } catch (e: any) {
    return error(e.message || '删除失败', 500);
  }
}
