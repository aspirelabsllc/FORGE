import type { EditorEngine } from '@/components/store/editor/engine';
import { api } from '@/trpc/client';
import type { ToolCall } from '@ai-sdk/provider-utils';
import { getFileSystem, getToolClassesFromType } from '@onlook/ai';
import { extractOidsFromFileContent } from '@onlook/attribution';
import { SubmitForCritiqueTool } from '@onlook/forge';
import { ChatType } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';

/**
 * Forge-specific tools (currently just submit_for_critique) aren't part of
 * @onlook/ai's own tool classes - packages/ai deliberately doesn't depend on
 * packages/forge (see packages/forge/src/propose/agent.ts's comment on why),
 * so this app-level dispatcher is where the two tool sets actually merge for
 * a live FORGE_PROPOSE chat session.
 */
const FORGE_PROPOSE_ONLY_TOOL_NAMES = new Set(['submit_for_critique']);

const recordOids = (branchId: string, oids: string[]) => {
    if (oids.length === 0) {
        return;
    }
    api.attribution.recordEdits.mutate({ branchId, oids, editor: 'forge' }).catch((error) => {
        console.error('Failed to record ownership for Forge write', error);
    });
};

/**
 * Fire-and-forget: derives which oids a Forge write touched and records them
 * as forge-owned. write_file's input already carries the full new file
 * content, so no extra read is needed. search_replace_edit_file only carries
 * the changed substring, so its final content is re-read through the same
 * sandbox file-system accessor the tool itself uses internally.
 */
const recordForgeWriteOwnership = (
    editorEngine: EditorEngine,
    toolName: string,
    input: unknown,
) => {
    if (toolName === 'write_file') {
        const { file_path, content, branchId } = (input ?? {}) as {
            file_path?: string;
            content?: string;
            branchId?: string;
        };
        if (!file_path || content === undefined || !branchId) {
            return;
        }
        recordOids(branchId, extractOidsFromFileContent(content, file_path, branchId));
        return;
    }

    if (toolName === 'search_replace_edit_file') {
        const { file_path, branchId } = (input ?? {}) as { file_path?: string; branchId?: string };
        if (!file_path || !branchId) {
            return;
        }
        void (async () => {
            try {
                const fileSystem = await getFileSystem(branchId, editorEngine);
                const content = await fileSystem.readFile(file_path);
                if (typeof content !== 'string') {
                    return;
                }
                recordOids(branchId, extractOidsFromFileContent(content, file_path, branchId));
            } catch (error) {
                console.error('Failed to read file for ownership recording', error);
            }
        })();
    }
};

// Write tools that can overwrite existing, user-owned elements. Mirrors the
// tools recordForgeWriteOwnership records for; kept in sync so the gate can't
// be bypassed by a writer whose edits we'd otherwise never attribute.
const OWNERSHIP_GATED_TOOL_NAMES = new Set([
    'write_file',
    'search_replace_edit_file',
    'search_replace_multi_edit_file',
]);

// data-oid values as they appear in source (EditorAttributes.DATA_ONLOOK_ID).
// Used to scope a search/replace to just the oids inside the region being
// replaced, where the AST extractor can't parse a bare fragment.
const OID_ATTR_PATTERN = /data-oid=["']([^"']+)["']/g;

const extractOidsFromRegion = (region: string): string[] => {
    const oids = new Set<string>();
    for (const match of region.matchAll(OID_ATTR_PATTERN)) {
        if (match[1]) {
            oids.add(match[1]);
        }
    }
    return Array.from(oids);
};

/**
 * Which existing oids a pending Forge write would put at risk. For write_file
 * the whole current file is being replaced, so we read the pre-write file and
 * take all its oids; for the search/replace tools only the oids inside the
 * region(s) being replaced are at risk. Never throws - on any failure it
 * returns [] so the gate fails open rather than blocking a legitimate edit.
 */
const collectAtRiskOids = async (
    editorEngine: EditorEngine,
    toolName: string,
    input: Record<string, unknown>,
    branchId: string,
): Promise<string[]> => {
    const filePath = typeof input.file_path === 'string' ? input.file_path : undefined;
    if (!filePath) {
        return [];
    }

    if (toolName === 'search_replace_edit_file') {
        return typeof input.old_string === 'string' ? extractOidsFromRegion(input.old_string) : [];
    }

    if (toolName === 'search_replace_multi_edit_file') {
        const edits = Array.isArray(input.edits) ? input.edits : [];
        const oids = new Set<string>();
        for (const edit of edits) {
            const oldString = (edit as { old_string?: unknown })?.old_string;
            if (typeof oldString === 'string') {
                for (const oid of extractOidsFromRegion(oldString)) {
                    oids.add(oid);
                }
            }
        }
        return Array.from(oids);
    }

    // write_file replaces the whole file - read what's there now (pre-write).
    try {
        const fileSystem = await getFileSystem(branchId, editorEngine);
        const existing = await fileSystem.readFile(filePath);
        if (typeof existing !== 'string') {
            return [];
        }
        return extractOidsFromFileContent(existing, filePath, branchId);
    } catch {
        // New file, or unreadable - nothing pre-existing to protect.
        return [];
    }
};

