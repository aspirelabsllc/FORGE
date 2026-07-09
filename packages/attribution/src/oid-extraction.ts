import { createTemplateNodeMap, getAstFromContent } from '@onlook/parser';

/**
 * Derives which oids exist in a file's content right now - used after a
 * Forge write_file/search_replace_edit_file call (which writes whole-file
 * content through the sandbox filesystem, not through per-oid Actions) to
 * figure out which oids to mark forge-owned. Reuses packages/parser's real
 * AST/oid extraction (the same primitive the live sync engine's build-time
 * injection uses) rather than re-deriving oid parsing.
 */
export const extractOidsFromFileContent = (content: string, filename: string, branchId: string): string[] => {
    const ast = getAstFromContent(content);
    if (!ast) {
        return [];
    }
    const map = createTemplateNodeMap({ ast, filename, branchId });
    return Array.from(map.keys());
};
