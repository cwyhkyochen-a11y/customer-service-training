import { SignJWT, jwtVerify } from 'jose';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@cs-training/database';
import { users } from '@cs-training/database';
import { eq } from 'drizzle-orm';
import type { User, UserRole } from '@cs-training/shared';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cs-training-secret-key-2024'
);

// ===== Password Hashing =====

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
    });
  });
}

// ===== JWT =====

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ===== Get Current User from Request =====

export async function getCurrentUser(request: NextRequest): Promise<(User & { role: UserRole }) | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    created_at: users.created_at,
    updated_at: users.updated_at,
  }).from(users).where(eq(users.id, payload.userId)).get();

  if (!user) return null;
  return user as User & { role: UserRole };
}