/**
 * The "ask first" gate: before a Forge write, consults the attribution ledger
 * for elements the user edited by hand. If the write would cross any (that the
 * user hasn't already been asked about this conversation), it returns an
 * awaiting_user_permission result INSTEAD of applying - which flows back to
 * Forge as the tool result, prompting it to ask the user in chat. Returns null
 * when the write is clear to proceed. Fails open on any infra error: we never
 * block a real edit because a read or the conflict query failed.
 */
const enforceOwnershipGate = async (
    editorEngine: EditorEngine,
    toolName: string,
    input: Record<string, unknown>,
): Promise<{ status: string; message: string } | null> => {
    const branchId = typeof input.branchId === 'string' ? input.branchId : undefined;
    const filePath = typeof input.file_path === 'string' ? input.file_path : undefined;
    if (!branchId || !filePath) {
        return null;
    }

    const atRiskOids = await collectAtRiskOids(editorEngine, toolName, input, branchId);
    const gate = editorEngine.ownershipGate;
    const unapproved = atRiskOids.filter((oid) => !gate.isApproved(oid));
    if (unapproved.length === 0) {
        return null;
    }

    const conflicts = await api.attribution.checkConflicts
        .query({ branchId, oids: unapproved, actingEditor: 'forge' })
        .catch((error) => {
            console.error('Ownership gate: conflict check failed, allowing write', error);
            return null;
        });
    if (!conflicts || conflicts.length === 0) {
        return null;
    }

    gate.markPending(conflicts.map((conflict) => conflict.oid));

    const formatWhen = (value: Date): string => {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? 'earlier' : date.toLocaleString();
    };
    const details = conflicts
        .map((conflict) => `- an element in ${filePath} the user last edited by hand (${formatWhen(conflict.lastEditedAt)})`)
        .join('\n');

    return {
        status: 'awaiting_user_permission',
        message:
            `This edit was NOT applied. It would overwrite ${conflicts.length} element(s) the user changed by hand:\n${details}\n\n` +
            `Do not overwrite the user's own edits without asking. In your next message, tell the user plainly what you want to change here and why, and ask whether to proceed or keep their version - then stop and wait for their reply. ` +
            `Do not call any write tool again until they respond. When they answer, follow their decision: proceed if they approve, or adjust to whatever they redirect you to do.`,
    };
};

/**
 * Gathers the real diff for submit_for_critique's `filesChanged` and asks
 * Aegis to judge it. The tool call itself has no other client-side action
 * (see SubmitForCritiqueTool) - this is what actually connects a finished
 * PROPOSE turn to the critique loop, closing the gap noted after Phase 3/4.
 */
const submitForCritique = async (
    editorEngine: EditorEngine,
    input: { summary: string; filesChanged: string[]; branchId: string },
) => {
    const branchData = editorEngine.branches.getBranchDataById(input.branchId);
    const codeDiff = branchData
        ? await branchData.sandbox.gitManager.getDiff(input.filesChanged)
        : '';

    return api.aegis.critique.mutate({
        projectId: editorEngine.projectId,
        summary: input.summary,
        filesChanged: input.filesChanged,
        codeDiff,
    });
};

export async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine, addToolResult: (toolResult: { tool: string, toolCallId: string, output: any }) => Promise<void>): Promise<unknown> {
    const toolName = toolCall.toolName;
    const currentChatMode = editorEngine.state.chatMode;
    let output: unknown = null;

    try {
        if (currentChatMode === ChatType.FORGE_PROPOSE && FORGE_PROPOSE_ONLY_TOOL_NAMES.has(toolName)) {
            const validatedInput = SubmitForCritiqueTool.parameters.parse(toolCall.input);
            output = await submitForCritique(editorEngine, validatedInput);
        } else {
            const availableTools = getToolClassesFromType(currentChatMode);
            const tool = availableTools.find(tool => tool.toolName === toolName);
            if (!tool) {
                toast.error(`Tool "${toolName}" not available in ask mode`, {
                    description: `Switch to build mode to use this tool.`,
                    duration: 2000,
                });

                throw new Error(`Tool "${toolName}" is not available in ${currentChatMode} mode`);
            }
            // Parse the input to the tool parameters. Throws if invalid.
            const validatedInput = tool.parameters.parse(toolCall.input);

            // Ownership gate: in Forge mode, never silently overwrite the user's
            // manual edits. If this write would cross elements they edited by
            // hand, hold it and ask for permission in chat instead of applying.
            if (
                currentChatMode === ChatType.FORGE_PROPOSE &&
                OWNERSHIP_GATED_TOOL_NAMES.has(toolName)
            ) {
                const permissionBlock = await enforceOwnershipGate(
                    editorEngine,
                    toolName,
                    validatedInput as Record<string, unknown>,
                );
                if (permissionBlock) {
                    // Returned as the tool result so Forge asks the user; the
                    // write is not applied and ownership is left untouched.
                    output = permissionBlock;
                    return output;
                }
            }

            const toolInstance = new tool();
            // Can force type with as any because we know the input is valid.
            output = await toolInstance.handle(validatedInput as any, editorEngine);

            if (currentChatMode === ChatType.FORGE_PROPOSE) {
                recordForgeWriteOwnership(editorEngine, toolName, validatedInput);
            }
        }
    } catch (error) {
        output = 'error handling tool call ' + error;
    } finally {
        void addToolResult({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: output,
        });
    }

    return output;
}
