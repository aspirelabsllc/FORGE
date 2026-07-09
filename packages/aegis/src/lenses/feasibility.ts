import type { CritiqueInput, LensVerdict } from './types';
import { runLlmLens } from './llm-lens';

const FEASIBILITY_SYSTEM_PROMPT = `You are Aegis, the adversarial design critic for an AI website builder. You judge ONE lens only: feasibility - does this code actually look like it would build and render without errors? Look for unbalanced JSX, missing imports, undefined variables, obvious syntax errors. This is a fallback check only used when a real build/typecheck result isn't available - be conservative and only fail on things you're confident are real bugs.`;

/**
 * Deterministic when a real build/typecheck result is available (e.g. Forge
 * ran the existing TypecheckTool/CheckErrorsTool client tools against the
 * live sandbox before calling submit_for_critique) - this is the "cheap
 * deterministic check that can short-circuit the rest" the design calls for.
 * Falls back to an LLM read of the diff only when no real result exists.
 */
export const runFeasibilityLens = async (input: CritiqueInput): Promise<LensVerdict> => {
    if (input.buildCheckResult) {
        const { success, errors } = input.buildCheckResult;
        return {
            lens: 'feasibility',
            verdict: success ? 'pass' : 'fail',
            score: success ? 1 : 0,
            findings: errors.map((issue) => ({ location: 'build', issue })),
            deterministic: true,
        };
    }

    return runLlmLens({
        lens: 'feasibility',
        systemPrompt: FEASIBILITY_SYSTEM_PROMPT,
        prompt: `Files changed: ${input.filesChanged.join(', ')}\n\nCode diff:\n${input.codeDiff}\n\nJudge feasibility only.`,
    });
};
