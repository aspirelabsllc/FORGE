import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { branches } from '../project/branch';

export const editorEnum = pgEnum('editor', ['forge', 'user']);

/**
 * Node-level ownership ledger, keyed by oid+branchId (mirrors TemplateNode's
 * own keys). This is the "ask first" conflict-check's source of truth: see
 * @onlook/attribution's checkForConflicts, which reads rows here to decide
 * whether Forge's next regeneration would clobber a user's manual GUI edit
 * (or vice versa).
 */
export const ownershipRecords = pgTable('ownership_records', {
    id: uuid('id').primaryKey().defaultRandom(),
    oid: varchar('oid').notNull(),
    branchId: uuid('branch_id')
        .notNull()
        .references(() => branches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    lastEditor: editorEnum('last_editor').notNull(),
    lastEditedAt: timestamp('last_edited_at', { withTimezone: true }).defaultNow().notNull(),
    lastCommitOid: varchar('last_commit_oid'),
    locked: boolean('locked').default(false).notNull(),
}, (table) => [
    uniqueIndex('ownership_records_oid_branch_ux').on(table.oid, table.branchId),
]).enableRLS();

export const ownershipRecordInsertSchema = createInsertSchema(ownershipRecords);
export const ownershipRecordUpdateSchema = createUpdateSchema(ownershipRecords, {
    oid: z.string(),
    branchId: z.uuid(),
});

export const ownershipRecordRelations = relations(ownershipRecords, ({ one }) => ({
    branch: one(branches, {
        fields: [ownershipRecords.branchId],
        references: [branches.id],
    }),
}));

export type OwnershipRecordRow = typeof ownershipRecords.$inferSelect;
export type NewOwnershipRecordRow = typeof ownershipRecords.$inferInsert;
