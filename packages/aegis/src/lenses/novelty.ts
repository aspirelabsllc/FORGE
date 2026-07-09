import type { CritiqueInput, LensVerdict } from './types';
import { runLlmLens } from './llm-lens';

export const CLICHE_BLOCKLIST = [
    'A static, no-motion hero with a centered headline and two buttons',
    'A uniform stock particle/gradient-mesh background with no relationship to the product',
    'A non-interactive bento grid used purely as decoration',
    'Generic stock photography where the brand\'s own assets could plausibly be used instead',
] as const;

const NOVELTY_SYSTEM_PROMPT = `You are Aegis, the adversarial design critic for an AI website builder. You judge ONE lens only: novelty. You are actively trying to refute the idea that this section is novel - default to skeptical.

Cliché patterns to actively check for (fail or heavily penalize the score if present without strong justification):
${CLICHE_BLOCKLIST.map((c) => `- ${c}`).join('\n')}

A design passes novelty if it does something genuinely specific to this brand rather than a generic template pattern that could belong to any product. Being tasteful is not enough - it must be distinctive.`;

export const runNoveltyLens = async (input: CritiqueInput): Promise<LensVerdict> =>
    runLlmLens({
        lens: 'novelty',
        systemPrompt: NOVELTY_SYSTEM_PROMPT,
        prompt: `Proposal summary: ${input.summary}\nFiles changed: ${input.filesChanged.join(', ')}\n\nCode diff:\n${input.codeDiff}\n\n${input.screenshotDescription ? `Visual description: ${input.screenshotDescription}\n` : ''}Judge novelty only.`,
    });
