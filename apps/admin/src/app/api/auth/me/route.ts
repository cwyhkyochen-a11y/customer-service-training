import { NextRequest } from 'next/server';
import { requireAuth, isErrorResponse, success } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isErrorResponse(auth)) return auth;

  return success(auth.user);
}
