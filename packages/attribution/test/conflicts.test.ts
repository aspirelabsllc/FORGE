import { describe, expect, it } from 'bun:test';
import { checkForConflicts } from '../src/conflicts';
import type { OwnershipRecord } from '../src/types';

const record = (overrides: Partial<OwnershipRecord>): OwnershipRecord => ({
    oid: 'oid-1',
    branchId: 'branch-1',
    lastEditor: 'user',
    lastEditedAt: new Date('2026-01-01'),
    lastCommitOid: null,
    locked: false,
    ...overrides,
});

describe('checkForConflicts', () => {
    it('reports no conflict for an oid with no existing record', () => {
        const conflicts = checkForConflicts(['oid-1'], new Map(), 'forge');
        expect(conflicts).toEqual([]);
    });

    it('reports no conflict when the acting editor already owns the oid', () => {
        const ledger = new Map([['oid-1', record({ lastEditor: 'forge' })]]);
        expect(checkForConflicts(['oid-1'], ledger, 'forge')).toEqual([]);
    });

    it('reports a conflict when the other editor owns the oid', () => {
        const ledger = new Map([['oid-1', record({ lastEditor: 'user' })]]);
        const conflicts = checkForConflicts(['oid-1'], ledger, 'forge');
        expect(conflicts).toEqual([{ oid: 'oid-1', ownedBy: 'user', lastEditedAt: record({}).lastEditedAt }]);
    });

    it('reports a conflict for a locked oid even if the acting editor already owns it', () => {
        const ledger = new Map([['oid-1', record({ lastEditor: 'forge', locked: true })]]);
        const conflicts = checkForConflicts(['oid-1'], ledger, 'forge');
        expect(conflicts.length).toBe(1);
    });

    it('only reports conflicts for the oids actually touched', () => {
        const ledger = new Map([
            ['oid-1', record({ lastEditor: 'user' })],
            ['oid-2', record({ lastEditor: 'user' })],
        ]);
        const conflicts = checkForConflicts(['oid-1'], ledger, 'forge');
        expect(conflicts.map((c) => c.oid)).toEqual(['oid-1']);
    });
});
