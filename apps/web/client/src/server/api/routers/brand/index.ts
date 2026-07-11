import { brandKits, fromDbBrandKit, projects, toDbBrandKitUpdate } from '@onlook/db';
import { prepareDocContent, runIntakeTurn } from '@onlook/forge';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyProjectAccess } from '../project/helper';

const intakeHistoryMessage = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

export const brandKitRouter = createTRPCRouter({
    listMine: protectedProcedure.query(async ({ ctx }) => {
        const rows = await ctx.db.query.brandKits.findMany({
            where: eq(brandKits.creatorId, ctx.user.id),
        });
        return rows.map(fromDbBrandKit);
    }),

    get: protectedProcedure
        .input(z.object({ brandKitId: z.string() }))
        .query(async ({ ctx, input }) => {
            // Scope every lookup to the requesting user, not just the id -
            // this is the exact class of bug (CVE-2025-63783) we audited for
            // in Phase 0; don't reintroduce it here.
            const row = await ctx.db.query.brandKits.findFirst({
                where: and(eq(brandKits.id, input.brandKitId), eq(brandKits.creatorId, ctx.user.id)),
            });
            return row ? fromDbBrandKit(row) : null;
        }),

    create: protectedProcedure
        .input(z.object({ displayName: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            const [row] = await ctx.db
                .insert(brandKits)
                .values({
                    creatorId: ctx.user.id,
                    displayName: input.displayName,
                })
                .returning();
            if (!row) {
                throw new Error('Failed to create brand kit');
            }
            return fromDbBrandKit(row);
        }),

    runIntakeTurn: protectedProcedure
        .input(
            z.object({
                brandKitId: z.string(),
                history: z.array(intakeHistoryMessage),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const row = await ctx.db.query.brandKits.findFirst({
                where: and(eq(brandKits.id, input.brandKitId), eq(brandKits.creatorId, ctx.user.id)),
            });
            if (!row) {
                throw new Error('Brand kit not found');
            }

            const draft = fromDbBrandKit(row);
            const result = await runIntakeTurn({ draft, history: input.history });

            await ctx.db
                .update(brandKits)
                .set(toDbBrandKitUpdate(result.draft))
                .where(eq(brandKits.id, input.brandKitId));

            return result;
        }),

    ingestDoc: protectedProcedure
        .input(
            z.object({
                brandKitId: z.string(),
                // Either pasted/text-format content, or a PDF handed to Claude as
                // a native document. Word (.docx) is unsupported (Claude can't
                // read it) - the UI directs those to PDF export.
                doc: z.discriminatedUnion('kind', [
                    z.object({
                        kind: z.literal('text'),
                        text: z.string().min(1),
                        filename: z.string().optional(),
                    }),
                    z.object({
                        kind: z.literal('pdf'),
                        dataBase64: z.string().min(1),
                        filename: z.string(),
                    }),
                ]),
                history: z.array(intakeHistoryMessage),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const row = await ctx.db.query.brandKits.findFirst({
                where: and(eq(brandKits.id, input.brandKitId), eq(brandKits.creatorId, ctx.user.id)),
            });
            if (!row) {
                throw new Error('Brand kit not found');
            }

            const draft = fromDbBrandKit(row);

            // Store the full document on the kit (no cropping, no lossy field
            // extraction) so the intake agent can read and converse over it.
            const { content, ref } = await prepareDocContent(input.doc);
            const withDoc: typeof draft = {
                ...draft,
                sourceDocs: [...draft.sourceDocs, { type: 'upload' as const, ref, content }],
            };
            await ctx.db
                .update(brandKits)
                .set(toDbBrandKitUpdate(withDoc))
                .where(eq(brandKits.id, input.brandKitId));

            // Run a turn so Forge reads the document, records what it finds, and
            // responds conversationally - rather than a one-shot silent extract.
            const result = await runIntakeTurn({
                draft: withDoc,
                history: [
                    ...input.history,
                    { role: 'user', content: `I've uploaded a brand document: ${ref}.` },
                ],
            });
            await ctx.db
                .update(brandKits)
                .set(toDbBrandKitUpdate(result.draft))
                .where(eq(brandKits.id, input.brandKitId));

            return result;
        }),

    getForProject: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
            });
            if (!project?.brandKitId) {
                return null;
            }
            const row = await ctx.db.query.brandKits.findFirst({
                where: eq(brandKits.id, project.brandKitId),
            });
            return row ? fromDbBrandKit(row) : null;
        }),

    linkToProject: protectedProcedure
        .input(z.object({ projectId: z.string(), brandKitId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
            const brandKit = await ctx.db.query.brandKits.findFirst({
                where: and(eq(brandKits.id, input.brandKitId), eq(brandKits.creatorId, ctx.user.id)),
            });
            if (!brandKit) {
                throw new Error('Brand kit not found');
            }
            await ctx.db
                .update(projects)
                .set({ brandKitId: input.brandKitId })
                .where(eq(projects.id, input.projectId));
        }),
});
