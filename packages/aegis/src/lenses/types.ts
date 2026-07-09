import type { BrandKitDraft } from '@onlook/brand-schema';
import { z } from 'zod';

export const LENS_NAMES = ['novelty', 'brand-fit', 'accessibility', 'feasibility'] as const;
export const lensName = z.enum(LENS_NAMES);
export type LensName = z.infer<typeof lensName>;

export const lensFinding = z.object({
    location: z.string().describe('A file path, oid, or general area the finding applies to.'),
    issue: z.string(),
});
export type LensFinding = z.infer<typeof lensFinding>;

export const lensVerdictShape = z.object({
    verdict: z.enum(['pass', 'fail']),
    score: z.number().min(0).max(1),
    findings: z.array(lensFinding),
    suggestedDirection: z.string().optional(),
});

export interface LensVerdict {
    lens: LensName;
    verdict: 'pass' | 'fail';
    score: number;
    findings: LensFinding[];
    suggestedDirection?: string;
    /** True if this verdict came from a deterministic check rather than an LLM judgment. */
    deterministic: boolean;
}

/**
 * A build/typecheck result gathered from the REAL sandbox (e.g. via the
 * existing TypecheckTool/CheckErrorsTool client tools Forge already has
 * access to) - when present, the feasibility lens is a deterministic pass/
 * fail instead of an LLM guessing whether code compiles.
 */
export interface BuildCheckResult {
    success: boolean;
    errors: string[];
}

/**
 * An axe-core (or equivalent) accessibility scan result from a real rendered
 * page - when present, the accessibility lens is deterministic instead of an
 * LLM judgment from a screenshot/code diff alone.
 */
export interface AccessibilityScanResult {
    violations: { rule: string; impact: 'minor' | 'moderate' | 'serious' | 'critical'; description: string }[];
}

export interface CritiqueInput {
    summary: string;
    filesChanged: string[];
    codeDiff: string;
    brandKit: BrandKitDraft | undefined;
    screenshotDescription?: string;
    buildCheckResult?: BuildCheckResult;
    accessibilityScanResult?: AccessibilityScanResult;
}
