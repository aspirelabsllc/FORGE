import type { Action, ActionElement } from '@onlook/models';

export interface TouchedTarget {
    oid: string;
    branchId: string;
}

/** Avoids relying on a `.filter()` type-predicate narrowing across the union of ActionTarget/StyleActionTarget array types - TS doesn't always carry that through cleanly. */
const targetToTouched = (target: { oid: string | null; branchId: string }): TouchedTarget[] =>
    target.oid ? [{ oid: target.oid, branchId: target.branchId }] : [];

const fromActionElement = (element: ActionElement): TouchedTarget[] => {
    const self = targetToTouched(element);
    return [...self, ...element.children.flatMap(fromActionElement)];
};

/**
 * Derives which oid/branchId pairs a given Action touches, straight from the
 * real Action union in packages/models/src/actions/action.ts - this is the
 * hook point the design calls for (every dispatched Action already threads
 * oid/domId/branchId through every mutation type).
 */
export const extractTouchedTargets = (action: Action): TouchedTarget[] => {
    switch (action.type) {
        case 'update-style':
        case 'move-element':
        case 'edit-text':
        case 'insert-image':
        case 'remove-image':
            return action.targets.flatMap(targetToTouched);

        case 'insert-element':
        case 'remove-element':
            return [...action.targets.flatMap(targetToTouched), ...fromActionElement(action.element)];

        case 'group-elements':
        case 'ungroup-elements': {
            const parentTarget = targetToTouched(action.parent);
            // GroupContainer has no branchId of its own - fall back to the parent's.
            const containerTarget = targetToTouched({ oid: action.container.oid, branchId: action.parent.branchId });
            const childTargets = action.children.flatMap(targetToTouched);
            return [...parentTarget, ...containerTarget, ...childTargets];
        }

        case 'write-code':
            // Diff-only action with no per-oid target info readily available;
            // not currently dispatched by ActionManager (see its no-op case).
            return [];

        default:
            return [];
    }
};
