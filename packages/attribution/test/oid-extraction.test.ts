import { describe, expect, it } from 'bun:test';
import { extractOidsFromFileContent } from '../src/oid-extraction';

const SAMPLE_TSX = `
export default function Hero() {
    return (
        <section data-oid="hero-section">
            <h1 data-oid="hero-heading">Welcome</h1>
            <p data-oid="hero-subtext">Subtitle</p>
        </section>
    );
}
`;

describe('extractOidsFromFileContent', () => {
    it('extracts every data-oid present in the file', () => {
        const oids = extractOidsFromFileContent(SAMPLE_TSX, 'hero.tsx', 'branch-1');
        expect(oids.sort()).toEqual(['hero-heading', 'hero-section', 'hero-subtext'].sort());
    });

    it('returns an empty array for content with no JSX elements', () => {
        const oids = extractOidsFromFileContent('export const x = 1;', 'x.ts', 'branch-1');
        expect(oids).toEqual([]);
    });

    it('returns an empty array for content that fails to parse', () => {
        const oids = extractOidsFromFileContent('this is not { valid js at all (((', 'broken.tsx', 'branch-1');
        expect(oids).toEqual([]);
    });
});
