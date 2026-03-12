import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { promptConfigs } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import { requireAuth, isErrorResponse, success, error } from '@/lib/api-utils';

// 所有场景定义（scene_id → 默认中文名 + 说明）
const ALL_SCENES = [
  { scene_id: 'mindmap', scene_name: '思维导图生成', description: '将文档内容组织成思维导图JSON结构。变量: {{content}}' },
  { scene_id: 'mindmap_structure', scene_name: '思维导图骨架(长文档)', description: '长文档先提取整体结构。变量: {{content_head}}, {{content_tail}}' },
  { scene_id: 'mindmap_chunk', scene_name: '思维导图分块(长文档)', description: '长文档分块生成详细思维导图。变量: {{chunk_index}}, {{chunk_content}}' },
  { scene_id: 'customer_generate', scene_name: '虚拟客户生成', description: '根据知识点生成虚拟顾客角色。变量: {{node_content}}, {{user_prompt}}, {{scene_desc}}, {{scene_extra}}' },
  { scene_id: 'customer_chat', scene_name: '客户对话', description: '虚拟客户角色扮演回复。由系统prompt控制，此处不可配置。' },
  { scene_id: 'customer_feedback', scene_name: '话术评价', description: '评价客服回复的话术质量。由系统动态生成，此处不可配置。' },
  { scene_id: 'teaching_start', scene_name: 'AI教学出题', description: '根据知识点生成考核题目。变量: {{kp_title}}, {{kp_content}}' },
  { scene_id: 'teaching_chat', scene_name: 'AI教学评分', description: '评估学员答案并打分。变量: {{kp_title}}, {{kp_content}}, {{question}}, {{answer}}' },
  { scene_id: 'slides', scene_name: 'PPT生成', description: '将客服培训内容转换成HTML幻灯片。变量: {{section_title}}, {{children_text}}' },
  { scene_id: 'knowledge_generate', scene_name: '知识点生成', description: '从知识点内容提取关键知识点列表。变量: {{node_content}}' },
  { scene_id: 'ai_assist', scene_name: 'AI辅助对话', description: '根据话术知识库帮客服拟定回复。变量: {{doc_name}}, {{knowledge_text}}, {{customer_message}}, {{context}}' },
];

// GET — 获取所有提示词配置
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  // 从数据库获取已配置的
  const saved = db.select().from(promptConfigs).all();
  const savedMap = new Map(saved.map(s => [s.scene_id, s]));

  // 合并：已配置的用数据库值，未配置的用默认
  const result = ALL_SCENES.map(scene => {
    const s = savedMap.get(scene.scene_id);
    return {
      scene_id: scene.scene_id,
      scene_name: s?.scene_name || scene.scene_name,
      description: s?.description || scene.description,
      prompt_template: s?.prompt_template || '',
      has_custom: !!s,
      updated_at: s?.updated_at || null,
    };
  });

  return success(result);
}

// PUT — 更新/创建提示词配置
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const body = await request.json();
  const { scene_id, scene_name, prompt_template, description } = body;

  if (!scene_id || !prompt_template) return error('scene_id 和 prompt_template 必填');

  const existing = db.select().from(promptConfigs).where(eq(promptConfigs.scene_id, scene_id)).get();

  if (existing) {
    db.update(promptConfigs).set({
      scene_name: scene_name || existing.scene_name,
      prompt_template,
      description: description ?? existing.description,
      updated_at: new Date().toISOString(),
    }).where(eq(promptConfigs.scene_id, scene_id)).run();
  } else {
    const sceneDef = ALL_SCENES.find(s => s.scene_id === scene_id);
    db.insert(promptConfigs).values({
      scene_id,
      scene_name: scene_name || sceneDef?.scene_name || scene_id,
      prompt_template,
      description: description ?? sceneDef?.description ?? '',
    }).run();
  }

  const updated = db.select().from(promptConfigs).where(eq(promptConfigs.scene_id, scene_id)).get();
  return success(updated, '保存成功');
}

// DELETE — 重置为默认（删除自定义配置）
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const sceneId = searchParams.get('scene_id');
  if (!sceneId) return error('缺少 scene_id');

  db.delete(promptConfigs).where(eq(promptConfigs.scene_id, sceneId)).run();
  return success(null, '已重置为默认');
}
