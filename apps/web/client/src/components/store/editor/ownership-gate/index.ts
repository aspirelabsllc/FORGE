import { makeAutoObservable } from 'mobx';

/**
 * Session-scoped state backing Forge's "ask before overwriting your edits"
 * gate (see components/tools/tools.ts). The attribution ledger records who
 * last edited each oid; before a Forge write the gate checks it and, when the
 * write would cross an element the user edited by hand, pauses to ask in chat
 * instead of silently overwriting. The oids awaiting that answer are held in
 * `pending`; once the user replies - their words govern what Forge actually
 * does - those oids move to `approved` so the follow-up write isn't re-blocked.
 *
 * State is intentionally per-session and in-memory: it guards a single live
 * conversation, not a durable permission grant.
 */
export class OwnershipGateManager {
    private pending = new Set<string>();
    private approved = new Set<string>();

    constructor() {
        makeAutoObservable(this);
    }

    isApproved(oid: string): boolean {
        return this.approved.has(oid);
    }

    markPending(oids: string[]): void {
        for (const oid of oids) {
            this.pending.add(oid);
        }
    }

    get hasPending(): boolean {
        return this.pending.size > 0;
    }

    /**
     * The user has responded to a permission request, so the elements we were
     * waiting on have now been consulted - promote them to approved. We do NOT
     * parse "yes" vs "no": the gate only guarantees the user was asked, and
     * Forge's own reply (proceed, or follow a redirection) governs the outcome.
     */
    consumePending(): void {
        for (const oid of this.pending) {
            this.approved.add(oid);
        }
        this.pending.clear();
    }

    clear(): void {
        this.pending.clear();
        this.approved.clear();
    }
}
