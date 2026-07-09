import { describe, expect, it } from 'bun:test';
import { gateCritiqueVerdicts } from '../src/critique';
import type { LensVerdict } from '../src/lenses/types';

const verdict = (overrides: Partial<LensVerdict>): LensVerdict => ({
    lens: 'novelty',
    verdict: 'pass',
    score: 1,
    findings: [],
    deterministic: false,
    ...overrides,
});

describe('gateCritiqueVerdicts', () => {
    it('approves when all four lenses pass', () => {
        const verdicts = [
            verdict({ lens: 'novelty' }),
            verdict({ lens: 'brand-fit' }),
            verdict({ lens: 'accessibility' }),
            verdict({ lens: 'feasibility' }),
        ];
        const result = gateCritiqueVerdicts(verdicts);
        expect(result.approved).toBe(true);
    });

    it('approves on a 3-of-4 supermajority when the failing lens is not accessibility', () => {
        const verdicts = [
            verdict({ lens: 'novelty', verdict: 'fail', score: 0.2 }),
            verdict({ lens: 'brand-fit' }),
            verdict({ lens: 'accessibility' }),
            verdict({ lens: 'feasibility' }),
        ];
        const result = gateCritiqueVerdicts(verdicts);
        expect(result.approved).toBe(true);
    });

    it('rejects when only 2 of 4 lenses pass', () => {
        const verdicts = [
            verdict({ lens: 'novelty', verdict: 'fail' }),
            verdict({ lens: 'brand-fit', verdict: 'fail' }),
            verdict({ lens: 'accessibility' }),
            verdict({ lens: 'feasibility' }),
        ];
        const result = gateCritiqueVerdicts(verdicts);
        expect(result.approved).toBe(false);
    });

    it('vetoes on accessibility failure even if every other lens passes', () => {
        const verdicts = [
            verdict({ lens: 'novelty' }),
            verdict({ lens: 'brand-fit' }),
            verdict({ lens: 'accessibility', verdict: 'fail', score: 0.1 }),
            verdict({ lens: 'feasibility' }),
        ];
        const result = gateCritiqueVerdicts(verdicts);
        expect(result.approved).toBe(false);
        expect(result.reason).toMatch(/hard veto/i);
    });
});
