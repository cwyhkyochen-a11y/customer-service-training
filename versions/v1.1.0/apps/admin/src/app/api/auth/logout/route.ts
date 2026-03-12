import { NextRequest } from 'next/server';
import { success } from '@/lib/api-utils';

export async function POST(_request: NextRequest) {
  // Stateless JWT — client just discards the token
  return success(null, '已登出');
}
