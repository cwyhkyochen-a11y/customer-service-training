import OpenAI from 'openai';
import { db } from '@cs-training/database';
import { modelConfigs, llmUsageLogs } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import type { MindmapNode } from '@cs-training/shared';

export async function getDefaultModel() {
  const model = db
    .select()
    .from(modelConfigs)
    .where(eq(modelConfigs.is_default, true))
    .get();
  if (!model) throw new Error('未配置默认模型');
  return model;
}

function createClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
}

// 价格表（每百万token，单位：厘=0.001元）
// 可根据实际模型调整
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  // Kimi K2.5: input ¥2/M, output ¥8/M → 2000厘/M input, 8000厘/M output
  'kimi-k2.5': { input: 2000, output: 8000 },
  'k2-0711-preview': { input: 2000, output: 8000 },
  // MiniMax M2.5: input ¥1/M, output ¥8/M
  'minimax-m2.5': { input: 1000, output: 8000 },
  'MiniMax-Text-01': { input: 1000, output: 8000 },
};

function estimateCost(modelName: string, promptTokens: number, completionTokens: number): number {
  // 查找匹配的价格
  const lowerModel = modelName.toLowerCase();
  let price = { input: 2000, output: 8000 }; // 默认价格
  for (const [key, val] of Object.entries(PRICE_TABLE)) {
    if (lowerModel.includes(key.toLowerCase())) {
      price = val;
      break;
    }
  }
  // 费用 = tokens / 1000000 * 价格(厘/M)
  return Math.round((promptTokens * price.input + completionTokens * price.output) / 1000000);
}

export interface CallAIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  scene?: string;
  userId?: number;
  documentId?: number;
}

export async function callAI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: CallAIOptions
): Promise<string> {
  const config = await getDefaultModel();
  const client = createClient(config.base_url, config.api_key);
  const modelName = options?.model || config.model_name;
  const scene = options?.scene || 'unknown';
  const startTime = Date.now();

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });

    let content = response.choices[0]?.message?.content || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const usage = response.usage;
    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = usage?.total_tokens || (promptTokens + completionTokens);
    const cost = estimateCost(modelName, promptTokens, completionTokens);
    const durationMs = Date.now() - startTime;

    // 记录用量
    try {
      db.insert(llmUsageLogs).values({
        scene,
        model_name: modelName,
        provider: config.provider,
        status: 'success',
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost,
        duration_ms: durationMs,
        user_id: options?.userId || null,
        document_id: options?.documentId || null,
      }).run();
    } catch {}

    return content;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    // 记录失败
    try {
      db.insert(llmUsageLogs).values({
        scene,
        model_name: modelName,
        provider: config.provider,
        status: 'failed',
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        cost: 0,
        duration_ms: durationMs,
        error_message: err instanceof Error ? err.message : String(err),
        user_id: options?.userId || null,
        document_id: options?.documentId || null,
      }).run();
    } catch {}
    throw err;
  }
}

export async function generateMindmap(text: string): Promise<MindmapNode> {
  // For long documents, split into chunks and process separately
  const MAX_CHUNK = 12000;
  if (text.length > MAX_CHUNK) {
    return generateMindmapChunked(text, MAX_CHUNK);
  }

  const prompt = `你是一个知识结构分析专家。请将以下文本内容完整地组织成思维导图JSON结构。

**核心要求：保留原文中所有具体内容，不要概括或省略！**

规则：
1. 最多6层深度
2. 每个节点结构：{ "id": "唯一字符串", "label": "节点标题", "content": "该节点的完整内容（保留原文话术、示例、对比等具体文字）", "children": [] }
3. 根节点id为"root"，其他节点id格式为 "node_层级_序号"
4. label 是简短标题（用于导航）
5. content 必须包含该节点对应的原文完整内容。如果原文有具体话术、示例、对比，必须原样保留在content中
6. 没有子节点的叶子节点尤其要保留完整的原文内容
7. 只返回JSON，不要其他内容

文本内容：
${text}

请返回JSON：`;

  const result = await callAI([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 16000, scene: 'mindmap' });

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI返回格式错误');

  return JSON.parse(jsonMatch[0]) as MindmapNode;
}

async function generateMindmapChunked(text: string, chunkSize: number): Promise<MindmapNode> {
  // Step 1: Get overall structure from the full text (abbreviated)
  const structurePrompt = `你是一个知识结构分析专家。以下是一篇较长的文档，请先分析其整体结构，输出一个思维导图的骨架（只需要前两层的标题和大致范围）。

文本内容：
${text.slice(0, 3000)}
...
${text.slice(-2000)}

请返回JSON，格式：
{
  "id": "root",
  "label": "文档标题",
  "children": [
    { "id": "node_1_1", "label": "第一部分标题", "content_range": "简述这部分涵盖的内容" },
    ...
  ]
}
只返回JSON：`;

  const structureResult = await callAI([{ role: 'user', content: structurePrompt }], { temperature: 0.2, maxTokens: 2000, scene: 'mindmap' });
  const structureMatch = structureResult.match(/\{[\s\S]*\}/);
  if (!structureMatch) throw new Error('AI返回格式错误');
  const structure = JSON.parse(structureMatch[0]);

  // Step 2: Split text into chunks and generate detailed mindmap for each
  const chunks: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    // Try to split at paragraph boundaries
    let end = Math.min(pos + chunkSize, text.length);
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      if (lastNewline > pos + chunkSize * 0.5) end = lastNewline;
    }
    chunks.push(text.slice(pos, end));
    pos = end;
  }

  const childrenResults: MindmapNode[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkPrompt = `你是一个知识结构分析专家。请将以下文本片段完整地组织成思维导图JSON结构。

**核心要求：保留原文中所有具体内容，不要概括或省略！**

规则：
1. 最多5层深度
2. 每个节点：{ "id": "唯一字符串", "label": "简短标题", "content": "该节点完整原文内容", "children": [] }
3. 节点id格式为 "node_${i + 1}_层级_序号"
4. content 必须保留原文的具体话术、示例、对比等
5. 只返回JSON数组（多个顶层节点），不要其他内容

文本片段：
${chunks[i]}

请返回JSON数组：`;

    const chunkResult = await callAI([{ role: 'user', content: chunkPrompt }], { temperature: 0.2, maxTokens: 16000, scene: 'mindmap' });
    const arrMatch = chunkResult.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const nodes = JSON.parse(arrMatch[0]) as MindmapNode[];
      childrenResults.push(...nodes);
    }
  }

  // Combine
  return {
    id: 'root',
    label: structure.label || '文档',
    children: childrenResults.length > 0 ? childrenResults : structure.children,
  };
}

