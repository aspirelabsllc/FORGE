import { initModel } from '@onlook/ai';
import { objection, type BrandKitDraft } from '@onlook/brand-schema';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateObject } from 'ai';
import { z } from 'zod';

/** Upper bound on doc length fed to the model, to keep the prompt sane. */
const MAX_DOC_CHARS = 20_000;

/**
 * What we try to lift out of a free-form brand document. Everything is optional:
 * the model only fills what the doc actually supports, and we merge into the
 * draft conservatively (never clobbering a value the user already gave). Design
 * tokens (color/typography) are intentionally NOT extracted here - prose docs
 * rarely specify them precisely, and a malformed DTCG token is worse than none;
 * those stay with the conversation / design panel.
 */
const brandDocExtraction = z.object({
    positioningStatement: z.string().optional(),
    targetConsumer: z
        .object({
            description: z.string().optional(),
            painPoints: z.array(z.string()).optional(),
        })
        .optional(),
    voice: z
        .object({
            toneAdjectives: z.array(z.string()).optional(),
            doExamples: z.array(z.string()).optional(),
            dontExamples: z.array(z.string()).optional(),
        })
        .optional(),
    objections: z.array(objection).optional(),
});

const INGEST_SYSTEM_PROMPT = `You extract structured brand information from a founder's brand document.
Only capture what the document explicitly supports - leave a field absent if the document
doesn't clearly express it. Do not invent positioning, tone, or objections that aren't there.
Prefer the document's own words. Return concise values.`;

const nonEmpty = (s: string | undefined): boolean => !!s?.trim();
const hasItems = (a: unknown[] | undefined): boolean => !!a && a.length > 0;

/**
 * Runs a one-shot extraction over a brand document and merges the result into
 * the draft, filling only empty fields. Returns the updated draft plus a short
 * human summary of what was captured (for Forge to acknowledge in chat).
 */
export const ingestBrandDoc = async ({
    draft,
    docText,
}: {
    draft: BrandKitDraft;
    docText: string;
}): Promise<{ draft: BrandKitDraft; summary: string }> => {
    const { model, providerOptions } = initModel({
        provider: LLMProvider.ANTHROPIC,
        model: CLAUDE_MODELS.SONNET_5,
    });

    const { object } = await generateObject({
        model,
        providerOptions,
        schema: brandDocExtraction,
        system: INGEST_SYSTEM_PROMPT,
        prompt: `Brand document:\n\n${docText.slice(0, MAX_DOC_CHARS)}`,
    });

    const strategy = { ...draft.strategy };
    const captured: string[] = [];

    if (nonEmpty(object.positioningStatement) && !nonEmpty(draft.strategy.positioningStatement)) {
        strategy.positioningStatement = object.positioningStatement;
        captured.push('positioning');
    }
    if (nonEmpty(object.targetConsumer?.description) && !nonEmpty(draft.strategy.targetConsumer?.description)) {
        strategy.targetConsumer = { ...strategy.targetConsumer, description: object.targetConsumer!.description };
        captured.push('target consumer');
    }
    if (hasItems(object.targetConsumer?.painPoints) && !hasItems(draft.strategy.targetConsumer?.painPoints)) {
        strategy.targetConsumer = { ...strategy.targetConsumer, painPoints: object.targetConsumer!.painPoints };
        captured.push('pain points');
    }
    if (hasItems(object.voice?.toneAdjectives) && !hasItems(draft.strategy.voice?.toneAdjectives)) {
        strategy.voice = { ...strategy.voice, toneAdjectives: object.voice!.toneAdjectives };
        captured.push('voice / tone');
    }
    if (hasItems(object.voice?.doExamples) && !hasItems(draft.strategy.voice?.doExamples)) {
        strategy.voice = { ...strategy.voice, doExamples: object.voice!.doExamples };
        captured.push('voice do-examples');
    }
    if (hasItems(object.voice?.dontExamples) && !hasItems(draft.strategy.voice?.dontExamples)) {
        strategy.voice = { ...strategy.voice, dontExamples: object.voice!.dontExamples };
        captured.push("voice don't-examples");
    }
    if (hasItems(object.objections) && !hasItems(draft.strategy.objections)) {
        strategy.objections = object.objections!;
        captured.push('objections');
    }

    const summary =
        captured.length > 0
            ? `I pulled ${captured.join(', ')} from that document.`
            : "I couldn't pull structured brand details from that document - let's fill things in together.";

    return { draft: { ...draft, strategy }, summary };
};
