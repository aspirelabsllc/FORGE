import { describe, expect, it } from 'bun:test';
import {
    brandKitDraft,
    computeIntakeChecklist,
    isBrandKitReadyForProposal,
    nextIncompleteChecklistItem,
    type BrandKitDraft,
} from '../src/brand-kit';

const emptyDraft = (): BrandKitDraft => brandKitDraft.parse({ id: 'test-kit' });

describe('brandKitDraft', () => {
    it('parses a minimal input into a fully-defaulted draft', () => {
        const draft = emptyDraft();
        expect(draft.version).toBe(1);
        expect(draft.identity.tokens.color).toEqual({});
        expect(draft.identity.assets.logos).toEqual([]);
        expect(draft.strategy.objections).toEqual([]);
    });
});

describe('computeIntakeChecklist', () => {
    it('reports every item incomplete for an empty draft', () => {
        const checklist = computeIntakeChecklist(emptyDraft());
        expect(checklist.every((item) => !item.complete)).toBe(true);
        expect(checklist.length).toBe(5);
    });

    it('marks individual items complete as fields fill in', () => {
        const draft = emptyDraft();
        draft.strategy.positioningStatement = 'The fastest way to ship a landing page.';
        const checklist = computeIntakeChecklist(draft);
        const positioning = checklist.find((i) => i.fieldPath === 'strategy.positioningStatement');
        expect(positioning?.complete).toBe(true);
        expect(checklist.filter((i) => i.complete).length).toBe(1);
    });

    it('treats an empty token group as incomplete and a non-empty one as complete', () => {
        const draft = emptyDraft();
        draft.identity.tokens.color = {
            primary: { $value: '#111111', $type: 'color' },
        };
        const checklist = computeIntakeChecklist(draft);
        const color = checklist.find((i) => i.fieldPath === 'identity.tokens.color');
        expect(color?.complete).toBe(true);
        const typography = checklist.find((i) => i.fieldPath === 'identity.tokens.typography');
        expect(typography?.complete).toBe(false);
    });
});

describe('isBrandKitReadyForProposal / nextIncompleteChecklistItem', () => {
    it('is not ready for an empty draft, and reports the first incomplete item', () => {
        const draft = emptyDraft();
        expect(isBrandKitReadyForProposal(draft)).toBe(false);
        expect(nextIncompleteChecklistItem(draft)?.fieldPath).toBe('strategy.positioningStatement');
    });

    it('is ready once every checklist item is satisfied', () => {
        const draft = emptyDraft();
        draft.strategy.positioningStatement = 'The fastest way to ship a landing page.';
        draft.strategy.targetConsumer = { description: 'Indie founders launching a first product.' };
        draft.strategy.voice = { toneAdjectives: ['confident', 'warm'] };
        draft.identity.tokens.color = { primary: { $value: '#111111', $type: 'color' } };
        draft.identity.tokens.typography = {
            heading: {
                $type: 'typography',
                $value: { fontFamily: 'Inter', fontSize: '48px', fontWeight: 700 },
            },
        };

        expect(nextIncompleteChecklistItem(draft)).toBeUndefined();
        expect(isBrandKitReadyForProposal(draft)).toBe(true);
    });
});
