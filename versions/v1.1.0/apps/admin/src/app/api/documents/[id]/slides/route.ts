import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { documents, documentSlides } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';
import { callAI } from '@/lib/ai';
import type { MindmapNode } from '@cs-training/shared';

type Params = { params: Promise<{ id: string }> };

// GET — 获取文档的所有 slides
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);

  const slides = db
    .select()
    .from(documentSlides)
    .where(eq(documentSlides.document_id, docId))
    .orderBy(documentSlides.page_number)
    .all();

  return success(slides);
}

// Flatten mindmap into sections for slide generation
function flattenForSlides(node: MindmapNode, depth = 0): Array<{ title: string; content: string; depth: number }> {
  const sections: Array<{ title: string; content: string; depth: number }> = [];

  if (depth > 0) {
    sections.push({ title: node.label, content: node.content || '', depth });
  }

  if (node.children?.length) {
    for (const child of node.children) {
      sections.push(...flattenForSlides(child, depth + 1));
    }
  }

  return sections;
}

// 生成锁：防止同一文档重复生成
const generatingSet = new Set<number>();

// POST — 生成 slides
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);

  if (generatingSet.has(docId)) {
    return error('已经在生成啦，请稍等哦', 409);
  }

  const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
  if (!doc) return error('文档不存在', 404);
  if (!doc.mindmap_json) return error('文档尚未生成思维导图');

  let mindmap: MindmapNode;
  try {
    mindmap = JSON.parse(doc.mindmap_json);
  } catch {
    return error('思维导图数据格式错误');
  }

  // Delete existing slides
  db.delete(documentSlides).where(eq(documentSlides.document_id, docId)).run();

  // 加锁
  generatingSet.add(docId);

  try {

  // Flatten mindmap into sections
  const sections = flattenForSlides(mindmap);
  if (sections.length === 0) return error('思维导图内容为空');

  // Group sections into slide pages
  // Strategy: each depth-1 node becomes a section, its children become sub-slides
  const slidePages: Array<{ title: string; content: string; children: Array<{ title: string; content: string }> }> = [];

  let currentPage: typeof slidePages[0] | null = null;
  for (const sec of sections) {
    if (sec.depth === 1) {
      if (currentPage) slidePages.push(currentPage);
      currentPage = { title: sec.title, content: sec.content, children: [] };
    } else if (currentPage) {
      currentPage.children.push({ title: sec.title, content: sec.content });
    }
  }
  if (currentPage) slidePages.push(currentPage);

  // Generate cover slide
  const coverHtml = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:40px;">
  <h1 style="font-size:2.2em;font-weight:700;color:#1a1a2e;margin-bottom:16px;line-height:1.3;">${escapeHtml(mindmap.label)}</h1>
  <div style="width:80px;height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:2px;margin-bottom:20px;"></div>
  <p style="font-size:1.1em;color:#64748b;max-width:500px;line-height:1.6;">${escapeHtml(mindmap.content || '客服话术培训课件')}</p>
  <p style="font-size:0.85em;color:#94a3b8;margin-top:32px;">共 ${slidePages.length} 个章节</p>
</div>`;

  const allSlides: Array<{ page_number: number; title: string; html_content: string }> = [];
  allSlides.push({ page_number: 1, title: mindmap.label, html_content: coverHtml });

  // Generate content slides via AI (parallel by section)
  const sectionResults: Array<{ sectionTitle: string; sectionHtml: string; children: Array<{ title: string; html: string }> }> = [];

  // Build all AI prompts first
  const aiTasks = slidePages.map((page, idx) => {
    if (page.children.length === 0) return null;
    const childrenText = page.children.map((c, i) => `### ${i + 1}. ${c.title}\n${c.content}`).join('\n\n');

    const prompt = `你是一个客服培训PPT设计专家。请将以下客服话术培训内容转换成HTML幻灯片。

章节：${page.title}
内容：
${childrenText.slice(0, 6000)}

核心要求——话术场景化展示：
- 这是客服话术培训材料，最重要的是展示"场景 + 话术示例"
- 每张幻灯片必须包含具体的客服对话场景和对应的推荐话术答案
- 话术示例必须用醒目的样式突出（如带左边框的引用块、对话气泡、高亮卡片等）
- 如果原文有"传统话术 vs 推荐话术"的对比，必须用左右对比布局清晰展示
- 如果原文有多个场景，每个场景用独立的卡片区块展示

布局模板参考：
A) 场景对比型：左侧"常见说法"(灰色/红色调)，右侧"推荐话术"(绿色/紫色调)
B) 场景问答型：上方是客户问题场景(带问号图标)，下方是推荐回答话术(带引用样式)
C) 要点列表型：多个话术要点用编号卡片排列，每个卡片包含场景描述+话术示例

样式规范：
1. 每个子主题生成1张幻灯片，是完整HTML片段（不需要html/body标签）
2. 使用内联样式，风格简洁专业现代
3. 配色：主色#6366f1(靛蓝)，辅色#8b5cf6(紫)，成功#10b981(绿)，警告#f59e0b(橙)，文字#1a1a2e，次要#64748b
4. 话术引用块样式：background:#f8f7ff; border-left:4px solid #6366f1; padding:12px 16px; border-radius:8px; 字体稍大
5. 对比布局用 display:flex; gap:20px; 左右各50%
6. 场景描述用较小字体+图标前缀，话术答案用较大字体+引用块样式
7. 容器 height:100%; padding:36px 44px; overflow:auto;
8. 字体：标题1.3em加粗，场景描述0.9em，话术示例1.05em，注释0.8em
9. 不要使用emoji，用CSS圆点或色块代替图标
10. 适当使用圆角(border-radius:8px~12px)和轻微阴影(box-shadow)增加层次感

返回JSON数组，每个元素：{"title": "幻灯片标题", "html": "HTML内容"}
只返回JSON数组，不要其他内容。不要使用任何emoji字符。`;

    return { idx, page, prompt };
  }).filter(Boolean) as Array<{ idx: number; page: typeof slidePages[0]; prompt: string }>;

  // Run AI calls in parallel (max 3 concurrent)
  const aiResults = new Map<number, Array<{ title: string; html: string }>>();
  const batchSize = 3;
  for (let i = 0; i < aiTasks.length; i += batchSize) {
    const batch = aiTasks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (task) => {
        try {
          const result = await callAI([{ role: 'user', content: task.prompt }], { temperature: 0.3, maxTokens: 16000, scene: 'slides' });
          const jsonMatch = result.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return { idx: task.idx, slides: JSON.parse(jsonMatch[0]) as Array<{ title: string; html: string }> };
          }
        } catch {}
        // Fallback
        return {
          idx: task.idx,
          slides: task.page.children.map(child => ({
            title: child.title,
            html: `<div style="padding:48px;height:100%;display:flex;flex-direction:column;justify-content:center;">
  <h3 style="font-size:1.3em;font-weight:600;color:#1a1a2e;margin-bottom:16px;">${escapeHtml(child.title)}</h3>
  <div style="font-size:0.95em;color:#374151;line-height:1.8;white-space:pre-wrap;">${escapeHtml(child.content)}</div>
</div>`,
          })),
        };
      })
    );
    for (const r of results) {
      aiResults.set(r.idx, r.slides);
    }
  }

  // Assemble all slides in order
  let pageNum = 2;
  for (let idx = 0; idx < slidePages.length; idx++) {
    const page = slidePages[idx];

    // Section title slide
    const sectionTitleHtml = `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:48px;">
  <div style="width:60px;height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:2px;margin-bottom:20px;"></div>
  <h2 style="font-size:1.8em;font-weight:700;color:#1a1a2e;margin-bottom:12px;">${escapeHtml(page.title)}</h2>
  <p style="font-size:1em;color:#64748b;line-height:1.6;max-width:600px;">${escapeHtml(page.content.slice(0, 200))}</p>
</div>`;
    allSlides.push({ page_number: pageNum++, title: page.title, html_content: sectionTitleHtml });

    // Add AI-generated detail slides
    const generatedSlides = aiResults.get(idx);
    if (generatedSlides) {
      for (const slide of generatedSlides) {
        allSlides.push({
          page_number: pageNum++,
          title: slide.title || '',
          html_content: slide.html || '',
        });
      }
    }
  }

  // Insert all slides
  for (const slide of allSlides) {
    db.insert(documentSlides)
      .values({
        document_id: docId,
        page_number: slide.page_number,
        title: slide.title,
        html_content: slide.html_content,
      })
      .run();
  }

  return success({ count: allSlides.length }, `已生成 ${allSlides.length} 页PPT`);
  } catch (err) {
    return error('PPT生成失败: ' + (err instanceof Error ? err.message : '未知错误'));
  } finally {
    generatingSet.delete(docId);
  }
}

// DELETE — 删除 slides
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);

  db.delete(documentSlides).where(eq(documentSlides.document_id, docId)).run();
  return success(null, '已删除');
}

// PATCH — 更新单页 slide
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  const docId = parseInt(id, 10);
  const body = await request.json();
  const { slide_id, title, html_content } = body;

  if (!slide_id) return error('缺少 slide_id');

  const slide = db.select().from(documentSlides)
    .where(eq(documentSlides.id, slide_id))
    .get();

  if (!slide || slide.document_id !== docId) return error('幻灯片不存在', 404);

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (html_content !== undefined) updates.html_content = html_content;

  if (Object.keys(updates).length === 0) return error('没有要更新的内容');

  db.update(documentSlides)
    .set(updates)
    .where(eq(documentSlides.id, slide_id))
    .run();

  const updated = db.select().from(documentSlides)
    .where(eq(documentSlides.id, slide_id))
    .get();

  return success(updated, '更新成功');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}
