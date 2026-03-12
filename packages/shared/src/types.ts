// ===== User Types =====
export type UserRole = 'admin' | 'client';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  username?: string;
  password?: string;
  role?: UserRole;
}

// ===== Auth Types =====
export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ===== Model Config Types =====
export type ModelProvider = 'kimi' | 'minimax';

export interface ModelConfig {
  id: number;
  provider: ModelProvider;
  model_name: string;
  api_key: string;
  base_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateModelConfigInput {
  provider: ModelProvider;
  model_name: string;
  api_key: string;
  base_url: string;
}

// ===== Document Types =====
export type DocumentStatus = 'pending' | 'processing' | 'done' | 'failed';
export type FileType = 'excel' | 'doc';

export interface MindmapNode {
  id: string;
  label: string;
  content?: string;
  children?: MindmapNode[];
}

export interface Document {
  id: number;
  name: string;
  file_path: string;
  file_type: FileType;
  mindmap_json: MindmapNode | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

// ===== Virtual Customer Types =====
export interface VirtualCustomer {
  id: number;
  document_id: number;
  node_path: string[];
  prompt: string | null;
  name: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  demand: string;
  mood: string;
  persona_prompt: string;
  created_at: string;
  updated_at: string;
  document_name?: string;
}

export interface GenerateCustomerInput {
  document_id: number;
  node_path: string[];
  prompt: string;
}

export interface CreateCustomerInput {
  document_id: number;
  node_path: string[];
  name: string;
  age?: number;
  gender?: 'male' | 'female';
  demand: string;
  mood: string;
  persona_prompt: string;
}

// ===== Course & Knowledge Types =====
export interface Course {
  id: number;
  document_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  document_name?: string;
  knowledge_point_count?: number;
}

export interface KnowledgePoint {
  id: number;
  course_id: number;
  document_id: number;
  node_path: string[];
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseInput {
  document_id: number;
  name: string;
  description?: string;
}

export interface CreateKnowledgePointInput {
  node_path: string[];
  title: string;
  content: string;
}

export interface GenerateKnowledgePointsInput {
  document_id: number;
  node_path: string[];
}

// ===== Practice Record Types =====
export type PracticeType = 'teaching' | 'customer';
export type PracticeStatus = 'in_progress' | 'completed' | 'failed' | 'quit';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  feedback?: string; // 话术评价 (对练时)
  timestamp: string;
}

export interface PracticeRecord {
  id: number;
  user_id: number;
  type: PracticeType;
  course_id: number | null;
  customer_id: number | null;
  document_id: number;
  chat_history: ChatMessage[];
  status: PracticeStatus;
  result_summary: any;
  created_at: string;
  updated_at: string;
  username?: string;
  course_name?: string;
  customer_name?: string;
  document_name?: string;
}

// ===== User Progress Types =====
export interface UserKnowledgeProgress {
  id: number;
  user_id: number;
  knowledge_point_id: number;
  course_id: number;
  mastered: boolean;
  mastered_at: string | null;
  updated_at: string;
}

export interface UserCustomerResult {
  id: number;
  user_id: number;
  customer_id: number;
  practice_record_id: number;
  resolved: 0 | 1 | 2; // 0=未解决, 1=已解决, 2=失败
  created_at: string;
}

// ===== Profile Types =====
export interface UserProfile {
  user_id: number;
  username: string;
  documents: DocumentMastery[];
}

export interface DocumentMastery {
  document_id: number;
  document_name: string;
  knowledge_points_total: number;
  knowledge_points_mastered: number;
  practice_total: number;
  practice_success: number;
}

// ===== API Response Types =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
