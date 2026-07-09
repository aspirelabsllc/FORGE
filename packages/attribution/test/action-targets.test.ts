import { describe, expect, it } from 'bun:test';
import type { Action, ActionElement } from '@onlook/models';
import { extractTouchedTargets } from '../src/action-targets';

const baseTarget = { domId: 'dom-1', frameId: 'frame-1', branchId: 'branch-1' };

describe('extractTouchedTargets', () => {
    it('extracts oid/branchId pairs from an update-style action, dropping null oids', () => {
        const action: Action = {
            type: 'update-style',
            targets: [
                { ...baseTarget, oid: 'oid-1', change: { original: {}, updated: {} } },
                { ...baseTarget, oid: null, change: { original: {}, updated: {} } },
            ],
        };
        expect(extractTouchedTargets(action)).toEqual([{ oid: 'oid-1', branchId: 'branch-1' }]);
    });

    it('extracts targets and recursively walks the inserted element tree', () => {
        const child: ActionElement = {
            domId: 'dom-child',
            oid: 'oid-child',
            branchId: 'branch-1',
            tagName: 'span',
            attributes: {},
            styles: {},
            textContent: null,
            children: [],
        };
        const element: ActionElement = {
            domId: 'dom-parent',
            oid: 'oid-parent',
            branchId: 'branch-1',
            tagName: 'div',
            attributes: {},
            styles: {},
            textContent: null,
            children: [child],
        };
        const action: Action = {
            type: 'insert-element',
            targets: [{ ...baseTarget, oid: 'oid-location' }],
            location: { type: 'append', targetDomId: 'dom-location', targetOid: null },
            element,
            editText: null,
            pasteParams: null,
            codeBlock: null,
        };

        const touched = extractTouchedTargets(action).map((t) => t.oid);
        expect(touched).toContain('oid-location');
        expect(touched).toContain('oid-parent');
        expect(touched).toContain('oid-child');
    });

    it('extracts parent, container, and children for a group action', () => {
        const action: Action = {
            type: 'group-elements',
            parent: { ...baseTarget, oid: 'oid-parent' },
            children: [{ ...baseTarget, oid: 'oid-child-1' }, { ...baseTarget, oid: 'oid-child-2' }],
            container: { domId: 'dom-container', oid: 'oid-container', tagName: 'div', attributes: {} },
        };

        const touched = extractTouchedTargets(action).map((t) => t.oid);
        expect(touched).toEqual(['oid-parent', 'oid-container', 'oid-child-1', 'oid-child-2']);
    });

    it('returns an empty array for write-code actions', () => {
        const action: Action = { type: 'write-code', diffs: [] };
        expect(extractTouchedTargets(action)).toEqual([]);
    });
});
