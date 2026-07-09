import { brandKits, fromDbBrandKit, projects } from '@onlook/db';
import { formatCritiqueFeedbackForRevision, runCritique } from '@onlook/aegis';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyProjectAccess } from '../project/helper';

const buildCheckResultSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.string()),
});

const accessibilityScanResultSchema = z.object({
    violations: z.array(
        z.object({
            rule: z.string(),
            impact: z.enum(['minor', 'moderate', 'serious', 'critical']),
            description: z.string(),
        }),
    ),
});

export const aegisRouter = createTRPCRouter({
    /**
     * Judges one Forge proposal and returns its per-lens findings. Diff-gathering
     * and any real build/accessibility scan happen client-side (where the live
     * sandbox is) - this endpoint is just the judging seam. Aegis is advisory:
     * Forge presents these findings to the user as suggestions rather than gating
     * anything (see packages/forge/src/propose/system-prompt.ts).
     */
    critique: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                summary: z.string(),
                filesChanged: z.array(z.string()),
                codeDiff: z.string(),
                screenshotDescription: z.string().optional(),
                buildCheckResult: buildCheckResultSchema.optional(),
                accessibilityScanResult: accessibilityScanResultSchema.optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);

            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
            });
            const brandKitRow = project?.brandKitId
                ? await ctx.db.query.brandKits.findFirst({
                      where: eq(brandKits.id, project.brandKitId),
                  })
                : undefined;

            const result = await runCritique({
                summary: input.summary,
                filesChanged: input.filesChanged,
                codeDiff: input.codeDiff,
                brandKit: brandKitRow ? fromDbBrandKit(brandKitRow) : undefined,
                screenshotDescription: input.screenshotDescription,
                buildCheckResult: input.buildCheckResult,
                accessibilityScanResult: input.accessibilityScanResult,
            });

            return {
                ...result,
                // Feeds directly into Forge's next REVISE turn - no
                // re-summarization, so it sees exactly what each lens flagged.
                revisionInstructions: result.approved
                    ? undefined
                    : formatCritiqueFeedbackForRevision(result),
            };
        }),
});
