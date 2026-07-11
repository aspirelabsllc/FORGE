import { z } from 'zod';
import { brandAssets } from '../assets';
import { brandStrategy, targetConsumer, brandVoice } from '../strategy';
import { designTokenGroup, isTokenGroupEmpty } from '../tokens';

export const SOURCE_DOC_TYPES = ['upload', 'url', 'form'] as const;
export const sourceDocType = z.enum(SOURCE_DOC_TYPES);

export const sourceDoc = z.object({
    type: sourceDocType,
    ref: z.string(),
    /**
     * Full text of the uploaded document (PDFs are transcribed to text first).
     * Kept whole - not a lossy extraction - so the intake agent can read and
     * converse over the actual document, not just a few pulled fields.
     */
    content: z.string().optional(),
});
export type SourceDoc = z.infer<typeof sourceDoc>;

/**
 * BrandKit is built up incrementally over the course of Forge's INTAKE
 * conversation, so every field is optional here — this is the shape actually
 * persisted turn-by-turn. Use `isBrandKitReadyForProposal` to check whether a
 * draft has enough to move into PROPOSE mode, rather than a second "complete"
 * schema that would drift from this one.
 */
export const brandKitDraft = z.object({
    id: z.string(),
    version: z.number().int().default(1),
    identity: z
        .object({
            tokens: z
                .object({
                    color: designTokenGroup.default({}),
                    typography: designTokenGroup.default({}),
                    spacing: designTokenGroup.optional(),
                    shadow: designTokenGroup.optional(),
                })
                .default({ color: {}, typography: {} }),
            assets: brandAssets.default({ logos: [], images: [] }),
        })
        .default({ tokens: { color: {}, typography: {} }, assets: { logos: [], images: [] } }),
    strategy: z
        .object({
            positioningStatement: z.string().optional(),
            targetConsumer: targetConsumer.partial().optional(),
            voice: brandVoice.partial().optional(),
            objections: brandStrategy.shape.objections.default([]),
        })
        .default({ objections: [] }),
    sourceDocs: z.array(sourceDoc).default([]),
});
export type BrandKitDraft = z.infer<typeof brandKitDraft>;

export interface ChecklistItem {
    fieldPath: string;
    label: string;
    complete: boolean;
}

/**
 * The minimum bar for Forge to stop asking intake questions and start
 * proposing designs: a positioning statement, a described target consumer,
 * at least one tone adjective, and at least a color + typography token group.
 * Everything else (objections, assets, spacing/shadow tokens) is valuable but
 * not blocking — Forge can propose with sensible defaults and refine later.
 */
export const computeIntakeChecklist = (draft: BrandKitDraft): ChecklistItem[] => [
    {
        fieldPath: 'strategy.positioningStatement',
        label: 'Positioning statement',
        complete: !!draft.strategy.positioningStatement?.trim(),
    },
    {
        fieldPath: 'strategy.targetConsumer.description',
        label: 'Target consumer description',
        complete: !!draft.strategy.targetConsumer?.description?.trim(),
    },
    {
        fieldPath: 'strategy.voice.toneAdjectives',
        label: 'Voice / tone adjectives',
        complete: (draft.strategy.voice?.toneAdjectives?.length ?? 0) > 0,
    },
    {
        fieldPath: 'identity.tokens.color',
        label: 'Color tokens',
        complete: !isTokenGroupEmpty(draft.identity.tokens.color),
    },
    {
        fieldPath: 'identity.tokens.typography',
        label: 'Typography tokens',
        complete: !isTokenGroupEmpty(draft.identity.tokens.typography),
    },
];

export const isBrandKitReadyForProposal = (draft: BrandKitDraft): boolean =>
    computeIntakeChecklist(draft).every((item) => item.complete);

export const nextIncompleteChecklistItem = (draft: BrandKitDraft): ChecklistItem | undefined =>
    computeIntakeChecklist(draft).find((item) => !item.complete);
