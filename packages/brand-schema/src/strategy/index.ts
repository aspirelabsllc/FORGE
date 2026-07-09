import { z } from 'zod';

/**
 * No existing standard covers brand strategy/voice the way DTCG covers design
 * tokens, so this shape is bespoke. Kept intentionally flat and prose-heavy —
 * this is the input Forge reasons over when proposing copy, tone, and design
 * direction, not something meant to compile into a build tool.
 */
export const targetConsumer = z.object({
    description: z.string(),
    painPoints: z.array(z.string()).default([]),
});
export type TargetConsumer = z.infer<typeof targetConsumer>;

export const brandVoice = z.object({
    toneAdjectives: z.array(z.string()).default([]),
    doExamples: z.array(z.string()).default([]),
    dontExamples: z.array(z.string()).default([]),
});
export type BrandVoice = z.infer<typeof brandVoice>;

export const objection = z.object({
    objection: z.string(),
    response: z.string(),
});
export type Objection = z.infer<typeof objection>;

export const brandStrategy = z.object({
    positioningStatement: z.string(),
    targetConsumer: targetConsumer,
    voice: brandVoice,
    objections: z.array(objection).default([]),
});
export type BrandStrategy = z.infer<typeof brandStrategy>;
