import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = request.headers.get('Authorization');
  if (auth) headers['Authorization'] = auth;

  const body = await request.text();

  const res = await fetch(`http://localhost:3002/api/client/courses/${id}/chat`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(55000),
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