export async function generateCustomer(
  nodeContent: string,
  userPrompt: string,
  sceneType: 'pre_sale' | 'after_sale' = 'after_sale'
): Promise<{
  name: string;
  age: number;
  gender: 'male' | 'female';
  demand: string;
  question: string;
  mood: string;
  scene_type: 'pre_sale' | 'after_sale';
  virtual_product: string | null;
  virtual_order: string | null;
  persona_prompt: string;
}> {
  const sceneDesc = sceneType === 'pre_sale' ? '售前咨询' : '售后服务';
  const sceneExtra = sceneType === 'pre_sale'
    ? `7. virtual_product: 虚拟商品信息JSON对象，包含以下字段：
     - spu_name: SPU商品名称（如"轻薄羽绒服"）
     - category: 商品类型/分类（如"女装/外套"）
     - price: 商品价格（如"¥299"）
     - skus: SKU规格数组，每个SKU包含 sku_name(规格名如"黑色M码")、sku_price(该规格价格)、stock(库存状态如"有货"/"缺货")
     基于文档内容合理编造，商品信息要真实可信`
    : `7. virtual_order: 虚拟订单信息JSON对象，包含以下字段：
     - order_id: 订单号（如"DD20240515887"）
     - order_time: 下单时间（如"2024-05-10 14:30"）
     - ship_time: 发货时间（如"2024-05-11 09:00"，未发货则为null）
     - order_status: 订单状态（如"待发货"/"已发货"/"已签收"/"退款中"）
     - logistics_status: 物流状态（如"运输中"/"派送中"/"已签收"，未发货则为null）
     - logistics_time: 最新物流更新时间（如"2024-05-13 16:00"，无则为null）
     - order_amount: 订单总金额（如"¥598"）
     - items: 商品列表数组，每个商品包含 name(商品名称)、price(商品单价)、spec(商品规格如"黑色 M码")、category(商品类型)、quantity(数量)
     基于文档内容合理编造，订单信息要真实可信`;

  const prompt = `你是一个虚拟顾客生成专家。根据以下知识点内容和用户要求，生成一个${sceneDesc}场景的虚拟顾客角色。

知识点内容：
${nodeContent.slice(0, 5000)}

用户要求：
${userPrompt}

请返回JSON格式（只返回JSON，不要其他内容）：
{
  "name": "顾客姓名（中文）",
  "age": 数字,
  "gender": "male"或"female",
  "demand": "顾客的真实诉求（内部用，不展示给客服，如：查询发货时间、了解退款政策）",
  "question": "顾客的开场提问（展示给客服看的，口语化，如：我的货什么时候才能发啊？）",
  "mood": "顾客的情绪状态",
  ${sceneExtra}
  "persona_prompt": "详细的角色扮演提示词，包含性格、说话方式、具体问题背景、诉求达成条件等。诉求是确定性的，只要客服通过合适话术满足诉求就算解决。"
}`;

  const result = await callAI([{ role: 'user', content: prompt }], { temperature: 0.8, scene: 'customer_generate' });
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI返回格式错误');

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    ...parsed,
    scene_type: sceneType,
    virtual_product: sceneType === 'pre_sale' ? (typeof parsed.virtual_product === 'string' ? parsed.virtual_product : JSON.stringify(parsed.virtual_product || null)) : null,
    virtual_order: sceneType === 'after_sale' ? (typeof parsed.virtual_order === 'string' ? parsed.virtual_order : JSON.stringify(parsed.virtual_order || null)) : null,
  };
}

export async function generateKnowledgePoints(
  nodeContent: string
): Promise<Array<{ title: string; content: string }>> {
  const prompt = `你是一个客服培训专家。根据以下知识点内容，提取出关键的知识点列表，用于客服培训考核。

知识点内容：
${nodeContent.slice(0, 8000)}

要求：
1. 每个知识点包含 title(标题) 和 content(详细内容)
2. 知识点应该是客服需要掌握的具体知识
3. 只返回JSON数组，不要其他内容

请返回JSON数组：
[{"title": "知识点标题", "content": "知识点详细内容"}, ...]`;

  const result = await callAI([{ role: 'user', content: prompt }], { temperature: 0.3, scene: 'knowledge_generate' });
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI返回格式错误');

  return JSON.parse(jsonMatch[0]);
}
