import { canvases, frameInsertSchema, frames, frameUpdateSchema, fromDbFrame } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyFrameAccess, verifyProjectAccess } from './helper';

export const frameRouter = createTRPCRouter({
    get: protectedProcedure
        .input(
            z.object({
                frameId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbFrame = await ctx.db.query.frames.findFirst({
                where: eq(frames.id, input.frameId),
            });
            if (!dbFrame) {
                return null;
            }
            await verifyFrameAccess(ctx.db, ctx.user.id, input.frameId);
            return fromDbFrame(dbFrame);
        }),
    getByCanvas: protectedProcedure
        .input(
            z.object({
                canvasId: z.string(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const canvas = await ctx.db.query.canvases.findFirst({
                where: eq(canvases.id, input.canvasId),
            });
            if (!canvas) {
                return [];
            }
            await verifyProjectAccess(ctx.db, ctx.user.id, canvas.projectId);
            const dbFrames = await ctx.db.query.frames.findMany({
                where: eq(frames.canvasId, input.canvasId),
                orderBy: (frames, { asc }) => [asc(frames.x), asc(frames.y)],
            });
            return dbFrames.map((frame) => fromDbFrame(frame));
        }),
    create: protectedProcedure
        .input(frameInsertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const canvas = await ctx.db.query.canvases.findFirst({
                    where: eq(canvases.id, input.canvasId),
                });
                if (!canvas) {
                    throw new Error('Canvas not found');
                }
                await verifyProjectAccess(ctx.db, ctx.user.id, canvas.projectId);
                await ctx.db.insert(frames).values(input);
                return true;
            } catch (error) {
                console.error('Error creating frame', error);
                return false;
            }
        }),
    update: protectedProcedure
        .input(frameUpdateSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await verifyFrameAccess(ctx.db, ctx.user.id, input.id);
                await ctx.db
                    .update(frames)
                    .set(input)
                    .where(
                        eq(frames.id, input.id)
                    );
                return true;
            } catch (error) {
                console.error('Error updating frame', error);
                return false;
            }
        }),
    delete: protectedProcedure
        .input(
            z.object({
                frameId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                await verifyFrameAccess(ctx.db, ctx.user.id, input.frameId);
                await ctx.db.delete(frames).where(eq(frames.id, input.frameId));
                return true;
            } catch (error) {
                console.error('Error deleting frame', error);
                return false;
            }
        }),
});
