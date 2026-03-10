import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me';
const ACCESS_TTL = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_TTL_DAYS = 7;

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string } | null> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token: oldToken } });
    return null;
  }

  // Rotate
  await prisma.refreshToken.delete({ where: { token: oldToken } });
  const newRefreshToken = await issueRefreshToken(stored.userId);
  const accessToken = signAccessToken({ sub: stored.userId, email: stored.user.email });

  return { accessToken, refreshToken: newRefreshToken, userId: stored.userId };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
}
