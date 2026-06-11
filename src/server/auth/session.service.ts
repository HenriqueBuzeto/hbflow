import { prisma } from '../db/prisma';
import { TokenService, TokenPayload } from './token.service';
import { randomBytes } from 'crypto';

export class SessionService {
  static async createSession(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId,
        token,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return session;
  }

  static async getSession(token: string) {
    return prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            tenant: true,
            role: true,
          },
        },
      },
    });
  }

  static async deleteSession(token: string) {
    return prisma.session.delete({
      where: { token },
    });
  }

  static async deleteAllUserSessions(userId: string) {
    return prisma.session.deleteMany({
      where: { userId },
    });
  }

  static async cleanupExpiredSessions() {
    return prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  static async updateSessionActivity(token: string) {
    return prisma.session.update({
      where: { token },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }
}
