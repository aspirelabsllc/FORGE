import { designTokenGroup, objection, type BrandKitDraft } from '@onlook/brand-schema';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Maps 1:1 onto `computeIntakeChecklist`'s field paths in
 * @onlook/brand-schema. A discriminated union keeps every field's payload
 * strongly typed instead of a stringly-typed `fieldPath` + `any value` pair.
 */
export const updateBrandKitFieldParams = z.discriminatedUnion('fieldPath', [
    z.object({
        fieldPath: z.literal('strategy.positioningStatement'),
        value: z.string(),
    }),
    z.object({
        fieldPath: z.literal('strategy.targetConsumer.description'),
        value: z.string(),
    }),
    z.object({
        fieldPath: z.literal('strategy.voice.toneAdjectives'),
        value: z.array(z.string()),
    }),
    z.object({
        fieldPath: z.literal('strategy.voice.doExamples'),
        value: z.array(z.string()),
    }),
    z.object({
        fieldPath: z.literal('strategy.voice.dontExamples'),
        value: z.array(z.string()),
    }),
    z.object({
        fieldPath: z.literal('strategy.targetConsumer.painPoints'),
        value: z.array(z.string()),
    }),
    z.object({
        fieldPath: z.literal('strategy.objections'),
        value: z.array(objection),
    }),
    z.object({
        fieldPath: z.literal('identity.tokens.color'),
        value: designTokenGroup,
    }),
    z.object({
        fieldPath: z.literal('identity.tokens.typography'),
        value: designTokenGroup,
    }),
]);
export type UpdateBrandKitFieldParams = z.infer<typeof updateBrandKitFieldParams>;

/**
 * Anthropic requires a tool's `input_schema` to be a top-level object
 * (`type: "object"`). A bare discriminated union compiles to `anyOf` with no
 * top-level `type`, which the API rejects ("input_schema.type: Field required").
 * So the tool wraps the union under a single `update` property; nested `anyOf`
 * inside an object is fine.
 */
export const updateBrandKitFieldToolInput = z.object({
    update: updateBrandKitFieldParams,
});

export const UPDATE_BRAND_KIT_FIELD_TOOL_NAME = 'update_brand_kit_field';

/**
 * Applies one field update to a BrandKitDraft. Pure function - the actual
 * tool `execute` below is a thin wrapper so this stays independently testable.
 */
export const applyBrandKitFieldUpdate = (
    draft: BrandKitDraft,
    params: UpdateBrandKitFieldParams,
): BrandKitDraft => {
    switch (params.fieldPath) {
        case 'strategy.positioningStatement':
            return {
                ...draft,
                strategy: { ...draft.strategy, positioningStatement: params.value },
            };
        case 'strategy.targetConsumer.description':
            return {
                ...draft,
                strategy: {
                    ...draft.strategy,
                    targetConsumer: {
                        ...draft.strategy.targetConsumer,
                        description: params.value,
                    },
                },
            };
        case 'strategy.voice.toneAdjectives':
            return {
                ...draft,
                strategy: {
                    ...draft.strategy,
                    voice: { ...draft.strategy.voice, toneAdjectives: params.value },
                },
            };
        case 'strategy.voice.doExamples':
            return {
                ...draft,
                strategy: {
                    ...draft.strategy,
                    voice: { ...draft.strategy.voice, doExamples: params.value },
                },
            };
        case 'strategy.voice.dontExamples':
            return {
                ...draft,
                strategy: {
                    ...draft.strategy,
                    voice: { ...draft.strategy.voice, dontExamples: params.value },
                },
            };
        case 'strategy.targetConsumer.painPoints':
            return {
                ...draft,
                strategy: {
                    ...draft.strategy,
                    targetConsumer: { ...draft.strategy.targetConsumer, painPoints: params.value },
                },
            };
        case 'strategy.objections':
            return {
                ...draft,
                strategy: { ...draft.strategy, objections: params.value },
            };
        case 'identity.tokens.color':
            return {
                ...draft,
                identity: {
                    ...draft.identity,
                    tokens: { ...draft.identity.tokens, color: params.value },
                },
            };
        case 'identity.tokens.typography':
            return {
                ...draft,
                identity: {
                    ...draft.identity,
                    tokens: { ...draft.identity.tokens, typography: params.value },
                },
            };
    }
};

/**
 * This tool intentionally does NOT follow the rest of the codebase's
 * `BaseTool` subclass pattern (see packages/ai/src/tools/models/base.ts):
 * that pattern is stateless-from-the-server's-perspective and dispatches
 * execution to the browser's EditorEngine. This tool instead auto-executes
 * server-side against a per-request draft captured in this closure, so the
 * agentic loop can continue within the same turn (AI SDK only continues a
 * multi-step `streamText` call past a tool call when that tool has an
 * `execute`; `ask_user`/`propose_idea` deliberately have none, so a turn
 * still ends there).
 */
export const createUpdateFieldTool = (getDraft: () => BrandKitDraft, setDraft: (next: BrandKitDraft) => void) =>
    tool({
        description:
            'Record a piece of information the user just gave you into the brand kit draft. Call this before asking the next question if the user\'s last message answered a checklist item. Pass the field under `update`.',
        inputSchema: updateBrandKitFieldToolInput,
        execute: async ({ update }: { update: UpdateBrandKitFieldParams }) => {
            const next = applyBrandKitFieldUpdate(getDraft(), update);
            setDraft(next);
            return { fieldPath: update.fieldPath, recorded: true };
        },
    });
