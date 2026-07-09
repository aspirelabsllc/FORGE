import type { BrandKitDraft } from '@onlook/brand-schema';
import type { CritiqueInput, LensVerdict } from './types';
import { runLlmLens } from './llm-lens';

const describeBrandKitForCritique = (brandKit: BrandKitDraft | undefined): string => {
    if (!brandKit) {
        return 'No brand kit is available - judge against generic good-taste defaults, and note in findings that brand-fit cannot be fully assessed without one.';
    }
    const { strategy, identity } = brandKit;
    return [
        strategy.positioningStatement && `Positioning: ${strategy.positioningStatement}`,
        strategy.voice?.toneAdjectives?.length && `Voice: ${strategy.voice.toneAdjectives.join(', ')}`,
        strategy.voice?.dontExamples?.length && `Voice don'ts: ${strategy.voice.dontExamples.join(' / ')}`,
        Object.keys(identity.tokens.color ?? {}).length > 0 &&
            `On-brand color tokens: ${Object.keys(identity.tokens.color).join(', ')}`,
        Object.keys(identity.tokens.typography ?? {}).length > 0 &&
            `On-brand typography tokens: ${Object.keys(identity.tokens.typography).join(', ')}`,
    ]
        .filter(Boolean)
        .join('\n');
};

const BRAND_FIT_SYSTEM_PROMPT = `You are Aegis, the adversarial design critic for an AI website builder. You judge ONE lens only: brand-fit. You are actively trying to refute the idea that this section fits the brand - default to skeptical.

Check specifically for:
- Colors/fonts used that are NOT in the brand kit's token list (hardcoded arbitrary values instead of brand tokens)
- Copy tone that contradicts the brand's stated voice or "don't" examples
- A generic layout that ignores the brand's actual positioning/target consumer`;

export const runBrandFitLens = async (input: CritiqueInput): Promise<LensVerdict> =>
    runLlmLens({
        lens: 'brand-fit',
        systemPrompt: BRAND_FIT_SYSTEM_PROMPT,
        prompt: `Brand kit:\n${describeBrandKitForCritique(input.brandKit)}\n\nProposal summary: ${input.summary}\n\nCode diff:\n${input.codeDiff}\n\nJudge brand-fit only.`,
    });
