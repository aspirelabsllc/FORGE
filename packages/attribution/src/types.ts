export type Editor = 'forge' | 'user';

export interface OwnershipRecord {
    oid: string;
    branchId: string;
    lastEditor: Editor;
    lastEditedAt: Date;
    lastCommitOid: string | null;
    locked: boolean;
}

export interface OwnershipConflict {
    oid: string;
    ownedBy: Editor;
    lastEditedAt: Date;
}
