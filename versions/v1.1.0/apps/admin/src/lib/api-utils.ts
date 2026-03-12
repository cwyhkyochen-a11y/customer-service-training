import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './auth';
import type { ApiResponse, User, UserRole } from '@cs-training/shared';

// ===== Unified Response Helpers =====

export function success<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message });
}

export function error(message: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ===== Pagination =====

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const page_size = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') || '10', 10)));
  const offset = (page - 1) * page_size;
  return { page, page_size, offset };
}

// ===== Auth Middleware =====

export async function requireAuth(
  request: NextRequest,
  role?: UserRole
): Promise<{ user: User } | NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return error('未登录或token已过期', 401);
  }
  if (role && user.role !== role) {
    return error('权限不足', 403);
  }
  return { user };
}

export function isErrorResponse(result: { user: User } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
