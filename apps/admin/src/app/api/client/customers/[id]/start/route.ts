import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { virtualCustomers, practiceRecords } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request, 'client');
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const customerId = parseInt(id, 10);
  const userId = auth.user.id;

  const customer = db
    .select()
    .from(virtualCustomers)
    .where(eq(virtualCustomers.id, customerId))
    .get();

  if (!customer) return error('虚拟顾客不存在', 404);

  const sceneLabel = customer.scene_type === 'pre_sale' ? '售前咨询' : '售后服务';
  let sceneContext = '';
  if (customer.scene_type === 'pre_sale' && customer.virtual_product) {
    try {
      const product = JSON.parse(customer.virtual_product);
      sceneContext = `\n你正在咨询的商品信息：
商品名称：${product.spu_name || product.name || ''}
商品类型：${product.category || ''}
价格：${product.price || ''}`;
      if (product.skus && Array.isArray(product.skus)) {
        sceneContext += '\n可选规格：';
        for (const sku of product.skus) {
          sceneContext += `\n  - ${sku.sku_name || ''}，价格${sku.sku_price || ''}，${sku.stock || ''}`;
        }
      }
    } catch { sceneContext = ''; }
  } else if (customer.scene_type === 'after_sale' && customer.virtual_order) {
    try {
      const order = JSON.parse(customer.virtual_order);
      sceneContext = `\n你的订单信息：
订单号：${order.order_id || ''}
下单时间：${order.order_time || order.date || ''}
发货时间：${order.ship_time || '未发货'}
订单状态：${order.order_status || order.status || ''}
物流状态：${order.logistics_status || ''}
物流更新时间：${order.logistics_time || ''}
订单金额：${order.order_amount || ''}`;
      if (order.items && Array.isArray(order.items)) {
        sceneContext += '\n商品列表：';
        for (const item of order.items) {
          sceneContext += `\n  - ${item.name || ''}，${item.spec || ''}，${item.price || ''} × ${item.quantity || 1}`;
        }
      } else if (order.product) {
        sceneContext += `\n商品：${order.product}`;
      }
    } catch { sceneContext = ''; }
  }

  const systemMessage = `你现在扮演一个虚拟顾客，场景是${sceneLabel}。请严格按照以下人设进行角色扮演：

姓名：${customer.name}
${customer.age ? `年龄：${customer.age}岁` : ''}
${customer.gender ? `性别：${customer.gender === 'male' ? '男' : '女'}` : ''}
情绪状态：${customer.mood}
${sceneContext}

你的真实诉求（不要直接告诉客服，需要客服通过话术引导来满足）：
${customer.demand}

你的开场问题：${customer.question || customer.demand}

详细人设：
${customer.persona_prompt}

注意：
1. 你只能以顾客的身份说话，不要跳出角色
2. 根据情绪状态调整说话语气
3. 只要客服通过合适的话术满足了你的诉求，在回复中包含 [RESOLVED] 标记
4. 如果客服态度恶劣或完全无法解决问题让你失望，在回复中包含 [FAILED] 标记
5. 每次回复保持简洁自然，像真实顾客一样说话`;

  const chatHistory = [
    { role: 'system', content: systemMessage, timestamp: new Date().toISOString() },
  ];

  const record = db
    .insert(practiceRecords)
    .values({
      user_id: userId,
      type: 'customer',
      customer_id: customerId,
      document_id: customer.document_id,
      chat_history: JSON.stringify(chatHistory),
      status: 'in_progress',
    })
    .returning()
    .get();

  return success({
    record_id: record.id,
    customer: {
      id: customer.id,
      name: customer.name,
      question: customer.question || customer.demand,
      mood: customer.mood,
      scene_type: customer.scene_type,
      virtual_product: customer.virtual_product ? JSON.parse(customer.virtual_product) : null,
      virtual_order: customer.virtual_order ? JSON.parse(customer.virtual_order) : null,
    },
  }, '对练已开始');
}
