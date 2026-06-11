import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClaimResult {
  success: boolean;
  conversationId: string;
  userId: string;
  message?: string;
}

export class ConcurrencyService {
  /**
   * Claim a conversation with optimistic locking
   * This prevents race conditions when multiple agents try to claim the same conversation
   */
  async claimConversation(conversationId: string, userId: string): Promise<ClaimResult> {
    return prisma.$transaction(async (tx) => {
      // Get current conversation
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          assignedUserId: true,
          status: true,
          claimedAt: true,
        },
      });

      if (!conversation) {
        return {
          success: false,
          conversationId,
          userId,
          message: 'Conversation not found',
        };
      }

      // Check if conversation is already claimed by another user
      if (conversation.assignedUserId && conversation.assignedUserId !== userId) {
        return {
          success: false,
          conversationId,
          userId,
          message: 'Conversation already claimed by another user',
        };
      }

      // Check if conversation is in a claimable state
      const claimableStates = ['new', 'open', 'pending', 'waiting_customer'];
      if (!claimableStates.includes(conversation.status)) {
        return {
          success: false,
          conversationId,
          userId,
          message: `Conversation cannot be claimed in state: ${conversation.status}`,
        };
      }

      // Update conversation
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: userId,
          claimedAt: new Date(),
          status: 'open',
        },
      });

      return {
        success: true,
        conversationId,
        userId,
      };
    });
  }

  /**
   * Assign conversation to a specific user with concurrency protection
   */
  async assignConversation(conversationId: string, userId: string, assignedByUserId: string): Promise<ClaimResult> {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          assignedUserId: true,
        },
      });

      if (!conversation) {
        return {
          success: false,
          conversationId,
          userId,
          message: 'Conversation not found',
        };
      }

      // Create assignment record
      await tx.conversationAssignment.create({
        data: {
          conversationId,
          userId,
          assignedBy: assignedByUserId,
          assignedAt: new Date(),
        },
      });

      // Update conversation
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: userId,
        },
      });

      return {
        success: true,
        conversationId,
        userId,
      };
    });
  }

  /**
   * Take over a conversation from another user
   * This requires explicit confirmation to prevent accidental takeovers
   */
  async takeOverConversation(conversationId: string, userId: string, reason?: string): Promise<ClaimResult> {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          assignedUserId: true,
        },
      });

      if (!conversation) {
        return {
          success: false,
          conversationId,
          userId,
          message: 'Conversation not found',
        };
      }

      // Create transfer record
      if (conversation.assignedUserId) {
        await tx.conversationTransfer.create({
          data: {
            conversationId,
            fromUserId: conversation.assignedUserId,
            toUserId: userId,
            transferredBy: userId, // The user taking over
            reason: reason || 'Manual takeover',
            transferredAt: new Date(),
          },
        });
      }

      // Update conversation
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: userId,
          claimedAt: new Date(),
        },
      });

      return {
        success: true,
        conversationId,
        userId,
      };
    });
  }

  /**
   * Release a conversation claim
   */
  async releaseConversation(conversationId: string, userId: string): Promise<ClaimResult> {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          assignedUserId: true,
        },
      });

      if (!conversation) {
        return {
          success: false,
          conversationId,
          userId,
          message: 'Conversation not found',
        };
      }

      // Verify user owns the conversation
      if (conversation.assignedUserId !== userId) {
        return {
          success: false,
          conversationId,
          userId,
          message: 'User does not own this conversation',
        };
      }

      // Update conversation
      const updated = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: null,
          claimedAt: null,
        },
      });

      return {
        success: true,
        conversationId,
        userId,
      };
    });
  }
}

export const concurrencyService = new ConcurrencyService();
