import { describe, expect, it } from 'bun:test';
import { flattenColorTokens } from '../src/tokens';

describe('flattenColorTokens', () => {
    it('returns an empty array for an undefined or empty group', () => {
        expect(flattenColorTokens(undefined)).toEqual([]);
        expect(flattenColorTokens({})).toEqual([]);
    });

    it('extracts flat color tokens', () => {
        const swatches = flattenColorTokens({
            primary: { $value: '#111111', $type: 'color' },
            secondary: { $value: '#222222', $type: 'color' },
        });
        expect(swatches).toEqual([
            { name: 'primary', value: '#111111' },
            { name: 'secondary', value: '#222222' },
        ]);
    });

    it('recurses into nested groups, dot-joining the path', () => {
        const swatches = flattenColorTokens({
            brand: {
                primary: { $value: '#111111', $type: 'color' },
                accent: { $value: '#f5a623', $type: 'color' },
            },
        });
        expect(swatches).toEqual([
            { name: 'brand.primary', value: '#111111' },
            { name: 'brand.accent', value: '#f5a623' },
        ]);
    });

    it('skips non-color and non-string-value tokens rather than including garbage swatches', () => {
        const swatches = flattenColorTokens({
            primary: { $value: '#111111', $type: 'color' },
            heading: {
                $type: 'typography',
                $value: { fontFamily: 'Inter', fontSize: '48px', fontWeight: 700 },
            },
            weirdColor: { $value: 42, $type: 'color' } as any,
        });
        expect(swatches).toEqual([{ name: 'primary', value: '#111111' }]);
    });
});
