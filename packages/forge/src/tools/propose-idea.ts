import { BaseTool } from '@onlook/ai';
import { Icons } from '@onlook/ui/icons';
import { z } from 'zod';

/**
 * A proactive creative suggestion (e.g. "an interactive scroll-reactive
 * hero showcasing your product - mind sharing a photo?"). Like AskUserTool,
 * has no `execute` so the call itself ends the turn and surfaces the idea
 * to the user for a yes/no/tweak response.
 */
export class ProposeIdeaTool extends BaseTool {
    static readonly toolName = 'propose_idea';
    static readonly description =
        'Proactively propose a concrete, specific creative idea (not a generic suggestion) and ask the user to react to it. Call this at most once per turn.';
    static readonly parameters = z.object({
        idea: z.string().describe('The concrete idea, described specifically enough to picture (not "make it more engaging").'),
        rationale: z.string().describe('Why this idea fits this brand specifically, referencing its voice/positioning.'),
        needsAsset: z.boolean().describe('Whether executing this idea requires the user to upload an asset (e.g. a product photo).'),
        assetDescription: z
            .string()
            .optional()
            .describe('If needsAsset is true, what to ask the user to provide.'),
    });
    static readonly icon = Icons.Lightbulb;

    static getLabel(): string {
        return 'Proposing an idea';
    }
}
