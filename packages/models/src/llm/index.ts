import type { LanguageModel } from 'ai';

export enum LLMProvider {
    ANTHROPIC = 'anthropic',
}

export enum CLAUDE_MODELS {
    SONNET_5 = 'claude-sonnet-5',
    OPUS_4_8 = 'claude-opus-4-8',
    HAIKU_4_5 = 'claude-haiku-4-5-20251001',
}

interface ModelMapping {
    [LLMProvider.ANTHROPIC]: CLAUDE_MODELS;
}

export type InitialModelPayload = {
    [K in keyof ModelMapping]: {
        provider: K;
        model: ModelMapping[K];
    };
}[keyof ModelMapping];

export type ModelConfig = {
    model: LanguageModel;
    providerOptions?: Record<string, any>;
    headers?: Record<string, string>;
    maxOutputTokens: number;
};

export const MODEL_MAX_TOKENS = {
    [CLAUDE_MODELS.SONNET_5]: 200000,
    [CLAUDE_MODELS.OPUS_4_8]: 200000,
    [CLAUDE_MODELS.HAIKU_4_5]: 200000,
} as const;
