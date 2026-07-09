import { brandKitDraft, type BrandKitDraft } from '@onlook/brand-schema';
import type { BrandKitRow } from '../schema/brand';

export const fromDbBrandKit = (row: BrandKitRow): BrandKitDraft =>
    brandKitDraft.parse({
        id: row.id,
        version: row.version,
        identity: {
            tokens: {
                color: row.colorTokens ?? {},
                typography: row.typographyTokens ?? {},
                spacing: row.spacingTokens ?? undefined,
                shadow: row.shadowTokens ?? undefined,
            },
            assets: row.assets ?? { logos: [], images: [] },
        },
        strategy: row.strategy ?? {},
        sourceDocs: row.sourceDocs ?? [],
    });

export const toDbBrandKitUpdate = (draft: BrandKitDraft) => ({
    version: draft.version,
    colorTokens: draft.identity.tokens.color,
    typographyTokens: draft.identity.tokens.typography,
    spacingTokens: draft.identity.tokens.spacing,
    shadowTokens: draft.identity.tokens.shadow,
    assets: draft.identity.assets,
    strategy: draft.strategy,
    sourceDocs: draft.sourceDocs,
});
