import type { CritiqueResult } from './critique';

/**
 * Formats a non-approving CritiqueResult into human-readable, per-lens feedback
 * (the failing lenses with their findings and suggested direction). Used by the
 * aegis router to attach `revisionInstructions` to a critique result, giving
 * Forge concrete guidance it can surface to the user as suggestions.
 */
export const formatCritiqueFeedbackForRevision = (result: CritiqueResult): string => {
    const failing = result.verdicts.filter((v) => v.verdict === 'fail');
    const lines = failing.map((v) => {
        const findings = v.findings.map((f) => `    - ${f.location}: ${f.issue}`).join('\n');
        const direction = v.suggestedDirection ? `\n    Suggested direction: ${v.suggestedDirection}` : '';
        return `  ${v.lens} (score ${v.score.toFixed(2)}):\n${findings}${direction}`;
    });
    return `Aegis flagged concerns - ${result.reason}\n\nFlagged lenses:\n${lines.join('\n\n')}`;
};
