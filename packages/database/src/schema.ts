import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'client'] }).notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expires_at: text('expires_at').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const modelConfigs = sqliteTable('model_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider', { enum: ['kimi', 'minimax'] }).notNull(),
  model_name: text('model_name').notNull(),
  api_key: text('api_key').notNull(),
  base_url: text('base_url').notNull(),
  is_default: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  file_path: text('file_path').notNull(),
  file_type: text('file_type', { enum: ['excel', 'doc'] }).notNull(),
  mindmap_json: text('mindmap_json'),
  status: text('status', { enum: ['pending', 'processing', 'done', 'failed'] }).default('pending').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const virtualCustomers = sqliteTable('virtual_customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  document_id: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  node_path: text('node_path').notNull(), // JSON array
  prompt: text('prompt'),
  name: text('name').notNull(),
  age: integer('age'),
  gender: text('gender', { enum: ['male', 'female'] }),
  demand: text('demand').notNull(),
  question: text('question').default('').notNull(),
  scene_type: text('scene_type', { enum: ['pre_sale', 'after_sale'] }).default('after_sale').notNull(),
  virtual_product: text('virtual_product'), // JSON: 虚拟商品信息（售前）
  virtual_order: text('virtual_order'), // JSON: 虚拟订单信息（售后）
  mood: text('mood').notNull(),
  persona_prompt: text('persona_prompt').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  document_id: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const knowledgePoints = sqliteTable('knowledge_points', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  course_id: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  document_id: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  node_path: text('node_path').notNull(), // JSON array
  title: text('title').notNull(),
  content: text('content').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const practiceRecords = sqliteTable('practice_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['teaching', 'customer'] }).notNull(),
  course_id: integer('course_id').references(() => courses.id),
  customer_id: integer('customer_id').references(() => virtualCustomers.id),
  document_id: integer('document_id').notNull().references(() => documents.id),
  chat_history: text('chat_history').notNull().default('[]'), // JSON
  status: text('status', { enum: ['in_progress', 'completed', 'failed', 'quit'] }).default('in_progress').notNull(),
  result_summary: text('result_summary'), // JSON
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const userKnowledgeProgress = sqliteTable('user_knowledge_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  knowledge_point_id: integer('knowledge_point_id').notNull().references(() => knowledgePoints.id, { onDelete: 'cascade' }),
  course_id: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  mastered: integer('mastered', { mode: 'boolean' }).default(false).notNull(),
  mastered_at: text('mastered_at'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const userCustomerResults = sqliteTable('user_customer_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  customer_id: integer('customer_id').notNull().references(() => virtualCustomers.id, { onDelete: 'cascade' }),
  practice_record_id: integer('practice_record_id').notNull().references(() => practiceRecords.id, { onDelete: 'cascade' }),
  resolved: integer('resolved').default(0).notNull(), // 0=未解决, 1=已解决, 2=失败
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const documentSlides = sqliteTable('document_slides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  document_id: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  page_number: integer('page_number').notNull(),
  title: text('title').notNull().default(''),
  html_content: text('html_content').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

// LLM API 调用记录
export const llmUsageLogs = sqliteTable('llm_usage_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scene: text('scene').notNull(), // mindmap, customer_generate, customer_chat, teaching_start, teaching_chat, slides
  model_name: text('model_name').notNull(),
  provider: text('provider').notNull(),
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  prompt_tokens: integer('prompt_tokens').default(0).notNull(),
  completion_tokens: integer('completion_tokens').default(0).notNull(),
  total_tokens: integer('total_tokens').default(0).notNull(),
  cost: integer('cost').default(0).notNull(), // 费用，单位：厘（0.001元），用整数避免浮点
  duration_ms: integer('duration_ms').default(0).notNull(), // 耗时毫秒
  error_message: text('error_message'),
  user_id: integer('user_id'), // 触发用户，可为空（系统任务）
  document_id: integer('document_id'), // 关联文档
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

// 提示词配置
export const promptConfigs = sqliteTable('prompt_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scene_id: text('scene_id').notNull().unique(),
  scene_name: text('scene_name').notNull(),
  prompt_template: text('prompt_template').notNull(),
  description: text('description'),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});
