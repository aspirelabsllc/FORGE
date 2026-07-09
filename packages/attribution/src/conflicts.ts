import type { Editor, OwnershipConflict, OwnershipRecord } from './types';

/**
 * Default policy is "ask first": when the acting editor would touch an oid
 * last owned by the OTHER editor, that's a conflict requiring explicit
 * confirmation before proceeding - never silently overwritten. A locked
 * record is always a conflict regardless of who owns it.
 */
export const checkForConflicts = (
    touchedOids: string[],
    ledger: Map<string, OwnershipRecord>,
    actingEditor: Editor,
): OwnershipConflict[] => {
    const conflicts: OwnershipConflict[] = [];
    for (const oid of touchedOids) {
        const record = ledger.get(oid);
        if (!record) {
            continue;
        }
        if (record.locked || record.lastEditor !== actingEditor) {
            conflicts.push({ oid, ownedBy: record.lastEditor, lastEditedAt: record.lastEditedAt });
        }
    }
    return conflicts;
};
