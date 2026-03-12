import type {
  ApiResponse,
  PaginatedResponse,
  User,
  CreateUserInput,
  UpdateUserInput,
  LoginInput,
  AuthResponse,
  ModelConfig,
  CreateModelConfigInput,
  Document,
  VirtualCustomer,
  GenerateCustomerInput,
  CreateCustomerInput,
  Course,
  CreateCourseInput,
  KnowledgePoint,
  CreateKnowledgePointInput,
  GenerateKnowledgePointsInput,
  PracticeRecord,
  UserProfile,
} from '@cs-training/shared';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)admin-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string) {
  document.cookie = `admin-token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  document.cookie = 'admin-token=; path=/; max-age=0';
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

  const res = await fetch(`/api${url}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok && !json.error) {
    return { success: false, error: `HTTP ${res.status}` };
  }
  return json;
}

// ===== Auth =====
export async function login(input: LoginInput) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMe() {
  return request<User>('/auth/me');
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

// ===== Users =====
export async function getUsers(params?: { page?: number; page_size?: number; search?: string; role?: string }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  if (params?.search) sp.set('search', params.search);
  if (params?.role) sp.set('role', params.role);
  return request<PaginatedResponse<User>>(`/users?${sp.toString()}`);
}

export async function createUser(input: CreateUserInput) {
  return request<User>('/users', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateUser(id: number, input: UpdateUserInput) {
  return request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteUser(id: number) {
  return request(`/users/${id}`, { method: 'DELETE' });
}

// ===== Model Configs =====
export async function getModels() {
  return request<PaginatedResponse<ModelConfig>>('/models');
}

export async function createModel(input: CreateModelConfigInput) {
  return request<ModelConfig>('/models', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateModel(id: number, input: Partial<CreateModelConfigInput>) {
  return request<ModelConfig>(`/models/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteModel(id: number) {
  return request(`/models/${id}`, { method: 'DELETE' });
}

export async function setDefaultModel(id: number) {
  return request(`/models/${id}/default`, { method: 'PUT' });
}

// ===== Documents =====
export async function getDocuments(params?: { page?: number; page_size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  return request<PaginatedResponse<Document>>(`/documents?${sp.toString()}`);
}

export async function getDocument(id: number) {
  return request<Document>(`/documents/${id}`);
}

export async function regenerateMindmap(id: number) {
  return request<null>(`/documents/${id}/mindmap`, { method: 'POST' });
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<Document>('/documents/upload', { method: 'POST', body: formData });
}

export async function deleteDocument(id: number) {
  return request(`/documents/${id}`, { method: 'DELETE' });
}

export async function generateSlides(docId: number) {
  return request<{ count: number }>(`/documents/${docId}/slides`, { method: 'POST' });
}

export async function getSlides(docId: number) {
  return request<Array<{ id: number; page_number: number; title: string; html_content: string }>>(`/documents/${docId}/slides`);
}

export async function deleteSlides(docId: number) {
  return request(`/documents/${docId}/slides`, { method: 'DELETE' });
}

export async function updateSlide(docId: number, slideId: number, data: { title?: string; html_content?: string }) {
  return request<{ id: number; page_number: number; title: string; html_content: string }>(`/documents/${docId}/slides`, {
    method: 'PATCH',
    body: JSON.stringify({ slide_id: slideId, ...data }),
  });
}

// ===== Usage Stats =====
export async function getUsageModels() {
  return request<string[]>('/usage?view=models');
}

export async function getUsageSummary(params?: { start_date?: string; end_date?: string; scene?: string; model_name?: string }) {
  const sp = new URLSearchParams({ view: 'summary' });
  if (params?.start_date) sp.set('start_date', params.start_date);
  if (params?.end_date) sp.set('end_date', params.end_date);
  if (params?.scene) sp.set('scene', params.scene);
  if (params?.model_name) sp.set('model_name', params.model_name);
  return request<{
    total_calls: number; success_calls: number; failed_calls: number;
    total_prompt_tokens: number; total_completion_tokens: number; total_tokens: number;
    total_cost: number; avg_duration: number;
  }>(`/usage?${sp}`);
}

export async function getUsageByScene(params?: { start_date?: string; end_date?: string; model_name?: string }) {
  const sp = new URLSearchParams({ view: 'by_scene' });
  if (params?.start_date) sp.set('start_date', params.start_date);
  if (params?.end_date) sp.set('end_date', params.end_date);
  if (params?.model_name) sp.set('model_name', params.model_name);
  return request<Array<{
    scene: string; total_calls: number; success_calls: number; failed_calls: number;
    total_tokens: number; total_cost: number; avg_duration: number;
  }>>(`/usage?${sp}`);
}

export async function getUsageByDay(params?: { start_date?: string; end_date?: string; model_name?: string }) {
  const sp = new URLSearchParams({ view: 'by_day' });
  if (params?.start_date) sp.set('start_date', params.start_date);
  if (params?.end_date) sp.set('end_date', params.end_date);
  if (params?.model_name) sp.set('model_name', params.model_name);
  return request<Array<{
    date: string; total_calls: number; success_calls: number; failed_calls: number;
    total_tokens: number; total_cost: number;
  }>>(`/usage?${sp}`);
}

export async function getUsageLogs(params?: { page?: number; page_size?: number; start_date?: string; end_date?: string; scene?: string; status?: string; model_name?: string }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  if (params?.start_date) sp.set('start_date', params.start_date);
  if (params?.end_date) sp.set('end_date', params.end_date);
  if (params?.scene) sp.set('scene', params.scene);
  if (params?.status) sp.set('status', params.status);
  if (params?.model_name) sp.set('model_name', params.model_name);
  return request<{ items: Array<Record<string, unknown>>; total: number; page: number; page_size: number }>(`/usage?${sp}`);
}

// ===== Prompts =====
export interface PromptConfig {
  scene_id: string;
  scene_name: string;
  description: string;
  prompt_template: string;
  has_custom: boolean;
  updated_at: string | null;
}

export async function getPrompts() {
  return request<PromptConfig[]>('/prompts');
}

export async function updatePrompt(data: { scene_id: string; scene_name?: string; prompt_template: string; description?: string }) {
  return request<Record<string, unknown>>('/prompts', { method: 'PUT', body: JSON.stringify(data) });
}

export async function resetPrompt(sceneId: string) {
  return request(`/prompts?scene_id=${sceneId}`, { method: 'DELETE' });
}

// ===== Virtual Customers =====
export async function getCustomers(params?: { page?: number; page_size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  return request<PaginatedResponse<VirtualCustomer>>(`/customers?${sp.toString()}`);
}

export async function createCustomer(input: CreateCustomerInput) {
  return request<VirtualCustomer>('/customers', { method: 'POST', body: JSON.stringify(input) });
}

export async function generateCustomer(input: GenerateCustomerInput) {
  return request<VirtualCustomer>('/customers/generate', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateCustomer(id: number, input: Partial<CreateCustomerInput>) {
  return request<VirtualCustomer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteCustomer(id: number) {
  return request(`/customers/${id}`, { method: 'DELETE' });
}

// ===== Courses =====
export async function getCourses(params?: { page?: number; page_size?: number }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  return request<PaginatedResponse<Course>>(`/courses?${sp.toString()}`);
}

export async function getCourse(id: number) {
  return request<Course>(`/courses/${id}`);
}

export async function createCourse(input: CreateCourseInput) {
  return request<Course>('/courses', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateCourse(id: number, input: Partial<CreateCourseInput>) {
  return request<Course>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteCourse(id: number) {
  return request(`/courses/${id}`, { method: 'DELETE' });
}

// ===== Knowledge Points =====
export async function getKnowledgePoints(courseId: number) {
  return request<PaginatedResponse<KnowledgePoint>>(`/courses/${courseId}/knowledge-points`);
}

export async function createKnowledgePoint(courseId: number, input: CreateKnowledgePointInput) {
  return request<KnowledgePoint>(`/courses/${courseId}/knowledge-points`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function generateKnowledgePoints(courseId: number, input: GenerateKnowledgePointsInput) {
  return request<KnowledgePoint[]>(`/courses/${courseId}/knowledge-points/generate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateKnowledgePoint(courseId: number, kpId: number, input: Partial<CreateKnowledgePointInput>) {
  return request<KnowledgePoint>(`/courses/${courseId}/knowledge-points/${kpId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteKnowledgePoint(courseId: number, kpId: number) {
  return request(`/courses/${courseId}/knowledge-points/${kpId}`, { method: 'DELETE' });
}

// ===== Practice Records =====
export async function getRecords(params?: { page?: number; page_size?: number; type?: string }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.page_size) sp.set('page_size', String(params.page_size));
  if (params?.type) sp.set('type', params.type);
  return request<PaginatedResponse<PracticeRecord>>(`/records?${sp.toString()}`);
}

export async function getRecord(id: number) {
  return request<PracticeRecord>(`/records/${id}`);
}

// ===== Profiles =====
export async function getProfiles() {
  return request<PaginatedResponse<any>>('/profiles');
}

export async function getProfile(userId: number) {
  return request<UserProfile>(`/profiles/${userId}`);
}
