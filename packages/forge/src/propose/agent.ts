import type { BrandKitDraft } from '@onlook/brand-schema';
import { allToolset, convertToStreamMessages, initModel, repairToolCall } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider, type ChatMessage } from '@onlook/models';
import { smoothStream, stepCountIs, streamText } from 'ai';
import { buildProposeSystemPrompt } from './system-prompt';
import { SubmitForCritiqueTool } from './submit-for-critique-tool';

/**
 * Forge's PROPOSE/REVISE mode. Deliberately NOT wired in as a new `ChatType`
 * inside packages/ai/src/agents/root.ts - that would mean editing a vendored
 * package's core switch statements. Instead this is a sibling stream-builder
 * living in packages/forge, reusing the *same* ClientTool set
 * (`@onlook/ai`'s `allToolset`: write_file, search_replace_edit_file,
 * terminal_command, read_style_guide, etc. - already dispatched to the
 * browser's EditorEngine/live sandbox by the existing chat UI) plus one new
 * Forge-specific tool. The route handler picks this or `createRootAgentStream`
 * based on `chatType` (see apps/web/client/src/app/api/chat/route.ts).
 */
export const createForgeProposeStream = ({
    brandKit,
    conversationId,
    projectId,
    userId,
    traceId,
    messages,
    revisionContext,
}: {
    brandKit: BrandKitDraft | undefined;
    conversationId: string;
    projectId: string;
    userId: string;
    traceId: string;
    messages: ChatMessage[];
    /** Aegis's formatted feedback from a prior rejected proposal - see @onlook/aegis's formatCritiqueFeedbackForRevision. Presence of this switches the turn into REVISE mode. */
    revisionContext?: string;
}) => {
    const { model, providerOptions, headers, maxOutputTokens } = initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.SONNET_5,
    });

    return streamText({
        model,
        providerOptions,
        headers,
        maxOutputTokens,
        system: buildProposeSystemPrompt(brandKit, revisionContext),
        messages: convertToStreamMessages(messages),
        tools: {
            ...allToolset,
            submit_for_critique: SubmitForCritiqueTool.getAITool(),
        },
        stopWhen: stepCountIs(20),
        experimental_repairToolCall: repairToolCall,
        experimental_transform: smoothStream(),
        experimental_telemetry: {
            isEnabled: true,
            metadata: {
                conversationId,
                projectId,
                userId,
                chatType: 'forge-propose',
                tags: ['chat', 'forge-propose'],
                langfuseTraceId: traceId,
                sessionId: conversationId,
            },
        },
    });
};
