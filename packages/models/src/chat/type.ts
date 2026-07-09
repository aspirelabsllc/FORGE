export enum ChatType {
    ASK = 'ask',
    CREATE = 'create',
    EDIT = 'edit',
    FIX = 'fix',
    /** Forge's PROPOSE/REVISE mode - see packages/forge/src/propose. */
    FORGE_PROPOSE = 'forge_propose',
    /** Forge's brand-intake conversation - see packages/forge/src/intake. */
    FORGE_INTAKE = 'forge_intake',
}
