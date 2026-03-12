import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 55;

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization');
  const body = await request.json();

  const res = await fetch('http://localhost:3002/api/client/ai-assist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
