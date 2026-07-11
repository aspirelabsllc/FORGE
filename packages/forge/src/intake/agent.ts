import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { initModel } from '@onlook/ai';
import {
    isBrandKitReadyForProposal,
    type BrandKitDraft,
} from '@onlook/brand-schema';
import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { buildIntakeSystemPrompt } from './system-prompt';
import { createUpdateFieldTool, UPDATE_BRAND_KIT_FIELD_TOOL_NAME } from './update-field-tool';

export interface IntakeTurnMessage {
    role: 'user' | 'assistant';
    content: string;
}

export type ForgeIntakeOutcome =
    | { type: 'message'; text: string }
    | { type: 'ready'; message: string };

export interface IntakeTurnResult {
    draft: BrandKitDraft;
    outcome: ForgeIntakeOutcome;
}

/**
 * Runs one INTAKE turn as a real conversation. The agent reads the full
 * transcript plus any uploaded brand documents (injected into the system prompt
 * by `buildIntakeSystemPrompt`), records whatever fields it can via
 * `update_brand_kit_field`, and replies in natural language. Unlike the earlier
 * one-ask-per-turn design, it can record several fields and answer the founder's
 * actual questions in the same turn - `update_brand_kit_field` has an `execute`,
 * so the AI SDK keeps stepping until the agent writes its final message.
 */
export const runIntakeTurn = async ({
    draft,
    history,
}: {
    draft: BrandKitDraft;
    history: IntakeTurnMessage[];
}): Promise<IntakeTurnResult> => {
    if (isBrandKitReadyForProposal(draft)) {
        return {
            draft,
            outcome: {
                type: 'ready',
                message: "I've got everything I need to start proposing designs.",
            },
        };
    }

    let currentDraft = draft;
    const { model, providerOptions, headers, maxOutputTokens } = initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.OPUS_4_8,
    });

    const messages: ModelMessage[] = history.map((m) => ({ role: m.role, content: m.content }));

    const result = streamText({
        model,
        providerOptions,
        headers,
        maxOutputTokens,
        system: buildIntakeSystemPrompt(currentDraft),
        messages,
        // Enough steps to record several fields from a document, then reply.
        stopWhen: stepCountIs(8),
        tools: {
            [UPDATE_BRAND_KIT_FIELD_TOOL_NAME]: createUpdateFieldTool(
                () => currentDraft,
                (next) => {
                    currentDraft = next;
                },
            ),
        },
    });

    await result.consumeStream();
    const text = (await result.text).trim();

    return {
        draft: currentDraft,
        outcome: {
            type: 'message',
            text:
                text ||
                "Tell me a bit more about your brand and I'll keep building this out.",
        },
    };
};
