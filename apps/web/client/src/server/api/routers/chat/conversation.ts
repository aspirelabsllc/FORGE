import { initModel } from '@onlook/ai';
import {
    conversationInsertSchema,
    conversations,
    conversationUpdateSchema,
    fromDbConversation
} from '@onlook/db';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateText } from 'ai';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyProjectAccess } from '../project/helper';

/**
 * Verifies that a user has access to a conversation by resolving its parent
 * project and delegating to verifyProjectAccess.
 * @throws Error if the conversation does not exist or the user does not have access to its project
 */
export async function verifyConversationAccess(
    db: Parameters<typeof verifyProjectAccess>[0],
    userId: string,
    conversationId: string,
) {
    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
    });
    if (!conversation) {
        throw new Error('Conversation not found');
    }
    await verifyProjectAccess(db, userId, conversation.projectId);
    return conversation;
}

export const conversationRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.projectId),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
            return dbConversations.map((conversation) => fromDbConversation(conversation));
        }),
    get: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const conversation = await verifyConversationAccess(ctx.db, ctx.user.id, input.conversationId);
            return fromDbConversation(conversation);
        }),
    upsert: protectedProcedure
        .input(conversationInsertSchema)
        .mutation(async ({ ctx, input }) => {
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
            const [conversation] = await ctx.db.insert(conversations).values(input).returning();
            if (!conversation) {
                throw new Error('Conversation not created');
            }
            return fromDbConversation(conversation);
        }),
    update: protectedProcedure
        .input(conversationUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            await verifyConversationAccess(ctx.db, ctx.user.id, input.id);
            const [conversation] = await ctx.db.update({
                ...conversations,
                updatedAt: new Date(),
            }).set(input)
                .where(eq(conversations.id, input.id)).returning();
            if (!conversation) {
                throw new Error('Conversation not updated');
            }
            return fromDbConversation(conversation);
        }),
    delete: protectedProcedure
        .input(z.object({
            conversationId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            await verifyConversationAccess(ctx.db, ctx.user.id, input.conversationId);
            await ctx.db.delete(conversations).where(eq(conversations.id, input.conversationId));
        }),
    generateTitle: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await verifyConversationAccess(ctx.db, ctx.user.id, input.conversationId);
            const { model, providerOptions, headers } = initModel({
                provider: LLMProvider.ANTHROPIC,
                model: CLAUDE_MODELS.HAIKU_4_5,
            });

            const MAX_NAME_LENGTH = 50;
            const result = await generateText({
                model,
                headers,
                prompt: `Generate a concise and meaningful conversation title (2-4 words maximum) that reflects the main purpose or theme of the conversation based on user's creation prompt. Generate only the conversation title, nothing else. Keep it short and descriptive. User's creation prompt: <prompt>${input.content}</prompt>`,
                providerOptions,
                maxOutputTokens: 50,
                experimental_telemetry: {
                    isEnabled: true,
                    metadata: {
                        conversationId: input.conversationId,
                        userId: ctx.user.id,
                        tags: ['conversation-title-generation'],
                        sessionId: input.conversationId,
                        langfuseTraceId: uuidv4(),
                    },
                },
            });

            const generatedName = result.text.trim();
            if (generatedName && generatedName.length > 0 && generatedName.length <= MAX_NAME_LENGTH) {
                await ctx.db.update(conversations).set({
                    displayName: generatedName,
                }).where(eq(conversations.id, input.conversationId));
                return generatedName;
            }

            console.error('Error generating conversation title', result);
            return null;
        }),
});
