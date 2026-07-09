import type { OwnershipRecord } from '@onlook/attribution';
import type { OwnershipRecordRow } from '../schema/attribution';

export const fromDbOwnershipRecord = (row: OwnershipRecordRow): OwnershipRecord => ({
    oid: row.oid,
    branchId: row.branchId,
    lastEditor: row.lastEditor,
    lastEditedAt: row.lastEditedAt,
    lastCommitOid: row.lastCommitOid,
    locked: row.locked,
});
