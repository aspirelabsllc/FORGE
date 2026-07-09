import { BaseTool } from '@onlook/ai';
import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';

/**
 * Ends the current INTAKE turn. Forge calls this with exactly one grounded
 * question - the tool call itself (not a prompt instruction) is what forces
 * "one question at a time": there is no `execute`, so the streamText call
 * stops here and waits for the user's reply as the next turn.
 */
export class AskUserTool extends BaseTool {
    static readonly toolName = 'ask_user';
    static readonly description =
        'Ask the user a single, specific, grounded question to fill in a gap in the brand kit. Call this at most once per turn.';
    static readonly parameters = z.object({
        question: z.string().describe('The single question to ask, phrased conversationally.'),
        why: z
            .string()
            .describe('One sentence on why this matters for the design, shown alongside the question.'),
        fieldPath: z
            .string()
            .describe('The BrandKit checklist field path this question is trying to fill, e.g. "strategy.voice.toneAdjectives".'),
    });
    static readonly icon = Icons.QuestionMarkCircled;

    static getLabel(): string {
        return 'Asking a question';
    }
}
