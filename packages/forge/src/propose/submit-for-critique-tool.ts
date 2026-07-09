import { BaseTool } from '@onlook/ai';
import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';

/**
 * Ends a PROPOSE/REVISE turn once Forge believes a section is ready for
 * review. No `execute` - same reasoning as AskUserTool: the tool call itself
 * is what stops generation, not a prompt instruction. The route handler
 * (apps/web/client/src/app/api/chat/route.ts) sees this tool call in the
 * finished stream and is what actually hands the proposal to Aegis (Phase 3).
 */
export class SubmitForCritiqueTool extends BaseTool {
    static readonly toolName = 'submit_for_critique';
    static readonly description =
        'Submit the section you just wrote for design review. Call this exactly once, after writing the code, when you believe it is ready.';
    static readonly parameters = z.object({
        summary: z.string().describe('One or two sentences describing what you built and why, for the critique step.'),
        filesChanged: z.array(z.string()).describe('File paths touched this turn.'),
        branchId: z.string().describe('Branch ID the changes were made on - the same branchId you passed to write_file/search_replace_edit_file this turn. Only use the branch ID, not the branch name.'),
    });
    static readonly icon = Icons.Check;

    static getLabel(): string {
        return 'Submitting for critique';
    }
}
