import { runAccessibilityLens } from './lenses/accessibility';
import { runBrandFitLens } from './lenses/brand-fit';
import { runFeasibilityLens } from './lenses/feasibility';
import { runNoveltyLens } from './lenses/novelty';
import type { CritiqueInput, LensVerdict } from './lenses/types';

export interface CritiqueResult {
    approved: boolean;
    verdicts: LensVerdict[];
    /** Why the gate landed where it did - accessibility veto vs. supermajority count. */
    reason: string;
}

const SUPERMAJORITY_THRESHOLD = 3;

/**
 * Runs all four lenses independently (no shared context between them - see
 * runLlmLens) and applies the gate: accessibility is a hard veto regardless
 * of the other three, otherwise 3-of-4 pass is required.
 */
export const runCritique = async (input: CritiqueInput): Promise<CritiqueResult> => {
    const [novelty, brandFit, accessibility, feasibility] = await Promise.all([
        runNoveltyLens(input),
        runBrandFitLens(input),
        runAccessibilityLens(input),
        runFeasibilityLens(input),
    ]);
    return gateCritiqueVerdicts([novelty, brandFit, accessibility, feasibility]);
};

/** Pure gate logic, split out from runCritique so it's testable without hitting the model. */
export const gateCritiqueVerdicts = (verdicts: LensVerdict[]): CritiqueResult => {
    const accessibility = verdicts.find((v) => v.lens === 'accessibility');
    if (accessibility?.verdict === 'fail') {
        return {
            approved: false,
            verdicts,
            reason: 'Accessibility lens failed - this is a hard veto regardless of other lenses.',
        };
    }

    const passCount = verdicts.filter((v) => v.verdict === 'pass').length;
    const approved = passCount >= SUPERMAJORITY_THRESHOLD;
    return {
        approved,
        verdicts,
        reason: approved
            ? `${passCount}/${verdicts.length} lenses passed (supermajority met).`
            : `Only ${passCount}/${verdicts.length} lenses passed (need ${SUPERMAJORITY_THRESHOLD}).`,
    };
};
