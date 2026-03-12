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

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'client';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface Document {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  mindmap_json: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  content?: string;
  children?: MindmapNode[];
}

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
}

export interface VirtualCustomer {
  id: number;
  document_id: number;
  node_path: string[];
  prompt: string | null;
  name: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  demand: string;
  question: string;
  scene_type: 'pre_sale' | 'after_sale';
  mood: string;
  virtual_product: any | null;
  virtual_order: any | null;
  persona_prompt: string;
  created_at: string;
  updated_at: string;
  document_name?: string;
}

export interface PracticeRecord {
  id: number;
  user_id: number;
  type: 'teaching' | 'customer';
  course_id: number | null;
  customer_id: number | null;
  document_id: number;
  chat_history: any[];
  status: string;
  result_summary: any;
  created_at: string;
  updated_at: string;
  course_name?: string;
  customer_name?: string;
  document_name?: string;
}

export interface DocumentMastery {
  document_id: number;
  document_name: string;
  knowledge_points_total: number;
  knowledge_points_mastered: number;
  practice_total: number;
  practice_success: number;
}

export interface UserProfile {
  user_id: number;
  username: string;
  documents: DocumentMastery[];
}

const API_BASE = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)client-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string) {
  document.cookie = `client-token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  document.cookie = 'client-token=; path=/; max-age=0';
}

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok && !json.error) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    return json;
  } catch (e: any) {
    return { success: false, error: e.message || '网络错误' };
  }
}

// ===== Auth =====
export async function login(input: LoginInput) {
  return request<AuthResponse>('/client/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMe() {
  return request<User>('/auth/me');
}

// ===== Documents (client endpoints) =====
export async function getDocuments(params?: { page?: number; page_size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  return request<PaginatedResponse<Document>>(`/client/documents?${sp.toString()}`);
}

export async function getDocument(id: number) {
  return request<Document>(`/client/documents/${id}/mindmap`);
}

export async function getDocumentMindmap(id: number) {
  return request<{ mindmap: MindmapNode }>(`/client/documents/${id}/mindmap`);
}

export interface Slide {
  id: number;
  page_number: number;
  title: string;
  html_content: string;
}

export async function getDocumentSlides(id: number) {
  return request<Slide[]>(`/client/documents/${id}/slides`);
}

// ===== Courses (client endpoints) =====
export async function getCourses(params?: { page?: number; page_size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  return request<PaginatedResponse<Course & { mastered_count?: number }>>(`/client/courses?${sp.toString()}`);
}

export interface TeachingStartResponse {
  record_id: number;
  course_name: string;
  knowledge_point: { id: number; title: string };
  question: string;
  hint?: string;
  all_mastered?: boolean;
  progress: { total: number; mastered: number };
}

export interface TeachingAnswerResponse {
  correct: boolean;
  score: number;
  comment: string;
  correct_answer: string;
  mastered: boolean;
  all_mastered: boolean;
  next_question?: string;
  next_hint?: string;
  next_kp_title?: string;
  progress: { total: number; mastered: number };
}

export async function startTeaching(courseId: number) {
  return request<TeachingStartResponse>(`/client/courses/${courseId}/start`, {
    method: 'POST',
  });
}

export async function sendTeachingMessage(courseId: number, recordId: number, message: string) {
  return request<TeachingAnswerResponse>(`/client/courses/${courseId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ record_id: recordId, message }),
  });
}

export async function quitTeaching(courseId: number, recordId: number) {
  return request(`/client/courses/${courseId}/quit`, {
    method: 'POST',
    body: JSON.stringify({ record_id: recordId }),
  });
}

// ===== Virtual Customers (client endpoints) =====
export async function getCustomers(params?: { page?: number; page_size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  return request<PaginatedResponse<VirtualCustomer & { resolved?: number | null }>>(`/client/customers?${sp.toString()}`);
}

export async function startCustomerPractice(customerId: number) {
  return request<{ record_id: number; customer: any }>(`/client/customers/${customerId}/start`, {
    method: 'POST',
  });
}

export async function sendCustomerMessage(customerId: number, recordId: number, message: string) {
  return request<{ message: string; feedback: string; finished: boolean; status: string }>(
    `/client/customers/${customerId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({ record_id: recordId, message }),
    }
  );
}

export async function quitCustomerPractice(customerId: number, recordId: number) {
  return request(`/client/customers/${customerId}/quit`, {
    method: 'POST',
    body: JSON.stringify({ record_id: recordId }),
  });
}

// ===== Records =====
export async function getRecords(params?: { page?: number; page_size?: number; type?: string }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  if (params?.type) sp.set('type', params.type);
  return request<PaginatedResponse<PracticeRecord>>(`/client/records?${sp.toString()}`);
}

// ===== Profile =====
export async function getMyProfile() {
  return request<UserProfile>('/client/profile');
}

// ===== AI Assist =====
export async function aiAssist(data: { document_ids: number[]; customer_message: string; context?: string }) {
  return request<{ reply: string }>('/client/ai-assist', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
