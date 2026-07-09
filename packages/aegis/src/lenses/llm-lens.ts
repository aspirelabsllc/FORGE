import { initModel } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateObject } from 'ai';
import type { LensFinding, LensName, LensVerdict } from './types';
import { lensVerdictShape } from './types';

/**
 * Shared plumbing for the two subjective lenses (novelty, brand-fit) and the
 * LLM-fallback path of the two lenses that prefer deterministic input
 * (feasibility, accessibility). Each call is independent - no shared
 * conversation context - so one lens's reasoning can't leak into another's,
 * which is what makes running all four meaningful rather than redundant.
 */
export const runLlmLens = async ({
    lens,
    systemPrompt,
    prompt,
}: {
    lens: LensName;
    systemPrompt: string;
    prompt: string;
}): Promise<LensVerdict> => {
    const { model, providerOptions } = initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.SONNET_5,
    });

    const { object } = await generateObject({
        model,
        providerOptions,
        schema: lensVerdictShape,
        system: systemPrompt,
        prompt,
    });

    return {
        lens,
        verdict: object.verdict,
        score: object.score,
        findings: object.findings as LensFinding[],
        suggestedDirection: object.suggestedDirection,
        deterministic: false,
    };
};
