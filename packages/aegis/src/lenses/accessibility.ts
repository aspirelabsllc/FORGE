import type { CritiqueInput, LensVerdict } from './types';
import { runLlmLens } from './llm-lens';

const ACCESSIBILITY_SYSTEM_PROMPT = `You are Aegis, the adversarial design critic for an AI website builder. You judge ONE lens only: accessibility - color contrast, semantic HTML, alt text, keyboard/focus affordances for any interactive element. This is a fallback check only used when a real axe-core scan isn't available - read the code diff for obvious violations (e.g. text color close to background, missing alt on <img>, div-as-button with no role/keyboard handling).`;

/**
 * Deterministic when a real accessibility scan (e.g. axe-core against a live
 * render) is available - this lens is the one place the design calls for
 * "objective checks" over LLM judgment specifically, and it's also the hard
 * veto in the gate (see critique.ts), so a real scan matters more here than
 * for any other lens. Falls back to an LLM read of the diff when no scan
 * exists (e.g. this sandbox, with no browser to render into).
 */
export const runAccessibilityLens = async (input: CritiqueInput): Promise<LensVerdict> => {
    if (input.accessibilityScanResult) {
        const { violations } = input.accessibilityScanResult;
        const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        return {
            lens: 'accessibility',
            verdict: blocking.length === 0 ? 'pass' : 'fail',
            score: violations.length === 0 ? 1 : Math.max(0, 1 - violations.length * 0.2),
            findings: violations.map((v) => ({ location: v.rule, issue: v.description })),
            deterministic: true,
        };
    }

    return runLlmLens({
        lens: 'accessibility',
        systemPrompt: ACCESSIBILITY_SYSTEM_PROMPT,
        prompt: `Code diff:\n${input.codeDiff}\n\nJudge accessibility only.`,
    });
};
