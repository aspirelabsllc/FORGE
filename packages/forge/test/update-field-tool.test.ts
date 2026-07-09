import { brandKitDraft, computeIntakeChecklist, type BrandKitDraft } from '@onlook/brand-schema';
import { describe, expect, it } from 'bun:test';
import { applyBrandKitFieldUpdate } from '../src/intake/update-field-tool';

const emptyDraft = (): BrandKitDraft => brandKitDraft.parse({ id: 'test-kit' });

describe('applyBrandKitFieldUpdate', () => {
    it('sets the positioning statement without touching other strategy fields', () => {
        const draft = emptyDraft();
        const next = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'strategy.positioningStatement',
            value: 'The fastest way to ship a landing page.',
        });
        expect(next.strategy.positioningStatement).toBe('The fastest way to ship a landing page.');
        expect(next.strategy.objections).toEqual([]);
        // original draft is untouched (pure function)
        expect(draft.strategy.positioningStatement).toBeUndefined();
    });

    it('sets the target consumer description', () => {
        const next = applyBrandKitFieldUpdate(emptyDraft(), {
            fieldPath: 'strategy.targetConsumer.description',
            value: 'Indie founders launching a first product.',
        });
        expect(next.strategy.targetConsumer?.description).toBe(
            'Indie founders launching a first product.',
        );
    });

    it('sets tone adjectives', () => {
        const next = applyBrandKitFieldUpdate(emptyDraft(), {
            fieldPath: 'strategy.voice.toneAdjectives',
            value: ['confident', 'warm'],
        });
        expect(next.strategy.voice?.toneAdjectives).toEqual(['confident', 'warm']);
    });

    it('sets color and typography token groups independently', () => {
        let draft = emptyDraft();
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'identity.tokens.color',
            value: { primary: { $value: '#111111', $type: 'color' } },
        });
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'identity.tokens.typography',
            value: {
                heading: {
                    $type: 'typography',
                    $value: { fontFamily: 'Inter', fontSize: '48px', fontWeight: 700 },
                },
            },
        });
        expect(Object.keys(draft.identity.tokens.color)).toEqual(['primary']);
        expect(Object.keys(draft.identity.tokens.typography)).toEqual(['heading']);
    });

    it('drives the checklist to fully complete after all five updates', () => {
        let draft = emptyDraft();
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'strategy.positioningStatement',
            value: 'The fastest way to ship a landing page.',
        });
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'strategy.targetConsumer.description',
            value: 'Indie founders.',
        });
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'strategy.voice.toneAdjectives',
            value: ['bold'],
        });
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'identity.tokens.color',
            value: { primary: { $value: '#111111', $type: 'color' } },
        });
        draft = applyBrandKitFieldUpdate(draft, {
            fieldPath: 'identity.tokens.typography',
            value: { heading: { $type: 'typography', $value: { fontFamily: 'Inter', fontSize: '48px', fontWeight: 700 } } },
        });

        expect(computeIntakeChecklist(draft).every((i) => i.complete)).toBe(true);
    });
});
