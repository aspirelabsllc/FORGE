import {
    LLMProvider,
    MODEL_MAX_TOKENS,
    type CLAUDE_MODELS,
    type InitialModelPayload,
    type ModelConfig
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

export function initModel({
    provider: requestedProvider,
    model: requestedModel,
}: InitialModelPayload): ModelConfig {
    let model: LanguageModel;
    let providerOptions: Record<string, any> | undefined;
    let headers: Record<string, string> | undefined;
    const maxOutputTokens: number = MODEL_MAX_TOKENS[requestedModel];

    switch (requestedProvider) {
        case LLMProvider.ANTHROPIC:
            model = getAnthropicProvider(requestedModel);
            providerOptions = {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            };
            break;
        default:
            assertNever(requestedProvider);
    }

    return {
        model,
        providerOptions,
        headers,
        maxOutputTokens,
    };
}

function getAnthropicProvider(model: CLAUDE_MODELS): LanguageModel {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY must be set');
    }
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropic(model);
}
