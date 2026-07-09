import { checkForConflicts, type OwnershipRecord } from '@onlook/attribution';
import { fromDbOwnershipRecord, ownershipRecords } from '@onlook/db';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyBranchAccess } from '../project/helper';

const editorSchema = z.enum(['forge', 'user']);

export const attributionRouter = createTRPCRouter({
    /**
     * Fire-and-forget from ActionManager.run() (GUI edits) and after a Forge
     * write_file/search_replace_edit_file call (oids derived via
     * extractOidsFromFileContent) - the single write path for the ledger,
     * regardless of which editor is recording.
     */
    recordEdits: protectedProcedure
        .input(
            z.object({
                branchId: z.string(),
                oids: z.array(z.string()),
                editor: editorSchema,
                commitOid: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await verifyBranchAccess(ctx.db, ctx.user.id, input.branchId);
            if (input.oids.length === 0) {
                return;
            }
            for (const oid of input.oids) {
                await ctx.db
                    .insert(ownershipRecords)
                    .values({
                        oid,
                        branchId: input.branchId,
                        lastEditor: input.editor,
                        lastCommitOid: input.commitOid,
                    })
                    .onConflictDoUpdate({
                        target: [ownershipRecords.oid, ownershipRecords.branchId],
                        set: {
                            lastEditor: input.editor,
                            lastEditedAt: new Date(),
                            lastCommitOid: input.commitOid,
                        },
                    });
            }
        }),

    /**
     * "Ask first" gate: called before Forge's regeneration (or a GUI action)
     * would touch a set of oids, to find out which are owned by the other
     * editor and should surface a confirmation instead of silently applying.
     */
    checkConflicts: protectedProcedure
        .input(
            z.object({
                branchId: z.string(),
                oids: z.array(z.string()),
                actingEditor: editorSchema,
            }),
        )
        .query(async ({ ctx, input }) => {
            await verifyBranchAccess(ctx.db, ctx.user.id, input.branchId);
            if (input.oids.length === 0) {
                return [];
            }
            const rows = await ctx.db.query.ownershipRecords.findMany({
                where: and(
                    eq(ownershipRecords.branchId, input.branchId),
                    inArray(ownershipRecords.oid, input.oids),
                ),
            });
            const ledger = new Map<string, OwnershipRecord>(
                rows.map((row) => [row.oid, fromDbOwnershipRecord(row)]),
            );
            return checkForConflicts(input.oids, ledger, input.actingEditor);
        }),
});
