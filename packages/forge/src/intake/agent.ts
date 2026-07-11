import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { initModel } from '@onlook/ai';
import {
    isBrandKitReadyForProposal,
    type BrandKitDraft,
} from '@onlook/brand-schema';
import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { AskUserTool } from '../tools/ask-user';
import { ProposeIdeaTool } from '../tools/propose-idea';
import { buildIntakeSystemPrompt } from './system-prompt';
import { createUpdateFieldTool, UPDATE_BRAND_KIT_FIELD_TOOL_NAME } from './update-field-tool';

export interface IntakeTurnMessage {
    role: 'user' | 'assistant';
    content: string;
}

export type ForgeIntakeOutcome =
    | { type: 'question'; question: string; why: string; fieldPath: string }
    | {
          type: 'suggestion';
          idea: string;
          rationale: string;
          needsAsset: boolean;
          assetDescription?: string;
      }
    | { type: 'ready'; message: string };

export interface IntakeTurnResult {
    draft: BrandKitDraft;
    outcome: ForgeIntakeOutcome;
}

/**
 * Runs exactly one bounded INTAKE turn: reads the checklist, lets Forge
 * optionally record a field update, then either ask one question, propose
 * one idea, or (if the checklist is already satisfied) report readiness.
 * One `streamText` call per turn, mirroring the `stepCountIs` pattern in
 * packages/ai/src/agents/root.ts.
 */
export const runIntakeTurn = async ({
    draft,
    history,
}: {
    draft: BrandKitDraft;
    history: IntakeTurnMessage[];
}): Promise<IntakeTurnResult> => {
    if (isBrandKitReadyForProposal(draft)) {
        return {
            draft,
            outcome: {
                type: 'ready',
                message: "I've got everything I need to start proposing designs.",
            },
        };
    }

    let currentDraft = draft;
    const { model, providerOptions, headers, maxOutputTokens } = initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.OPUS_4_8,
    });

    const messages: ModelMessage[] = history.map((m) => ({ role: m.role, content: m.content }));

    const result = streamText({
        model,
        providerOptions,
        headers,
        maxOutputTokens,
        system: buildIntakeSystemPrompt(currentDraft),
        messages,
        stopWhen: stepCountIs(3),
        tools: {
            ask_user: AskUserTool.getAITool(),
            propose_idea: ProposeIdeaTool.getAITool(),
            [UPDATE_BRAND_KIT_FIELD_TOOL_NAME]: createUpdateFieldTool(
                () => currentDraft,
                (next) => {
                    currentDraft = next;
                },
            ),
        },
    });

    await result.consumeStream();
    const toolCalls = await result.toolCalls;

    const askCall = toolCalls.find((c) => c.toolName === 'ask_user');
    const proposeCall = toolCalls.find((c) => c.toolName === 'propose_idea');

    if (askCall && askCall.toolName === 'ask_user') {
        const input = askCall.input as { question: string; why: string; fieldPath: string };
        return {
            draft: currentDraft,
            outcome: { type: 'question', question: input.question, why: input.why, fieldPath: input.fieldPath },
        };
    }

    if (proposeCall && proposeCall.toolName === 'propose_idea') {
        const input = proposeCall.input as {
            idea: string;
            rationale: string;
            needsAsset: boolean;
            assetDescription?: string;
        };
        return {
            draft: currentDraft,
            outcome: {
                type: 'suggestion',
                idea: input.idea,
                rationale: input.rationale,
                needsAsset: input.needsAsset,
                assetDescription: input.assetDescription,
            },
        };
    }

    // Model recorded a field but didn't ask/propose - fall back to a direct
    // nudge toward the next gap rather than leaving the turn ambiguous.
    const text = await result.text;
    return {
        draft: currentDraft,
        outcome: {
            type: 'question',
            question: text || 'Could you tell me more about your brand?',
            why: 'Forge did not call ask_user or propose_idea this turn.',
            fieldPath: '',
        },
    };
};
