import type { BrandAssets, BrandKitDraft, BrandIdentityTokens, SourceDoc } from '@onlook/brand-schema';
import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { users } from '../user';

export const BRAND_KIT_PROJECT_RELATION_NAME = 'brand_kit_projects';

/**
 * A BrandKit is owned by a user and reusable across that user's projects
 * (see `projects.brandKitId`) - unlike every competitor, which treats brand
 * intake as one-shot generation input, we persist it as a durable asset.
 * Every field is stored as a partial/draft shape (`@onlook/brand-schema`'s
 * `BrandKitDraft`) since Forge fills it in incrementally.
 */
export const brandKits = pgTable('brand_kits', {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    version: integer('version').default(1).notNull(),
    displayName: varchar('display_name'),
    colorTokens: jsonb('color_tokens').$type<BrandIdentityTokens['color']>().default({}),
    typographyTokens: jsonb('typography_tokens').$type<BrandIdentityTokens['typography']>().default({}),
    spacingTokens: jsonb('spacing_tokens').$type<BrandIdentityTokens['spacing']>(),
    shadowTokens: jsonb('shadow_tokens').$type<BrandIdentityTokens['shadow']>(),
    assets: jsonb('assets').$type<BrandAssets>().default({ logos: [], images: [] }),
    strategy: jsonb('strategy').$type<BrandKitDraft['strategy']>().default({ objections: [] }),
    sourceDocs: jsonb('source_docs').$type<SourceDoc[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const brandKitInsertSchema = createInsertSchema(brandKits);
export const brandKitUpdateSchema = createUpdateSchema(brandKits, {
    id: z.uuid(),
});

export const brandKitRelations = relations(brandKits, ({ many, one }) => ({
    creator: one(users, {
        fields: [brandKits.creatorId],
        references: [users.id],
    }),
    projects: many(projects, {
        relationName: BRAND_KIT_PROJECT_RELATION_NAME,
    }),
}));

export type BrandKitRow = typeof brandKits.$inferSelect;
export type NewBrandKitRow = typeof brandKits.$inferInsert;
