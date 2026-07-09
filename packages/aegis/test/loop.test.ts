import { describe, expect, it } from 'bun:test';
import { formatCritiqueFeedbackForRevision } from '../src/loop';
import type { CritiqueResult } from '../src/critique';

const rejectingResult = (attempt: number): CritiqueResult => ({
    approved: false,
    reason: 'Only 1/4 lenses passed (need 3).',
    verdicts: [
        {
            lens: 'novelty',
            verdict: 'fail',
            score: 0.2,
            findings: [{ location: 'app/page.tsx', issue: `too generic (attempt ${attempt})` }],
            suggestedDirection: 'try something more specific to the brand',
            deterministic: false,
        },
        { lens: 'brand-fit', verdict: 'pass', score: 1, findings: [], deterministic: false },
        { lens: 'accessibility', verdict: 'pass', score: 1, findings: [], deterministic: false },
        { lens: 'feasibility', verdict: 'pass', score: 1, findings: [], deterministic: false },
    ],
});

describe('formatCritiqueFeedbackForRevision', () => {
    it('surfaces only the failing lenses with their findings and suggested direction', () => {
        const text = formatCritiqueFeedbackForRevision(rejectingResult(1));
        expect(text).toContain('novelty');
        expect(text).toContain('too generic (attempt 1)');
        expect(text).toContain('try something more specific to the brand');
        expect(text).not.toContain('brand-fit');
    });
});
