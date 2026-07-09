import { describe, expect, it } from 'bun:test';
import { runAccessibilityLens } from '../src/lenses/accessibility';
import { runFeasibilityLens } from '../src/lenses/feasibility';
import type { CritiqueInput } from '../src/lenses/types';

const baseInput: CritiqueInput = {
    summary: 'Added a hero section',
    filesChanged: ['app/page.tsx'],
    codeDiff: '+ <section>hero</section>',
    brandKit: undefined,
};

describe('runFeasibilityLens (deterministic path)', () => {
    it('passes with score 1 when the build check succeeded', async () => {
        const result = await runFeasibilityLens({
            ...baseInput,
            buildCheckResult: { success: true, errors: [] },
        });
        expect(result.verdict).toBe('pass');
        expect(result.score).toBe(1);
        expect(result.deterministic).toBe(true);
    });

    it('fails with the real build errors surfaced as findings', async () => {
        const result = await runFeasibilityLens({
            ...baseInput,
            buildCheckResult: { success: false, errors: ['Cannot find module "./missing"'] },
        });
        expect(result.verdict).toBe('fail');
        expect(result.score).toBe(0);
        expect(result.findings[0]?.issue).toBe('Cannot find module "./missing"');
    });
});

describe('runAccessibilityLens (deterministic path)', () => {
    it('passes when there are no violations', async () => {
        const result = await runAccessibilityLens({
            ...baseInput,
            accessibilityScanResult: { violations: [] },
        });
        expect(result.verdict).toBe('pass');
        expect(result.score).toBe(1);
        expect(result.deterministic).toBe(true);
    });

    it('passes with a lower score when only minor violations exist', async () => {
        const result = await runAccessibilityLens({
            ...baseInput,
            accessibilityScanResult: {
                violations: [{ rule: 'color-contrast', impact: 'minor', description: 'Slightly low contrast' }],
            },
        });
        expect(result.verdict).toBe('pass');
        expect(result.score).toBeLessThan(1);
    });

    it('fails when a serious or critical violation exists', async () => {
        const result = await runAccessibilityLens({
            ...baseInput,
            accessibilityScanResult: {
                violations: [{ rule: 'image-alt', impact: 'critical', description: 'Missing alt text' }],
            },
        });
        expect(result.verdict).toBe('fail');
    });
});
